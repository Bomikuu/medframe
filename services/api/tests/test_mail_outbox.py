import aiosmtplib
from sqlalchemy import select

from app.adapters import mail
from app.core.database import session_factory, utcnow
from app.core.request_context import RequestContext
from app.modules.identity.models import MailOutbox
from app.modules.identity.recovery import request_password_reset

context = RequestContext("mail-test", "127.0.0.1", "http://localhost:3000")


async def test_outbox_delivery_wipes_encrypted_payload_after_commit(staff, monkeypatch):
    delivered = []

    async def capture(email, url):
        delivered.append((email, url))

    monkeypatch.setattr(mail, "send_password_reset", capture)
    async with session_factory.begin() as db:
        await request_password_reset(db, staff[0], context)
    assert await mail.deliver_next()
    assert delivered[0][0] == staff[0]
    assert "/auth/reset#token=" in delivered[0][1]
    async with session_factory() as db:
        row = await db.scalar(select(MailOutbox))
        assert row.sent_at is not None
        assert row.encrypted_payload == "delivered"
    assert not await mail.deliver_next()


async def test_outbox_failures_back_off_and_stop_after_five_attempts(staff, monkeypatch):
    async def unavailable(*args):
        raise aiosmtplib.SMTPException("Synthetic delivery failure")

    monkeypatch.setattr(mail, "send_password_reset", unavailable)
    async with session_factory.begin() as db:
        await request_password_reset(db, staff[0], context)
    assert await mail.deliver_next()
    async with session_factory.begin() as db:
        row = await db.scalar(select(MailOutbox))
        assert row.attempts == 1
        assert row.available_at > utcnow()
        assert row.sent_at is None
        row.attempts = 5
        row.available_at = utcnow()
    assert not await mail.deliver_next()
