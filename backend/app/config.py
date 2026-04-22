from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    openai_api_key: str
    anthropic_api_key: str

    alquran_api_url: str = "https://api.alquran.cloud/v1"
    tafsir_cdn_url: str = "https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/en-tafisr-ibn-kathir"

    model_config = {"env_file": ".env"}


settings = Settings()
