"""Generate local-only secrets. Never overwrites an existing environment file."""

import base64
import secrets
from pathlib import Path

root = Path(__file__).resolve().parents[1]
target = root / ".env"
if target.exists():
    raise SystemExit(".env already exists; refusing to overwrite it.")
password = secrets.token_urlsafe(24)
key = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()
target.write_text(
    f"POSTGRES_PASSWORD={password}\n"
    f"DATABASE_URL=postgresql+asyncpg://medframe:{password}@127.0.0.1:55432/medframe\n"
    "REDIS_URL=redis://127.0.0.1:56379/0\n"
    f"ENCRYPTION_KEY={key}\n"
    f"APP_SECRET={secrets.token_urlsafe(48)}\n"
    "APP_ENV=development\nWEB_ORIGIN=http://localhost:3000\nCOOKIE_SECURE=false\n"
    "SMTP_HOST=127.0.0.1\nSMTP_PORT=51025\nRECOVERY_ENABLED=true\n"
)
target.chmod(0o600)
print("Generated private .env. No staff accounts or reusable passwords were created.")
