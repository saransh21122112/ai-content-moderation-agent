from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str
    database_url: str = "postgresql+asyncpg://moderation_user:moderation_pass@localhost/moderation_db"
    triage_model: str = "gpt-4o-mini"
    analysis_model: str = "gpt-4o"
    embedding_model: str = "text-embedding-3-small"
    low_confidence_threshold: float = 0.85

    pinecone_api_key: str = ""
    pinecone_index: str = "moderation-decisions"

    redis_url: str = "redis://localhost:6379/0"

    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_upload_bucket: str = ""

    model_config = {"env_file": ".env"}

    @property
    def async_database_url(self) -> str:
        # Render provides postgres:// — convert to asyncpg-compatible scheme
        url = self.database_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and "+asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


settings = Settings()
