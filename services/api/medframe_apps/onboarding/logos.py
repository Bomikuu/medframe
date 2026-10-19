import hashlib
import io
import secrets

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from PIL import Image

from config.errors import DomainError
from medframe_apps.common import check_version
from medframe_apps.documents.models import Document, DocumentVersion
from medframe_apps.documents.storage import validate_bytes

from .models import ClinicOnboarding, OnboardingLogo
from .verification import require_onboarding


@transaction.atomic
def upload_logo(request, uploaded_file, expected_version):
    draft = require_onboarding(request)
    draft = ClinicOnboarding.objects.select_for_update().get(id=draft.id)
    check_version(draft.version, expected_version)
    if (
        not uploaded_file
        or uploaded_file.size > 2 * 1024 * 1024
        or uploaded_file.content_type not in {"image/png", "image/jpeg", "image/webp"}
    ):
        raise DomainError("INVALID_FILE", "Choose a PNG, JPEG or WebP logo up to 2 MiB.")
    raw = uploaded_file.read()
    try:
        with Image.open(io.BytesIO(raw)) as image:
            if getattr(image, "is_animated", False):
                raise ValueError()
    except Exception:
        raise DomainError("INVALID_FILE", "Choose a still raster image.") from None
    data = validate_bytes(raw, uploaded_file.content_type, "logo")
    with Image.open(io.BytesIO(data)) as image:
        width, height = image.size
    OnboardingLogo.objects.filter(draft=draft, selected=True).update(selected=False)
    key = default_storage.save(f"onboarding/{draft.id}/{secrets.token_hex(16)}", ContentFile(data))
    logo = OnboardingLogo.objects.create(
        draft=draft,
        key=key,
        filename="clinic-logo",
        content_type=uploaded_file.content_type,
        size=len(data),
        width=width,
        height=height,
        sha256=hashlib.sha256(data).hexdigest(),
    )
    draft.version += 1
    draft.save()
    from .tasks import scan_logo

    transaction.on_commit(lambda: scan_logo.delay(str(logo.id)))
    from .drafts import snapshot

    return snapshot(request)


@transaction.atomic
def remove_logo(request, expected_version):
    draft = require_onboarding(request)
    draft = ClinicOnboarding.objects.select_for_update().get(id=draft.id)
    check_version(draft.version, expected_version)
    OnboardingLogo.objects.filter(draft=draft, selected=True).update(selected=False)
    draft.version += 1
    draft.save()
    from .drafts import snapshot

    return snapshot(request)


def promote_logo(draft, user, organization):
    logo = OnboardingLogo.objects.select_for_update().filter(draft=draft, selected=True).first()
    if not logo:
        return None
    if logo.scan_state != "clean" or logo.promoted:
        raise DomainError(
            "LOGO_PENDING", "Wait for a clean logo scan or remove the logo before continuing.", 409
        )
    document = Document.objects.create(
        organization=organization, uploaded_by=user, purpose="logo", label="Clinic logo"
    )
    version = DocumentVersion.objects.create(
        document=document,
        uploaded_by=user,
        key=logo.key,
        filename=logo.filename,
        content_type=logo.content_type,
        expected_size=logo.size,
        size=logo.size,
        sha256=logo.sha256,
        scan_state="clean",
    )
    logo.promoted = True
    logo.save(update_fields=["promoted"])
    return version
