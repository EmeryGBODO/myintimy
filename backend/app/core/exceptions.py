from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class ApiException(Exception):
    def __init__(self, *, status_code: int, code: str, message: str, details: Any = None) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details
        super().__init__(message)


def error_payload(code: str, message: str, details: Any = None) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, "details": details}}


def translate_pydantic_error(err: dict[str, Any]) -> dict[str, Any]:
    err_type = str(err.get("type", ""))
    msg = str(err.get("msg", ""))
    ctx = err.get("ctx") or {}
    loc = err.get("loc") or []

    # Nettoyage si Pydantic a préfixé "Value error, "
    if msg.startswith("Value error, "):
        french_msg = msg.replace("Value error, ", "").strip()
    elif err_type == "missing":
        french_msg = "Ce champ est obligatoire."
    elif err_type == "string_too_short":
        limit = ctx.get("min_length", 1)
        if "phone" in str(loc).lower():
            french_msg = f"Le numéro de téléphone doit comporter au moins {limit} caractères."
        elif "password" in str(loc).lower():
            french_msg = f"Le mot de passe doit comporter au moins {limit} caractères."
        else:
            french_msg = f"Ce champ doit comporter au moins {limit} caractères."
    elif err_type == "string_too_long":
        limit = ctx.get("max_length")
        if "phone" in str(loc).lower():
            french_msg = f"Le numéro de téléphone ne peut pas dépasser {limit} caractères."
        elif "password" in str(loc).lower():
            french_msg = f"Le mot de passe ne peut pas dépasser {limit} caractères."
        else:
            french_msg = f"Ce champ ne peut pas dépasser {limit} caractères."
    elif err_type in {"greater_than_equal", "greater_than"}:
        ge = ctx.get("ge", 0)
        french_msg = f"La valeur doit être supérieure ou égale à {ge}."
    elif err_type in {"less_than_equal", "less_than"}:
        le = ctx.get("le")
        french_msg = f"La valeur doit être inférieure ou égale à {le}."
    elif "value is not a valid email address" in msg.lower() or "value_error" in err_type and "email" in str(loc).lower():
        french_msg = "Format d'adresse e-mail invalide."
    elif "phone" in str(loc).lower():
        french_msg = "Format de numéro de téléphone invalide."
    elif err_type == "string_pattern_mismatch":
        pattern = str(ctx.get("pattern", ""))
        if "#" in pattern:
            french_msg = "Le code couleur doit être au format hexadécimal (#RRGGBB)."
        else:
            french_msg = "Le format renseigné est invalide."
    elif err_type in {"int_parsing", "int_type"}:
        french_msg = "Veuillez renseigner un nombre entier valide."
    else:
        french_msg = msg

    cleaned = {
        "type": err_type,
        "loc": list(loc),
        "msg": french_msg,
    }
    if "input" in err:
        inp = err["input"]
        if isinstance(inp, (str, int, float, bool, list, dict, type(None))):
            cleaned["input"] = inp
        else:
            cleaned["input"] = str(inp)

    return cleaned


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiException)
    async def api_exception_handler(_: Request, exc: ApiException) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=error_payload(exc.code, exc.message, exc.details))

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        raw_errors = exc.errors()
        translated_errors = [translate_pydantic_error(e) for e in raw_errors]
        return JSONResponse(
            status_code=422,
            content=error_payload("VALIDATION_ERROR", "Les données envoyées sont invalides.", translated_errors),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = "NOT_FOUND" if exc.status_code == 404 else f"HTTP_{exc.status_code}"
        message = "La ressource demandée n'existe pas." if exc.status_code == 404 else str(exc.detail)
        return JSONResponse(status_code=exc.status_code, content=error_payload(code, message))
