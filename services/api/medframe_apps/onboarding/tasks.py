import hashlib
import io
from datetime import timedelta

from celery import shared_task
from django.core.files.storage import default_storage
from django.utils import timezone

from medframe_apps.documents.tasks import scan_stream

from .models import ClinicOnboarding, OnboardingLogo, OnboardingVerification


@shared_task(bind=True, max_retries=4)
def scan_logo(self, identifier):
    logo = (
        OnboardingLogo.objects.select_related("draft__invitation")
        .filter(id=identifier, selected=True, promoted=False)
        .first()
    )
    if (
        not logo
        or logo.draft.completed_at
        or logo.draft.status == "cancelled"
        or logo.draft.invitation.revoked_at
        or logo.draft.invitation.expires_at <= timezone.now()
    ):
        return
    try:
        with default_storage.open(logo.key, "rb") as stream:
            data = stream.read(2 * 1024 * 1024 + 1)
        state = (
            scan_stream(io.BytesIO(data))
            if len(data) == logo.size and hashlib.sha256(data).hexdigest() == logo.sha256
            else "rejected"
        )
    except Exception:
        OnboardingLogo.objects.filter(id=logo.id, selected=True, promoted=False).update(
            scan_state="unavailable"
        )
        raise self.retry(exc=OSError("Logo security scan unavailable"), countdown=30) from None
    OnboardingLogo.objects.filter(id=logo.id, selected=True, promoted=False).update(
        scan_state=state
    )


@shared_task
def cleanup_onboarding():
    now = timezone.now()
    OnboardingVerification.objects.filter(expires_at__lt=now - timedelta(days=30)).delete()
    drafts = ClinicOnboarding.objects.filter(
        completed_at__isnull=True, invitation__expires_at__lt=now - timedelta(days=30)
    )
    for draft in drafts:
        for logo in OnboardingLogo.objects.filter(draft=draft, promoted=False):
            default_storage.delete(logo.key)
            logo.delete()
        draft.progress_data = {}
        draft.status = "expired"
        draft.save()
