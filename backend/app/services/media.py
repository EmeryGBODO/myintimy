from __future__ import annotations

import uuid
from pathlib import Path
from uuid import UUID

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import ApiException
from app.models.catalog import Color, Product, ProductImage, ProductVariant

_ALLOWED = {
    "jpeg": (".jpg", "image/jpeg"),
    "png": (".png", "image/png"),
    "webp": (".webp", "image/webp"),
}


def _detect_image_kind(content: bytes) -> str | None:
    if content.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "webp"
    return None


class ProductImageService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.settings = get_settings()
        self.media_root = Path(self.settings.media_root)

    def _product(self, product_id: UUID) -> Product:
        product = self.db.get(Product, product_id)
        if not product:
            raise ApiException(status_code=404, code="PRODUCT_NOT_FOUND", message="Le produit demandé n'existe pas.")
        return product

    def _image(self, image_id: UUID) -> ProductImage:
        image = self.db.get(ProductImage, image_id)
        if not image:
            raise ApiException(status_code=404, code="IMAGE_NOT_FOUND", message="L'image demandée n'existe pas.")
        return image

    def _images(self, product_id: UUID) -> list[ProductImage]:
        stmt = (
            select(ProductImage)
            .where(ProductImage.product_id == product_id)
            .order_by(ProductImage.position, ProductImage.created_at, ProductImage.id)
        )
        return list(self.db.scalars(stmt).all())

    def _validate_color(self, product_id: UUID, color_id: UUID | None) -> None:
        if color_id is None:
            return
        if not self.db.get(Color, color_id):
            raise ApiException(status_code=422, code="INVALID_COLOR", message="La couleur sélectionnée n'existe pas.")
        used = self.db.scalar(
            select(ProductVariant.id)
            .where(ProductVariant.product_id == product_id, ProductVariant.color_id == color_id)
            .limit(1)
        )
        if not used:
            raise ApiException(
                status_code=422,
                code="IMAGE_COLOR_NOT_USED",
                message="Cette couleur n'est pas utilisée par une variante de ce produit.",
            )

    def _set_positions(self, images: list[ProductImage]) -> None:
        if not images:
            return
        temporary_start = max((image.position for image in images), default=0) + len(images) + 100
        for index, image in enumerate(images):
            image.position = temporary_start + index
        self.db.flush()
        for index, image in enumerate(images):
            image.position = index
        self.db.flush()

    def _ensure_primary(self, images: list[ProductImage]) -> None:
        if not images:
            return
        first_id = images[0].id
        for image in images:
            image.is_primary = image.id == first_id

    async def upload(
        self,
        product_id: UUID,
        file: UploadFile,
        *,
        alt_text: str = "",
        color_id: UUID | None = None,
    ) -> ProductImage:
        product = self._product(product_id)
        self._validate_color(product_id, color_id)

        content = await file.read(self.settings.max_product_image_bytes + 1)
        if len(content) > self.settings.max_product_image_bytes:
            raise ApiException(status_code=413, code="IMAGE_TOO_LARGE", message="L'image dépasse la taille maximale autorisée.")

        kind = _detect_image_kind(content)
        if kind not in _ALLOWED:
            raise ApiException(status_code=415, code="INVALID_IMAGE", message="Seules les images JPEG, PNG et WebP sont acceptées.")

        extension, expected_mime = _ALLOWED[kind]
        if file.content_type and file.content_type not in {expected_mime, "application/octet-stream"}:
            raise ApiException(status_code=415, code="INVALID_IMAGE_MIME", message="Le type MIME du fichier ne correspond pas à son contenu.")

        folder = self.media_root / "products" / str(product_id)
        folder.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid.uuid4().hex}{extension}"
        target = folder / filename
        target.write_bytes(content)

        images = self._images(product_id)
        image = ProductImage(
            product_id=product_id,
            color_id=color_id,
            url=f"/media/products/{product_id}/{filename}",
            alt_text=alt_text.strip() or product.name,
            position=len(images),
            is_primary=not images,
        )
        self.db.add(image)
        self.db.commit()
        self.db.refresh(image)
        return image

    def update(
        self,
        image_id: UUID,
        *,
        alt_text=None,
        position=None,
        is_primary=None,
        color_id=None,
        fields_set: set[str],
    ) -> ProductImage:
        image = self._image(image_id)
        product = self._product(image.product_id)

        if "color_id" in fields_set:
            self._validate_color(image.product_id, color_id)
            image.color_id = color_id

        if "alt_text" in fields_set:
            image.alt_text = (alt_text or "").strip() or product.name

        if "is_primary" in fields_set and is_primary:
            images = self._images(image.product_id)
            ordered = [image, *[item for item in images if item.id != image.id]]
            self._set_positions(ordered)

        if "position" in fields_set and position is not None:
            images = self._images(image.product_id)
            ordered = [item for item in images if item.id != image.id]
            target = min(max(int(position), 0), len(ordered))
            ordered.insert(target, image)
            self._set_positions(ordered)

        images = self._images(image.product_id)
        self._ensure_primary(images)
        self.db.commit()
        self.db.refresh(image)
        return image

    def reorder(self, product_id: UUID, image_ids: list[UUID]) -> list[ProductImage]:
        self._product(product_id)
        images = self._images(product_id)
        current_ids = [image.id for image in images]

        if len(image_ids) != len(set(image_ids)):
            raise ApiException(status_code=422, code="DUPLICATE_IMAGE_ID", message="Une image apparaît plusieurs fois dans l'ordre demandé.")
        if set(image_ids) != set(current_ids):
            raise ApiException(
                status_code=422,
                code="INVALID_IMAGE_ORDER",
                message="L'ordre doit contenir exactement toutes les images du produit.",
            )

        by_id = {image.id: image for image in images}
        ordered = [by_id[image_id] for image_id in image_ids]
        self._set_positions(ordered)
        self._ensure_primary(ordered)
        self.db.commit()
        return ordered

    def delete(self, image_id: UUID) -> None:
        image = self._image(image_id)
        path = self.media_root / image.url.removeprefix("/media/")
        product_id = image.product_id

        self.db.delete(image)
        self.db.commit()

        try:
            path.unlink(missing_ok=True)
        except OSError:
            pass

        remaining = self._images(product_id)
        if remaining:
            self._set_positions(remaining)
            self._ensure_primary(remaining)
            self.db.commit()
