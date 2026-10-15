from __future__ import annotations

from app.core.config import get_settings
from app.core.exceptions import ApiException
from app.db.session import SessionLocal
from app.repositories.payments import PaymentRepository
from app.services.kkiapay import KkiapayGateway
from app.services.payments import PaymentProvider, PaymentService


def main() -> None:
    settings = get_settings()
    gateway = KkiapayGateway()
    if not gateway.is_configured():
        raise SystemExit("Kkiapay is not configured")

    reconciled = 0
    failed = 0
    with SessionLocal() as db:
        service = PaymentService(db)
        service.expire_due_payments(limit=settings.payment_reconcile_batch_size)
        ids = PaymentRepository(db).list_reconcilable(
            provider=PaymentProvider.KKIAPAY,
            limit=settings.payment_reconcile_batch_size,
        )

        for payment_id in ids:
            payment = service.get_payment(payment_id)
            if not payment.provider_transaction_id:
                continue
            try:
                verification = gateway.verify_transaction(payment.provider_transaction_id)
                locked = service.get_payment_for_update(payment_id)
                service.apply_provider_verification(
                    locked,
                    transaction_id=verification.transaction_id,
                    status=verification.status,
                    amount_xof=verification.amount_xof,
                    source=verification.source,
                    partner_id=verification.partner_id,
                    failure_code=verification.failure_code,
                    failure_message=verification.failure_message,
                )
                db.commit()
                reconciled += 1
            except ApiException as exc:
                if exc.code == "PAYMENT_NOT_FINAL":
                    db.commit()
                else:
                    db.rollback()
                    failed += 1

    print(f"reconciled={reconciled} failed={failed}")


if __name__ == "__main__":
    main()
