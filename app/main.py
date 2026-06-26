import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from app.api.routes import analytics, appeals, health, history, jobs, moderation, review, upload
from app.db.connection import engine, AsyncSessionLocal
from app.models.database import Base, Tenant

STATIC_DIR = Path(__file__).parent.parent / "static"


async def _seed_default_tenant():
    api_key = os.getenv("DEFAULT_API_KEY", "test-api-key-12345")
    async with AsyncSessionLocal() as session:
        existing = await session.execute(select(Tenant).where(Tenant.api_key == api_key))
        if existing.scalar_one_or_none() is None:
            session.add(Tenant(name="Sentinel Dashboard", api_key=api_key))
            await session.commit()
            logging.info(f"Default tenant seeded with API key: {api_key}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await _seed_default_tenant()
    except Exception as e:
        logging.warning(f"Database unavailable on startup — API routes requiring DB will fail: {e}")
    yield
    await engine.dispose()


app = FastAPI(
    title="Sentinel — AI Content Moderation",
    version="0.3.0",
    description="Multi-agent content moderation API with human review queue, appeals, and analytics",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve landing page at root
@app.get("/", include_in_schema=False)
async def landing():
    return FileResponse(STATIC_DIR / "index.html")

# Mount static assets
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

app.include_router(health.router, tags=["health"])
app.include_router(moderation.router, prefix="/api/v1", tags=["moderation"])
app.include_router(jobs.router, prefix="/api/v1", tags=["jobs"])
app.include_router(review.router, prefix="/api/v1", tags=["review"])
app.include_router(appeals.router, prefix="/api/v1", tags=["appeals"])
app.include_router(analytics.router, prefix="/api/v1", tags=["analytics"])
app.include_router(history.router, prefix="/api/v1", tags=["history"])
app.include_router(upload.router, prefix="/api/v1", tags=["upload"])
