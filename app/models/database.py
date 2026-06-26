from typing import Optional
from sqlalchemy import Boolean, String, Float, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, ARRAY
import uuid
from datetime import datetime


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    api_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ModerationDecision(Base):
    __tablename__ = "moderation_decisions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"))
    content_id: Mapped[Optional[str]] = mapped_column(String(255))
    content_text: Mapped[Optional[str]] = mapped_column(Text)
    content_type: Mapped[str] = mapped_column(String(50), default="text")
    user_id: Mapped[Optional[str]] = mapped_column(String(255))
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    categories: Mapped[Optional[list]] = mapped_column(ARRAY(String))
    explanation: Mapped[Optional[str]] = mapped_column(Text)
    appeal_text: Mapped[Optional[str]] = mapped_column(Text)
    triage_result: Mapped[Optional[str]] = mapped_column(String(50))
    processing_time_ms: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ModerationJob(Base):
    __tablename__ = "moderation_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"))
    status: Mapped[str] = mapped_column(String(50), default="pending")
    result: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class TenantWebhook(Base):
    __tablename__ = "tenant_webhooks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), unique=True)
    url: Mapped[str] = mapped_column(String(2000), nullable=False)
    secret: Mapped[Optional[str]] = mapped_column(String(255))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Appeal(Base):
    __tablename__ = "appeals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    decision_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("moderation_decisions.id"))
    appeal_reason: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    reviewer_id: Mapped[Optional[str]] = mapped_column(String(255))
    review_notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)


class ReviewerAction(Base):
    __tablename__ = "reviewer_actions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    decision_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("moderation_decisions.id"))
    reviewer_id: Mapped[str] = mapped_column(String(255), nullable=False)
    action_taken: Mapped[str] = mapped_column(String(50), nullable=False)
    override_action: Mapped[Optional[str]] = mapped_column(String(50))
    override_reason: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
