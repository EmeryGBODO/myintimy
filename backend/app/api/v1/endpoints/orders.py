from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_optional_customer
from app.models.client import CustomerUser
from app.schemas.orders import OrderCreateIn, OrderOut
from app.services.orders import OrderService

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderOut, status_code=201)
def create_order(payload: OrderCreateIn, db: Session = Depends(get_db), customer: CustomerUser | None = Depends(get_optional_customer)):
    return OrderService(db).create(payload, customer=customer)
