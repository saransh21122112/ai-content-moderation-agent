from pydantic import BaseModel, Field, computed_field
from typing import Optional, List, Dict, Any
from enum import Enum


class ContentType(str, Enum):
    text = "text"
    image = "image"
    video = "video"


class ModerateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=50000)
    content_type: ContentType = ContentType.text
    user_id: str = Field(..., min_length=1)
    content_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class AsyncModerateRequest(ModerateRequest):
    webhook_url: Optional[str] = None


class ModerateResponse(BaseModel):
    decision_id: str
    action: str
    confidence: float
    categories: List[str]
    explanation: str
    appeal_text: str
    triage_result: str
    processing_time_ms: int

    @computed_field
    @property
    def requires_human_review(self) -> bool:
        return self.confidence < 0.85


class AsyncModerateResponse(BaseModel):
    job_id: str
    status: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    result: Optional[ModerateResponse] = None
    created_at: str


# Review queue
class ReviewQueueItem(BaseModel):
    decision_id: str
    content_text: Optional[str]
    content_type: str
    user_id: Optional[str]
    action: str
    confidence: float
    categories: List[str]
    explanation: str
    appeal_text: str
    triage_result: str
    created_at: str


class ReviewQueueResponse(BaseModel):
    items: List[ReviewQueueItem]
    total: int
    page: int
    limit: int


class ReviewActionRequest(BaseModel):
    reviewer_id: str = Field(..., min_length=1)
    action_taken: str = Field(..., pattern="^(accept|override)$")
    override_action: Optional[str] = None
    override_reason: Optional[str] = None


# Appeals
class AppealCreateRequest(BaseModel):
    decision_id: str
    appeal_reason: str = Field(..., min_length=5)


class AppealItem(BaseModel):
    appeal_id: str
    decision_id: str
    appeal_reason: str
    status: str
    created_at: str
    resolved_at: Optional[str]
    content_preview: Optional[str]
    original_action: Optional[str]


class AppealResolveRequest(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$")
    reviewer_id: str
    review_notes: Optional[str] = None
