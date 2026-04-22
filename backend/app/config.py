from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    openai_api_key: str
    anthropic_api_key: str

    model_config = {"env_file": ".env"}


settings = Settings()
