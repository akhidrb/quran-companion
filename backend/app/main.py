from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes.ask import router as ask_router

app = FastAPI(title="Quran Companion API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

app.include_router(ask_router, prefix="/api")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
