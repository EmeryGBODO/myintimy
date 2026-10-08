from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.exceptions import ApiException

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
def api_health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/database")
def database_health(db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise ApiException(
            status_code=503,
            code="DATABASE_UNAVAILABLE",
            message="La base de données est indisponible.",
        ) from exc
    return {"status": "ok", "database": "available"}
