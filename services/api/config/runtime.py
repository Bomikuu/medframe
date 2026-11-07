from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import urlparse

from cryptography.fernet import Fernet
from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")

    database_url: SecretStr
    celery_broker_url: SecretStr | None = None
    redis_url: str = "redis://127.0.0.1:56379/0"
    encryption_key: SecretStr
    app_secret: SecretStr
    app_env: Literal["development", "test", "production"] = "development"
    web_origin: str = "http://localhost:3000"
    cookie_secure: bool = False
    google_client_id: str = ""
    smsgate_otp_enabled: bool = False
    smsgate_local_url: str = ""
    smsgate_username: str = ""
    smsgate_password: SecretStr = SecretStr("")
    sms_live_enabled: bool = False
    twilio_account_sid: str = ""
    twilio_auth_token: SecretStr = SecretStr("")
    twilio_from: str = ""
    twilio_status_callback_url: str = ""
    smtp_host: str = "127.0.0.1"
    smtp_port: int = 51025
    smtp_username: str = ""
    smtp_password: SecretStr = SecretStr("")
    smtp_start_tls: bool = False
    mail_from: str = "care@medframe.local"
    recovery_enabled: bool = True
    storage_endpoint: str = "http://127.0.0.1:59000"
    storage_access_key: str = ""
    storage_secret_key: SecretStr = SecretStr("")
    storage_bucket: str = "medframe-private"
    scanner_host: str = "127.0.0.1"
    scanner_port: int = 53310

    @model_validator(mode="after")
    def validate_security(self):
        Fernet(self.encryption_key.get_secret_value().encode())
        if len(self.app_secret.get_secret_value()) < 32:
            raise ValueError("APP_SECRET must contain at least 32 characters")
        origin = urlparse(self.web_origin)
        if origin.path or origin.query or origin.fragment or not origin.hostname:
            raise ValueError("WEB_ORIGIN must be an origin without a path")
        if self.app_env == "production":
            if not self.cookie_secure or origin.scheme != "https":
                raise ValueError("Production requires HTTPS and secure cookies")
            if self.recovery_enabled and (not self.smtp_start_tls or not self.smtp_username):
                raise ValueError("Production recovery requires authenticated TLS email delivery")
        elif not self.cookie_secure and origin.hostname not in {"localhost", "127.0.0.1"}:
            raise ValueError("Insecure cookies are restricted to loopback development")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
