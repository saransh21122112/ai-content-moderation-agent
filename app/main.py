import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from app.api.routes import analytics, appeals, auth, health, history, jobs, moderation, review, upload
from app.db.connection import engine, AsyncSessionLocal
from app.models.database import Base, Tenant, User

STATIC_DIR = Path(__file__).parent.parent / "static"


async def _seed_database():
    from passlib.context import CryptContext
    pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

    async with AsyncSessionLocal() as session:
        api_key = os.getenv("DEFAULT_API_KEY", "test-api-key-12345")
        tenant_row = await session.execute(select(Tenant).where(Tenant.api_key == api_key))
        if tenant_row.scalar_one_or_none() is None:
            session.add(Tenant(name="Sentinel Dashboard", api_key=api_key))
            logging.info("Default tenant seeded")

        admin_email = os.getenv("ADMIN_EMAIL", "admin@sentinel.ai")
        admin_password = os.getenv("ADMIN_PASSWORD", "Admin@Sentinel123")
        admin_username = os.getenv("ADMIN_USERNAME", "admin")
        user_row = await session.execute(select(User).where(User.email == admin_email))
        if user_row.scalar_one_or_none() is None:
            session.add(User(
                email=admin_email,
                username=admin_username,
                password_hash=pwd.hash(admin_password),
                role="admin",
            ))
            logging.info(f"Admin user seeded: {admin_email}")

        await session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        await _seed_database()
    except Exception as e:
        logging.warning(f"Database unavailable on startup: {e}")
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

@app.get("/", include_in_schema=False)
async def landing():
    return FileResponse(STATIC_DIR / "index.html")

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

app.include_router(health.router, tags=["health"])
app.include_router(auth.router)
app.include_router(moderation.router, prefix="/api/v1", tags=["moderation"])
app.include_router(jobs.router, prefix="/api/v1", tags=["jobs"])
app.include_router(review.router, prefix="/api/v1", tags=["review"])
app.include_router(appeals.router, prefix="/api/v1", tags=["appeals"])
app.include_router(analytics.router, prefix="/api/v1", tags=["analytics"])
app.include_router(history.router, prefix="/api/v1", tags=["history"])
app.include_router(upload.router, prefix="/api/v1", tags=["upload"])
