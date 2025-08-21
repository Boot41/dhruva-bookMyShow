from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    app_name: str = "BookMyShow Server"
    environment: str = Field(default="development")

    # Database
    database_url: str = Field(
        default="postgresql+psycopg2://postgres:postgres@localhost:5432/bookmyshow"
    )

    # Security / Auth
    jwt_secret_key: str = Field(default="CHANGE_ME_SUPER_SECRET")
    jwt_algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=60 * 24)  # 24 hours
    
    # Pydantic v2 settings config
    model_config = SettingsConfigDict(
        env_prefix="BMS_",
        env_file=".env",
        case_sensitive=False,
    )


settings = Settings()
