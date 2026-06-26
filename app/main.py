from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.api.routes import analytics, appeals, health, history, jobs, moderation, review, upload
from app.db.connection import engine
from app.models.database import Base

STATIC_DIR = Path(__file__).parent.parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        import logging
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

# Mount static assets (CSS, images etc. if added later)
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
