from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db
from app.schemas.orders import AdminOrderStatusUpdateIn, OrderOut
from app.services.orders import OrderService

router = APIRouter(prefix="/admin/orders", tags=["admin-orders"], dependencies=[Depends(get_current_admin)])


@router.get("")
def list_orders(
    q: str | None = Query(default=None, max_length=120),
    status: str | None = Query(default=None, max_length=32),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    items = OrderService(db).list_admin(q=q, status=status, limit=limit, offset=offset)
    return {"items": [OrderOut.model_validate(item) for item in items], "total": len(items), "limit": limit, "offset": offset}


@router.get("/{order_id}", response_model=OrderOut)
def order_detail(order_id: UUID, db: Session = Depends(get_db)):
    return OrderService(db).get(order_id)


@router.patch("/{order_id}/status", response_model=OrderOut)
def update_order_status(order_id: UUID, payload: AdminOrderStatusUpdateIn, db: Session = Depends(get_db)):
    return OrderService(db).transition(order_id, status=payload.status, note=payload.note)
