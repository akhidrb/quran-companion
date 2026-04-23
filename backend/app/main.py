import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .routes.ask import router as ask_router
from .routes.quran import router as quran_router
from .routes.guidance import router as guidance_router
from .routes.daily import router as daily_router
from .routes.auth import router as auth_router
from .routes.history import router as history_router

logger = logging.getLogger(__name__)

app = FastAPI(title="Quran Companion API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(ask_router, prefix="/api")
app.include_router(quran_router, prefix="/api/quran")
app.include_router(guidance_router, prefix="/api")
app.include_router(daily_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(history_router, prefix="/api")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again."},
    )


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
