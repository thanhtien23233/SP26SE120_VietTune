import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "small")
    API_KEY: str = os.getenv("API_KEY", "")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8002))
    
    class Config:
        env_file = ".env"

settings = Settings()
