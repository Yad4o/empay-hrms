from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "empay-secret-key-2025-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    DATABASE_URL: str = "sqlite:///./empay.db"

    class Config:
        env_file = ".env"


settings = Settings()
