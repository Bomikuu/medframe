import json
from datetime import timedelta

from celery import shared_task
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from config.crypto import cipher
from medframe_apps.accounts.models import MailOutbox


@shared_task
def deliver_recovery_mail():
    for _ in range(20):
        with transaction.atomic():
            item = (
                MailOutbox.objects.select_for_update(skip_locked=True)
                .filter(sent_at__isnull=True, attempts__lt=5, available_at__lte=timezone.now())
                .order_by("created_at")
                .first()
            )
            if item is None:
                return
            item.attempts += 1
            try:
                payload = json.loads(cipher().decrypt(item.encrypted_payload.encode()))
                if item.kind in {"clinic_invitation", "clinic_email_code", "clinic_resume"}:
                    from medframe_apps.onboarding.models import ClinicInvitation
                    from medframe_apps.onboarding.policy import invitation_state

                    invitation_record = ClinicInvitation.objects.filter(
                        id=payload.get("invitation"), generation=payload.get("generation")
                    ).first()
                    if invitation_record and invitation_state(invitation_record) not in {
                        "expired",
                        "revoked",
                        "completed",
                    }:
                        content = (
                            (
                                "Your Medframe verification code: "
                                + payload["code"]
                                + "\nExpires in 10 minutes."
                            )
                            if item.kind == "clinic_email_code"
                            else "Continue setting up your clinic:\n" + payload["link"]
                        )
                        send_mail("Medframe clinic setup", content, None, [payload["recipient"]])
                    item.sent_at = timezone.now()
                    item.encrypted_payload = ""
                    item.save()
                    continue
                if item.kind not in {"password_reset", "portal_invitation"}:
                    raise ValueError("Unknown mail kind")
                invitation = item.kind == "portal_invitation"
                send_mail(
                    "Your Medframe invitation" if invitation else "Reset your Medframe password",
                    (
                        "Accept your clinic invitation within 24 hours:\n"
                        if invitation
                        else "Use this link within 15 minutes:\n"
                    )
                    + payload["link"]
                    + "\nIf unexpected, contact your clinic.",
                    None,
                    [payload["recipient"]],
                )
            except Exception:
                item.available_at = timezone.now() + timedelta(seconds=30 * 2**item.attempts)
                if item.attempts >= 5:
                    item.encrypted_payload = ""
            else:
                item.sent_at = timezone.now()
                item.encrypted_payload = ""
            item.save()
