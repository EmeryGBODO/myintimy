from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers.get("X-Request-ID")


def test_versioned_health() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_database_health() -> None:
    response = client.get("/api/v1/health/database")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "available"}


def test_not_found_uses_standard_error_shape() -> None:
    response = client.get("/does-not-exist")
    assert response.status_code == 404
    assert response.json() == {
        "error": {
            "code": "NOT_FOUND",
            "message": "La ressource demandée n'existe pas.",
            "details": None,
        }
    }


def test_cors_allows_configured_frontend() -> None:
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
