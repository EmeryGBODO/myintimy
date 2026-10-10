"""Ajoute le catalogue, les variantes, les images et le stock.

Revision ID: 20261008_0002
Revises: 20261007_0001
Create Date: 2026-10-08
"""

from alembic import op
import sqlalchemy as sa

revision = "20261008_0002"
down_revision = "20261007_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("subtitle", sa.Text(), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_categories_slug", "categories", ["slug"], unique=True)
    op.create_index("ix_categories_is_active", "categories", ["is_active"], unique=False)

    op.create_table(
        "colors",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("slug", sa.String(length=60), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("hex_value", sa.String(length=7), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_colors_slug", "colors", ["slug"], unique=True)

    op.create_table(
        "sizes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.String(length=30), nullable=False),
        sa.Column("label", sa.String(length=60), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sizes_code", "sizes", ["code"], unique=True)

    op.create_table(
        "products",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("legacy_id", sa.Integer(), nullable=True),
        sa.Column("slug", sa.String(length=180), nullable=False),
        sa.Column("category_id", sa.Uuid(), nullable=False),
        sa.Column("type", sa.String(length=60), nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("price_xof", sa.Integer(), nullable=False),
        sa.Column("tag", sa.String(length=80), nullable=True),
        sa.Column("is_new", sa.Boolean(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("material", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("price_xof >= 0", name="ck_products_price_non_negative"),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_products_legacy_id", "products", ["legacy_id"], unique=True)
    op.create_index("ix_products_slug", "products", ["slug"], unique=True)
    op.create_index("ix_products_is_new", "products", ["is_new"], unique=False)
    op.create_index("ix_products_is_active", "products", ["is_active"], unique=False)
    op.create_index("ix_products_category_active", "products", ["category_id", "is_active"], unique=False)

    op.create_table(
        "product_variants",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("color_id", sa.Uuid(), nullable=False),
        sa.Column("size_id", sa.Uuid(), nullable=True),
        sa.Column("sku", sa.String(length=100), nullable=False),
        sa.Column("price_xof", sa.Integer(), nullable=True),
        sa.Column("stock_quantity", sa.Integer(), nullable=False),
        sa.Column("reserved_quantity", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("stock_quantity >= 0", name="ck_variants_stock_non_negative"),
        sa.CheckConstraint("reserved_quantity >= 0", name="ck_variants_reserved_non_negative"),
        sa.CheckConstraint("reserved_quantity <= stock_quantity", name="ck_variants_reserved_lte_stock"),
        sa.CheckConstraint("price_xof IS NULL OR price_xof >= 0", name="ck_variants_price_non_negative"),
        sa.ForeignKeyConstraint(["color_id"], ["colors.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["size_id"], ["sizes.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("product_id", "color_id", "size_id", name="uq_product_variant_dimensions"),
    )
    op.create_index("ix_product_variants_sku", "product_variants", ["sku"], unique=True)
    op.create_index("ix_product_variants_is_active", "product_variants", ["is_active"], unique=False)
    op.create_index("ix_variants_product_active", "product_variants", ["product_id", "is_active"], unique=False)

    op.create_table(
        "product_images",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("color_id", sa.Uuid(), nullable=True),
        sa.Column("url", sa.String(length=1000), nullable=False),
        sa.Column("alt_text", sa.String(length=240), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["color_id"], ["colors.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("product_id", "position", name="uq_product_image_position"),
    )

    op.create_table(
        "inventory_movements",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("variant_id", sa.Uuid(), nullable=False),
        sa.Column("movement_type", sa.String(length=40), nullable=False),
        sa.Column("quantity_delta", sa.Integer(), nullable=False),
        sa.Column("quantity_after", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(length=240), nullable=True),
        sa.Column("reference", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("quantity_delta <> 0", name="ck_inventory_delta_non_zero"),
        sa.CheckConstraint("quantity_after >= 0", name="ck_inventory_after_non_negative"),
        sa.ForeignKeyConstraint(["variant_id"], ["product_variants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inventory_movements_reference", "inventory_movements", ["reference"], unique=False)
    op.create_index("ix_inventory_variant_created", "inventory_movements", ["variant_id", "created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_inventory_variant_created", table_name="inventory_movements")
    op.drop_index("ix_inventory_movements_reference", table_name="inventory_movements")
    op.drop_table("inventory_movements")
    op.drop_table("product_images")
    op.drop_index("ix_variants_product_active", table_name="product_variants")
    op.drop_index("ix_product_variants_is_active", table_name="product_variants")
    op.drop_index("ix_product_variants_sku", table_name="product_variants")
    op.drop_table("product_variants")
    op.drop_index("ix_products_category_active", table_name="products")
    op.drop_index("ix_products_is_active", table_name="products")
    op.drop_index("ix_products_is_new", table_name="products")
    op.drop_index("ix_products_slug", table_name="products")
    op.drop_index("ix_products_legacy_id", table_name="products")
    op.drop_table("products")
    op.drop_index("ix_sizes_code", table_name="sizes")
    op.drop_table("sizes")
    op.drop_index("ix_colors_slug", table_name="colors")
    op.drop_table("colors")
    op.drop_index("ix_categories_is_active", table_name="categories")
    op.drop_index("ix_categories_slug", table_name="categories")
    op.drop_table("categories")
