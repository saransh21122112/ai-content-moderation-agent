from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import analytics, appeals, health, history, jobs, moderation, review, upload
from app.db.connection import engine
from app.models.database import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="AI Content Moderation Agent",
    version="0.3.0",
    description="Multi-agent content moderation API — Phase 3 with human review queue, appeals, and analytics",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(moderation.router, prefix="/api/v1", tags=["moderation"])
app.include_router(jobs.router, prefix="/api/v1", tags=["jobs"])
app.include_router(review.router, prefix="/api/v1", tags=["review"])
app.include_router(appeals.router, prefix="/api/v1", tags=["appeals"])
app.include_router(analytics.router, prefix="/api/v1", tags=["analytics"])
app.include_router(history.router, prefix="/api/v1", tags=["history"])
app.include_router(upload.router, prefix="/api/v1", tags=["upload"])
