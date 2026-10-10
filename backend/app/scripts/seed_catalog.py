from app.db.session import SessionLocal
from app.seeds.catalog import seed_catalog


def main() -> None:
    with SessionLocal() as db:
        counts = seed_catalog(db)
    print("Catalogue Myintimy synchronisé:", ", ".join(f"{key}={value}" for key, value in counts.items()))


if __name__ == "__main__":
    main()
