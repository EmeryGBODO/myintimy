from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AdminLoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=512)


class AdminUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: str
    is_active: bool
    is_superuser: bool
    last_login_at: datetime | None


class AdminTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: AdminUserOut


class AdminCategoryCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    slug: str | None = Field(default=None, max_length=80)
    subtitle: str = ""
    display_order: int = 0
    is_active: bool = True


class AdminCategoryUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    slug: str | None = Field(default=None, min_length=1, max_length=80)
    subtitle: str | None = None
    display_order: int | None = None
    is_active: bool | None = None


class AdminCategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    title: str
    subtitle: str
    display_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AdminColorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    slug: str | None = Field(default=None, max_length=60)
    hex_value: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    display_order: int = 0
    is_active: bool = True


class AdminColorUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    slug: str | None = Field(default=None, min_length=1, max_length=60)
    hex_value: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    display_order: int | None = None
    is_active: bool | None = None


class AdminColorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    name: str
    hex_value: str
    display_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AdminSizeCreate(BaseModel):
    code: str = Field(min_length=1, max_length=30)
    label: str = Field(min_length=1, max_length=60)
    display_order: int = 0
    is_active: bool = True


class AdminSizeUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=30)
    label: str | None = Field(default=None, min_length=1, max_length=60)
    display_order: int | None = None
    is_active: bool | None = None


class AdminSizeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    label: str
    display_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AdminProductCreate(BaseModel):
    category_id: UUID
    name: str = Field(min_length=1, max_length=180)
    slug: str | None = Field(default=None, max_length=180)
    type: str = Field(min_length=1, max_length=60)
    price_xof: int = Field(ge=0)
    tag: str | None = Field(default=None, max_length=80)
    is_new: bool = False
    description: str = ""
    material: str = ""
    is_active: bool = True


class AdminProductUpdate(BaseModel):
    category_id: UUID | None = None
    name: str | None = Field(default=None, min_length=1, max_length=180)
    slug: str | None = Field(default=None, min_length=1, max_length=180)
    type: str | None = Field(default=None, min_length=1, max_length=60)
    price_xof: int | None = Field(default=None, ge=0)
    tag: str | None = Field(default=None, max_length=80)
    is_new: bool | None = None
    description: str | None = None
    material: str | None = None
    is_active: bool | None = None


class AdminVariantCreate(BaseModel):
    color_id: UUID
    size_id: UUID | None = None
    sku: str = Field(min_length=1, max_length=100)
    price_xof: int | None = Field(default=None, ge=0)
    is_active: bool = True
    initial_stock: int = Field(default=0, ge=0)


class AdminVariantUpdate(BaseModel):
    color_id: UUID | None = None
    size_id: UUID | None = None
    sku: str | None = Field(default=None, min_length=1, max_length=100)
    price_xof: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class AdminImageUpdate(BaseModel):
    alt_text: str | None = Field(default=None, max_length=240)
    position: int | None = Field(default=None, ge=0)
    is_primary: bool | None = None
    color_id: UUID | None = None


class AdminImageOrderUpdate(BaseModel):
    image_ids: list[UUID] = Field(min_length=1)


class AdminStockAdjustIn(BaseModel):
    delta: int
    reason: str | None = Field(default=None, max_length=240)
    reference: str | None = Field(default=None, max_length=120)


class AdminStockMovementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    movement_type: str
    quantity_delta: int
    quantity_after: int
    reason: str | None
    reference: str | None
    created_at: datetime


class AdminDashboardOut(BaseModel):
    products_total: int
    products_active: int
    categories_total: int
    variants_total: int
    low_stock_variants: int
    out_of_stock_variants: int
    stock_units_total: int
