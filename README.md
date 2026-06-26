# Sentinel — AI Content Moderation Platform

A production-grade, multi-agent content moderation API for social media platforms. Built with FastAPI, GPT-4o, AWS Rekognition, and a Next.js dashboard that lets you test every feature from a single interface.

---

## Architecture

```
Content → Triage Agent (GPT-4o-mini, ~200ms)
             ↓
       Analysis Agent (GPT-4o, full reasoning)
             ↓
    AWS Rekognition (images & videos)
             ↓
  Decision stored in PostgreSQL + Pinecone
```

**Stack:** FastAPI · PostgreSQL · Redis · Celery · AWS Rekognition · OpenAI GPT-4o · Pinecone · Next.js 14

---

## What You Can Do

| Feature | Endpoint | Dashboard |
|---|---|---|
| Moderate text content | `POST /api/v1/moderate` | Moderate tab |
| Moderate images from S3 | `POST /api/v1/moderate` (content_type: image) | Moderate tab |
| Upload & scan image files | `POST /api/v1/moderate/file` | Moderate → Upload File |
| Upload & scan video files | `POST /api/v1/moderate/file` | Moderate → Upload File |
| Queue async moderation job | `POST /api/v1/moderate/async` | Async Jobs tab |
| Check job status | `GET /api/v1/jobs/{job_id}` | Async Jobs tab |
| View human review queue | `GET /api/v1/review-queue` | Review Queue tab |
| Accept or override a decision | `POST /api/v1/review-queue/{id}/action` | Review Queue tab |
| Submit a user appeal | `POST /api/v1/appeals` | Appeals tab |
| Re-analyze appeal with AI | `POST /api/v1/appeals/{id}/reanalyze` | Appeals tab |
| Approve or reject an appeal | `POST /api/v1/appeals/{id}/resolve` | Appeals tab |
| View analytics & trends | `GET /api/v1/analytics/summary` | Analytics tab |
| Browse decision history | `GET /api/v1/decisions` | History tab |
| View a specific decision | `GET /api/v1/decisions/{id}` | History → click row |
| Health check | `GET /health` | Sidebar status indicator |

---

## Setup

### 1. Prerequisites

```bash
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis
```

### 2. Database

```bash
createuser moderation_user -P   # password: moderation_pass
createdb moderation_db -O moderation_user
```

### 3. Backend environment

Create `.env` in the project root:

```env
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql+asyncpg://moderation_user:moderation_pass@localhost/moderation_db
TRIAGE_MODEL=gpt-4o-mini
ANALYSIS_MODEL=gpt-4o
EMBEDDING_MODEL=text-embedding-3-small
REDIS_URL=redis://localhost:6379/0

# AWS (for image/video scanning)
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_UPLOAD_BUCKET=your-bucket-name

# Pinecone (optional — enables precedent search)
PINECONE_API_KEY=
PINECONE_INDEX=moderation-decisions
```

> **AWS Note:** Your S3 bucket can be in any region. Images are scanned by downloading bytes — no region coupling. Videos are uploaded to an auto-created `{bucket}-rek-video` bucket in `eu-west-1` where Rekognition Video API is supported.

### 4. Install dependencies & start backend

```bash
pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Start the dashboard

```bash
cd dashboard
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Dashboard Guide

The dashboard has six sections accessible from the sidebar:

### Moderate
Test the moderation API in real time. Two modes:

- **Text & S3** — type any text, or use the quick sample buttons (Spam, Hate Speech, Harassment, Safe, Misinformation, Self-harm) to test common scenarios. For images already in S3, set content type to "Image" and provide the bucket/key.
- **Upload File** — drag and drop or browse to select an image (JPG, PNG, WEBP) or video (MP4, MOV, AVI, WEBM). Images are scanned in ~1 second. Videos are uploaded to S3 and scanned with Rekognition Video API (30–90 seconds).

Every result shows the action, confidence score, whether human review is required, AI reasoning, and detected categories.

### Async Jobs
Submit content to a Redis-backed job queue and retrieve results asynchronously — suitable for high-volume platforms. Optionally add a webhook URL to receive the result via HTTP POST (HMAC-SHA256 signed) when the job completes.

### Review Queue
Decisions where the AI confidence fell below 85% appear here for human review. You can:
- **Accept** the AI decision as-is
- **Override** with a different action and reason — this also re-embeds the content in Pinecone so future similar content is handled correctly

### Appeals
Users can dispute moderation decisions. Provide a Decision ID (from any Moderate result) and a reason. From the appeals list you can:
- **Re-analyze with AI** — GPT-4o reads the content and the appeal reason together and produces a fresh recommendation
- **Approve** or **Reject** the appeal with optional review notes

### Analytics
Aggregate stats for the last 7–90 days, auto-loaded on tab open:
- Total decisions, auto-actioned vs human-reviewed, removed, warned, false positive rate
- Daily volume line chart (by action)
- Action distribution donut chart with breakdown table
- Top detected categories ranked bar chart

### History
Browse the full audit trail of every moderation decision. Filter by action, content type, or user ID, or keyword-search inside content text. Click any row to open a detail panel showing AI reasoning, confidence, categories, and any human reviewer actions with override reasons.

---

## API Reference

### Authenticate

All endpoints require an `X-API-Key` header:

```bash
curl -H "X-API-Key: test-api-key-12345" http://localhost:8000/health
```

### Moderate content

```bash
curl -X POST http://localhost:8000/api/v1/moderate \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"content": "Buy followers now!!!", "user_id": "user_123", "content_type": "text"}'
```

Response:
```json
{
  "action": "restrict",
  "confidence": 0.91,
  "triage_result": "suspicious",
  "categories": ["spam", "commercial"],
  "explanation": "The content promotes follower purchasing with urgency cues...",
  "requires_human_review": false,
  "processing_time_ms": 1847,
  "decision_id": "2c2c52c9-..."
}
```

### Upload a file for scanning

```bash
curl -X POST http://localhost:8000/api/v1/moderate/file \
  -H "X-API-Key: test-api-key-12345" \
  -F "file=@/path/to/image.jpg" \
  -F "user_id=user_123"
```

### Submit async job

```bash
curl -X POST http://localhost:8000/api/v1/moderate/async \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test message", "webhook_url": "https://example.com/webhook"}'
# Returns: {"job_id": "uuid"}

curl http://localhost:8000/api/v1/jobs/{job_id} \
  -H "X-API-Key: test-api-key-12345"
```

---

## Decision Actions

| Action | Meaning | Typical confidence |
|---|---|---|
| `pass` | Content is safe | > 90% |
| `warn` | Content is borderline, user receives a warning | 70–90% |
| `restrict` | Content is hidden or rate-limited | 70–90% |
| `remove` | Content is removed immediately | > 85% |

Confidence < 85% triggers `requires_human_review: true` and adds the decision to the Review Queue.

---

## Deployment

The backend is a standard FastAPI app. The dashboard is Next.js 14 (App Router). Both can be deployed independently:

- **Backend**: any Python host (Railway, Render, Fly.io, EC2) — needs PostgreSQL + Redis
- **Dashboard**: Vercel, Netlify, or any Node host — set `API_URL` and `API_KEY` in environment variables

For the dashboard, set in `.env.local`:
```
API_URL=https://your-api-host.com
API_KEY=your-production-key
```
