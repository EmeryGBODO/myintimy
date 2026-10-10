from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.repositories.catalog import CatalogRepository
from app.schemas.catalog import CategoryOut, ColorOut, ProductListOut, ProductOut, SizeOut
from app.services.catalog import CatalogService

router = APIRouter(tags=["catalog"])


def service(db: Session) -> CatalogService:
    return CatalogService(CatalogRepository(db))


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return service(db).categories()


@router.get("/categories/{slug}", response_model=CategoryOut)
def get_category(slug: str, db: Session = Depends(get_db)):
    return service(db).category(slug)


@router.get("/colors", response_model=list[ColorOut])
def list_colors(db: Session = Depends(get_db)):
    return service(db).colors()


@router.get("/sizes", response_model=list[SizeOut])
def list_sizes(db: Session = Depends(get_db)):
    return service(db).sizes()


@router.get("/products", response_model=ProductListOut)
def list_products(
    category: str | None = Query(default=None),
    is_new: bool | None = Query(default=None),
    color: str | None = Query(default=None),
    size: str | None = Query(default=None),
    min_price: int | None = Query(default=None, ge=0),
    max_price: int | None = Query(default=None, ge=0),
    q: str | None = Query(default=None, min_length=1, max_length=120),
    sort: Literal["selection", "price_asc", "price_desc", "newest"] = "selection",
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    return service(db).products(
        category=category,
        is_new=is_new,
        color=color,
        size=size,
        min_price=min_price,
        max_price=max_price,
        query=q,
        sort=sort,
        limit=limit,
        offset=offset,
    )


@router.get("/products/{identifier}", response_model=ProductOut)
def get_product(identifier: str, db: Session = Depends(get_db)):
    return service(db).product(identifier)


@router.get("/products/{identifier}/related", response_model=list[ProductOut])
def get_related_products(identifier: str, limit: int = Query(default=4, ge=1, le=12), db: Session = Depends(get_db)):
    return service(db).related(identifier, limit=limit)
