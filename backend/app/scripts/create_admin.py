from __future__ import annotations

import argparse

from sqlalchemy import func, select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.admin import AdminUser


def main() -> None:
    parser = argparse.ArgumentParser(description="Créer ou mettre à jour un administrateur Myintimy.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--name", default="Administrateur Myintimy")
    args = parser.parse_args()

    email = args.email.strip().lower()
    with SessionLocal() as db:
        admin = db.scalar(select(AdminUser).where(func.lower(AdminUser.email) == email))
        if admin:
            admin.full_name = args.name.strip()
            admin.password_hash = hash_password(args.password)
            admin.is_active = True
            print(f"Administrateur mis à jour : {email}")
        else:
            admin = AdminUser(email=email, full_name=args.name.strip(), password_hash=hash_password(args.password), is_active=True, is_superuser=True)
            db.add(admin)
            print(f"Administrateur créé : {email}")
        db.commit()


if __name__ == "__main__":
    main()
