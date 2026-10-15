from __future__ import annotations

from app.db.session import SessionLocal
from app.services.payments import PaymentService


def main() -> None:
    with SessionLocal() as db:
        count = PaymentService(db).expire_due_payments()
    print(f"expired_payments={count}")


if __name__ == "__main__":
    main()
