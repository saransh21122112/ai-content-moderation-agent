from app.config import settings

_index = None


def _get_index():
    global _index
    if _index is None and settings.pinecone_api_key:
        try:
            from pinecone import Pinecone
            pc = Pinecone(api_key=settings.pinecone_api_key)
            _index = pc.Index(settings.pinecone_index)
        except Exception:
            pass
    return _index


async def upsert_decision(
    decision_id: str,
    content: str,
    action: str,
    categories: list,
    tenant_id: str,
):
    index = _get_index()
    if not index:
        return

    from app.services.embeddings import embed_text
    embedding = await embed_text(content)

    index.upsert(
        vectors=[{
            "id": decision_id,
            "values": embedding,
            "metadata": {
                "action": action,
                "categories": ",".join(categories),
                "tenant_id": tenant_id,
                "content_preview": content[:200],
            },
        }],
        namespace=tenant_id,
    )


async def search_precedents(content: str, tenant_id: str, top_k: int = 3) -> list:
    index = _get_index()
    if not index:
        return []

    from app.services.embeddings import embed_text
    embedding = await embed_text(content)

    results = index.query(
        vector=embedding,
        top_k=top_k,
        namespace=tenant_id,
        include_metadata=True,
    )

    return [
        {
            "similarity_score": round(match.score, 3),
            "action": match.metadata.get("action"),
            "categories": match.metadata.get("categories", "").split(","),
            "content_preview": match.metadata.get("content_preview", ""),
        }
        for match in results.matches
        if match.score > 0.7
    ]
