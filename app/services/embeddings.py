from openai import AsyncOpenAI
from app.config import settings

_client = AsyncOpenAI(api_key=settings.openai_api_key)


async def embed_text(text: str) -> list:
    response = await _client.embeddings.create(
        model=settings.embedding_model,
        input=text[:8000],
    )
    return response.data[0].embedding
