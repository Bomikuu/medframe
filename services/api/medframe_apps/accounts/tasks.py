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
                if item.kind in {"staff_invitation", "staff_email_code"}:
                    from medframe_apps.organizations.models import StaffInvitation
                    from medframe_apps.organizations.staff_onboarding import live_invitation
                    from config.errors import DomainError

                    invitation_record = (
                        StaffInvitation.objects.select_related("organization", "issued_by")
                        .filter(id=payload.get("invitation"), token_hash=payload.get("token_hash"))
                        .first()
                    )
                    try:
                        live_invitation(invitation_record)
                        valid = item.kind == "staff_invitation" or (
                            invitation_record.proof_hash == payload.get("proof_hash")
                            and not invitation_record.verified_at
                            and invitation_record.otp_expires_at > timezone.now()
                            and invitation_record.attempts < 5
                        )
                    except DomainError:
                        valid = False
                    if valid:
                        content = (
                            (
                                "Your staff verification code: "
                                + payload["code"]
                                + "\nExpires in 10 minutes."
                            )
                            if item.kind == "staff_email_code"
                            else (
                                "Your clinic invited you to join Medframe. Verify your email, complete your profile and secure your account:\n"
                                + payload["link"]
                            )
                        )
                        send_mail(
                            "Medframe staff onboarding", content, None, [payload["recipient"]]
                        )
                    item.sent_at = timezone.now()
                    item.encrypted_payload = ""
                    item.save()
                    continue
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
                if item.kind == "patient_register_sms":
                    from medframe_apps.portal.registration_models import RegistrationContact
                    from medframe_apps.portal.smsgate import send_otp

                    proof = RegistrationContact.objects.filter(
                        id=payload.get("challenge"),
                        channel="mobile",
                        invalidated=False,
                        verified_at__isnull=True,
                        expires_at__gt=timezone.now(),
                        attempts__lt=5,
                        entry__enabled=True,
                        entry__branch__organization__active=True,
                    ).first()
                    if proof:
                        result = send_otp(
                            payload["recipient"],
                            payload["code"],
                            proof.id,
                            (proof.expires_at - timezone.now()).total_seconds(),
                        )
                        RegistrationContact.objects.filter(id=proof.id).update(
                            delivery_state=result.state
                        )
                        if result.state == "retryable_failure" and item.attempts < 5:
                            item.available_at = timezone.now() + timedelta(
                                seconds=30 * 2**item.attempts
                            )
                            item.save()
                            continue
                    # Accepted, rejected or uncertain: never blindly retry a potentially sent OTP.
                    item.sent_at = timezone.now()
                    item.encrypted_payload = ""
                    item.save()
                    continue
                if item.kind == "patient_register_code":
                    from medframe_apps.portal.registration_models import RegistrationContact

                    valid = RegistrationContact.objects.filter(
                        id=payload.get("challenge"),
                        invalidated=False,
                        verified_at__isnull=True,
                        expires_at__gt=timezone.now(),
                        entry__enabled=True,
                        entry__branch__organization__active=True,
                    ).exists()
                    if valid:
                        send_mail(
                            "Your Medframe registration code",
                            "Your verification code is "
                            + payload["code"]
                            + "\nIt expires in 10 minutes.\nThis code verifies your email only; your clinic reviews registration separately.",
                            None,
                            [payload["recipient"]],
                        )
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
