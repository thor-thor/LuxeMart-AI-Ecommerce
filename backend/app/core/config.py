from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+pysqlite:///./ecommerce.db"
    JWT_SECRET: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    FROM_EMAIL: Optional[str] = None
    FROM_NAME: str = "LuxeMart"
    
    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None

    UPI_MERCHANT_ID: Optional[str] = None
    UPI_MERCHANT_KEY: Optional[str] = None
    UPI_PAYMENT_URL: str = "https://api.razorpay.com/v1/payments"

    WEBHOOK_SECRET: Optional[str] = None

    COD_ENABLED: bool = True
    MAX_COD_AMOUNT: float = 50000.0

    # Development/Testing: enable simulation mode for UPI payments
    # Set to False in production. Enable true when UPI credentials not configured.
    SIMULATE_PAYMENTS: bool = True
    
    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()