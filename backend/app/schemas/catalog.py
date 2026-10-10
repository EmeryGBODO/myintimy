from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    title: str
    subtitle: str
    display_order: int


class ColorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    name: str
    hex_value: str


class SizeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    label: str
    display_order: int


class ProductImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    url: str
    alt_text: str
    position: int
    is_primary: bool
    color_slug: str | None = None


class ProductVariantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sku: str
    color: ColorOut
    size: SizeOut | None
    price_xof: int | None
    stock_quantity: int
    reserved_quantity: int
    available_quantity: int
    in_stock: bool


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    legacy_id: int | None
    public_id: str
    slug: str
    category: CategoryOut
    type: str
    name: str
    price_xof: int
    tag: str | None
    is_new: bool
    description: str
    material: str
    colors: list[ColorOut]
    sizes: list[SizeOut]
    variants: list[ProductVariantOut]
    images: list[ProductImageOut]
    in_stock: bool


class ProductListOut(BaseModel):
    items: list[ProductOut]
    total: int = Field(ge=0)
    limit: int = Field(ge=1)
    offset: int = Field(ge=0)
