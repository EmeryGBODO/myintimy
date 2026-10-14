from fastapi import APIRouter

from app.api.v1.endpoints.admin_auth import router as admin_auth_router
from app.api.v1.endpoints.admin_catalog import router as admin_catalog_router
from app.api.v1.endpoints.admin_orders import router as admin_orders_router
from app.api.v1.endpoints.catalog import router as catalog_router
from app.api.v1.endpoints.client import router as client_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.orders import router as orders_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(catalog_router)
api_router.include_router(client_router)
api_router.include_router(orders_router)
api_router.include_router(admin_auth_router)
api_router.include_router(admin_catalog_router)
api_router.include_router(admin_orders_router)
