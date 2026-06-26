import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.connection import get_session
from app.models.database import User

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
_bearer = HTTPBearer(auto_error=False)

JWT_SECRET = os.getenv("JWT_SECRET", "sentinel-jwt-dev-secret-change-in-prod")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7


def _hash(password: str) -> str:
    return _pwd.hash(password)


def _verify(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)


def _make_token(data: dict, expires_delta: timedelta) -> str:
    payload = {**data, "exp": datetime.utcnow() + expires_delta}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def make_access_token(user: User) -> str:
    return _make_token(
        {"sub": str(user.id), "email": user.email, "role": user.role, "type": "access"},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def make_refresh_token(user: User) -> str:
    return _make_token(
        {"sub": str(user.id), "type": "refresh"},
        timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ── Schemas ──────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: str
    username: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Dependency ────────────────────────────────────────────────────────────────

async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    session: AsyncSession = Depends(get_session),
) -> User:
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(creds.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    result = await session.execute(select(User).where(User.id == uuid.UUID(payload["sub"])))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/signup", response_model=TokenResponse, status_code=201)
async def signup(body: SignupRequest, session: AsyncSession = Depends(get_session)):
    existing = await session.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    existing_u = await session.execute(select(User).where(User.username == body.username))
    if existing_u.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username already taken")

    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")

    user = User(
        email=body.email,
        username=body.username,
        password_hash=_hash(body.password),
        role="user",
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    return TokenResponse(
        access_token=make_access_token(user),
        refresh_token=make_refresh_token(user),
        user={"id": str(user.id), "email": user.email, "username": user.username, "role": user.role},
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not _verify(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    return TokenResponse(
        access_token=make_access_token(user),
        refresh_token=make_refresh_token(user),
        user={"id": str(user.id), "email": user.email, "username": user.username, "role": user.role},
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, session: AsyncSession = Depends(get_session)):
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    result = await session.execute(select(User).where(User.id == uuid.UUID(payload["sub"])))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    return TokenResponse(
        access_token=make_access_token(user),
        refresh_token=make_refresh_token(user),
        user={"id": str(user.id), "email": user.email, "username": user.username, "role": user.role},
    )


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return {"id": str(user.id), "email": user.email, "username": user.username, "role": user.role, "created_at": user.created_at}
