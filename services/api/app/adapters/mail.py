import asyncio
import json
from datetime import timedelta
from email.message import EmailMessage

import aiosmtplib
from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import session_factory, utcnow
from app.core.security import cipher
from app.modules.identity.models import MailOutbox


async def send_password_reset(email: str, reset_url: str) -> None:
    settings = get_settings()
    message = EmailMessage()
    message["From"] = settings.mail_from
    message["To"] = email
    message["Subject"] = "Reset your Medframe password"
    message.set_content(
        "A password reset was requested for your Medframe account.\n\n"
        f"Open this link within 15 minutes:\n{reset_url}\n\n"
        "If you did not request this, you can ignore this email."
    )
    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_username or None,
        password=settings.smtp_password.get_secret_value() or None,
        start_tls=settings.smtp_start_tls,
        timeout=10,
    )


async def deliver_next() -> bool:
    async with session_factory.begin() as db:
        record = await db.scalar(
            select(MailOutbox)
            .where(
                MailOutbox.sent_at.is_(None),
                MailOutbox.available_at <= utcnow(),
                MailOutbox.attempts < 5,
            )
            .order_by(MailOutbox.created_at)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if record is None:
            return False
        payload = json.loads(cipher().decrypt(record.encrypted_payload.encode()))
        record.attempts += 1
        try:
            await send_password_reset(payload["email"], payload["url"])
        except (aiosmtplib.SMTPException, OSError, TimeoutError):
            record.available_at = utcnow() + timedelta(seconds=30 * 2**record.attempts)
        else:
            record.sent_at = utcnow()
            record.encrypted_payload = "delivered"
        return True


async def run() -> None:
    while True:
        if not await deliver_next():
            await asyncio.sleep(2)


if __name__ == "__main__":
    asyncio.run(run())
