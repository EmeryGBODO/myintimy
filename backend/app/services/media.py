from __future__ import annotations

import uuid
from pathlib import Path
from uuid import UUID

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import ApiException
from app.models.catalog import Color, Product, ProductImage

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

    async def upload(self, product_id: UUID, file: UploadFile, *, alt_text: str = "", color_id: UUID | None = None) -> ProductImage:
        product = self.db.get(Product, product_id)
        if not product:
            raise ApiException(status_code=404, code="PRODUCT_NOT_FOUND", message="Le produit demandé n'existe pas.")
        if color_id and not self.db.get(Color, color_id):
            raise ApiException(status_code=422, code="INVALID_COLOR", message="La couleur sélectionnée n'existe pas.")
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

        max_position = self.db.scalar(select(ProductImage.position).where(ProductImage.product_id == product_id).order_by(ProductImage.position.desc()).limit(1))
        image = ProductImage(
            product_id=product_id,
            color_id=color_id,
            url=f"/media/products/{product_id}/{filename}",
            alt_text=alt_text.strip() or product.name,
            position=(max_position + 1) if max_position is not None else 0,
            is_primary=max_position is None,
        )
        self.db.add(image)
        self.db.commit()
        self.db.refresh(image)
        return image

    def update(self, image_id: UUID, *, alt_text=None, position=None, is_primary=None, color_id=None, fields_set: set[str]) -> ProductImage:
        image = self.db.get(ProductImage, image_id)
        if not image:
            raise ApiException(status_code=404, code="IMAGE_NOT_FOUND", message="L'image demandée n'existe pas.")
        if "color_id" in fields_set and color_id and not self.db.get(Color, color_id):
            raise ApiException(status_code=422, code="INVALID_COLOR", message="La couleur sélectionnée n'existe pas.")
        if "alt_text" in fields_set:
            image.alt_text = alt_text or ""
        if "position" in fields_set:
            image.position = position
        if "color_id" in fields_set:
            image.color_id = color_id
        if "is_primary" in fields_set:
            image.is_primary = bool(is_primary)
            if image.is_primary:
                for other in self.db.scalars(select(ProductImage).where(ProductImage.product_id == image.product_id, ProductImage.id != image.id)):
                    other.is_primary = False
        self.db.commit()
        self.db.refresh(image)
        return image

    def delete(self, image_id: UUID) -> None:
        image = self.db.get(ProductImage, image_id)
        if not image:
            raise ApiException(status_code=404, code="IMAGE_NOT_FOUND", message="L'image demandée n'existe pas.")
        path = self.media_root / image.url.removeprefix("/media/")
        product_id = image.product_id
        was_primary = image.is_primary
        self.db.delete(image)
        self.db.commit()
        try:
            path.unlink(missing_ok=True)
        except OSError:
            pass
        if was_primary:
            next_image = self.db.scalar(select(ProductImage).where(ProductImage.product_id == product_id).order_by(ProductImage.position).limit(1))
            if next_image:
                next_image.is_primary = True
                self.db.commit()
