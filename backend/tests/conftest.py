import os

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["FRONTEND_ORIGINS"] = "http://localhost:5173"
os.environ["APP_ENV"] = "test"

import pytest
from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.main import app
from app.core.rate_limit import rate_limiter
from app.seeds.catalog import seed_catalog


@pytest.fixture(autouse=True)
def database():
    rate_limiter.reset()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def seeded_db():
    with SessionLocal() as db:
        seed_catalog(db)
    return True


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
