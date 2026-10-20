"""Prepare isolated synthetic Phase5 review state. No original DB or mail delivery."""

import json
import os
import secrets
from datetime import timedelta
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from config.crypto import cipher
from django.conf import settings
from django.contrib.auth import login
from django.contrib.sessions.backends.db import SessionStore
from django.test import RequestFactory
from django.utils import timezone
from medframe_apps.accounts.models import ClinicalSession, MailOutbox, User
from medframe_apps.onboarding.completion import complete_onboarding
from medframe_apps.onboarding.invitations import issue_invitation
from medframe_apps.onboarding.models import ClinicOnboarding, OnboardingConsent
from medframe_apps.onboarding.validation import NOTICE_VERSION, validate_step
from medframe_apps.onboarding.verification import (
    exchange_invitation,
    request_email_code,
    verify_email,
)
from medframe_apps.providers.models import ProviderProfile
from medframe_apps.providers.specialties import save_specialties, specialty_setup
from medframe_apps.websites import domains
from medframe_apps.websites import services as websites
from medframe_apps.websites.content import defaults
from medframe_apps.websites.models import ClinicWebsite

assert (
    settings.DATABASES["default"]["NAME"]
    == "medframe_django_station_kiosk_review_20261019"
)
folder = Path.home() / ".local/share/medframe/ui-review"
base = json.loads((folder / "station-kiosk.json").read_text())
provider = ProviderProfile.objects.select_related(
    "membership__user", "membership__organization"
).get(id=base["provider"])
actor, org = provider.membership.user, provider.membership.organization
staff = SimpleNamespace(
    user=actor, session={"mfa_verified": True, "auth_realm": "staff"}
)
setup = specialty_setup(staff, org.id)
save_specialties(
    staff,
    org.id,
    list(set(setup["selected"]) | {"pediatrics"}),
    setup["version"],
    uuid4(),
)
stamp = secrets.token_hex(3)


def write(name, value):
    path = folder / name
    path.write_text(json.dumps(value))
    path.chmod(0o600)


def storage(request, name):
    request.session.save()
    write(
        name,
        {
            "cookies": [
                {
                    "name": "medframe_django_session",
                    "value": request.session.session_key,
                    "domain": "localhost",
                    "path": "/",
                    "expires": -1,
                    "httpOnly": True,
                    "secure": False,
                    "sameSite": "Lax",
                }
            ],
            "origins": [],
        },
    )


def staff_session(user):
    req = RequestFactory().post("/auth/mfa/verify")
    req.session = SessionStore()
    login(req, user, backend="django.contrib.auth.backends.ModelBackend")
    req.session.update(
        {"mfa_verified": True, "auth_realm": "staff", "auth_epoch": user.auth_epoch}
    )
    req.session.save()
    ClinicalSession.objects.create(
        user=user,
        session_key=req.session.session_key,
        last_seen_at=timezone.now(),
        expires_at=timezone.now() + timedelta(hours=8),
        realm="staff",
    )
    req.user = user
    return req


storage(staff_session(actor), "phase5-staff.json")
issuer = User.objects.create_superuser(
    "phase5-platform-" + stamp + "@synthetic.example", secrets.token_urlsafe(32)
)
issue_request = SimpleNamespace(
    user=issuer, session={"mfa_verified": True, "auth_realm": "staff"}
)
meta = {
    "organization": str(org.id),
    "branch": base["branch"],
    "template_name": "Synthetic Phase5 template " + stamp,
}
for kind in ["review", "first-run"]:
    email = kind + "-" + stamp + "@synthetic.example"
    name = "Synthetic " + kind + " Clinic " + stamp
    user = User.objects.create_user(
        email, secrets.token_urlsafe(32), display_name="Dr. Synthetic de la Cruz"
    )
    issue_invitation(
        issue_request,
        {"email": email, "clinic_name": name, "contact_name": user.display_name},
        uuid4(),
    )
    mail = MailOutbox.objects.filter(kind="clinic_invitation").latest("created_at")
    token = json.loads(cipher().decrypt(mail.encrypted_payload.encode()))[
        "link"
    ].rsplit("/", 1)[1]
    req = staff_session(user)
    exchange_invitation(req, token)
    request_email_code(req)
    mail = MailOutbox.objects.filter(kind="clinic_email_code").latest("created_at")
    code = json.loads(cipher().decrypt(mail.encrypted_payload.encode()))["code"]
    state = verify_email(req, code)
    draft = ClinicOnboarding.objects.get(id=state["id"])
    draft.user, draft.auth_epoch = user, user.auth_epoch
    draft.progress_data = {
        "clinic": {
            "name": name,
            "clinic_type": "multi_specialty",
            "email": email,
            "phone": "+639171234567",
            "city": "Synthetic City",
        },
        "specialties": {
            "codes": ["pediatrics"],
            "provider_types": ["physician", "medical_assistant"],
            "provider_count": "20_plus",
        },
        "branding": {},
        "practice": {"branch_name": "Main Branch", "days": [0, 2, 4]},
    }
    draft.progress_data = {
        step: validate_step(step, values, True)
        for step, values in draft.progress_data.items()
    }
    draft.completed_steps = ["clinic", "specialties", "branding", "practice", "account"]
    draft.current_step, draft.status = "review", "ready_for_review"
    draft.save()
    OnboardingConsent.objects.create(
        draft=draft,
        user=user,
        terms_version=NOTICE_VERSION,
        privacy_version=NOTICE_VERSION,
    )
    meta[kind] = {"name": name, "email": email, "administrator": user.display_name}
    if kind == "first-run":
        result = complete_onboarding(req, draft.version, uuid4())
        identifier = result["organization_id"]
        meta[kind]["organization"] = str(identifier)
        content = defaults(name)
        content.update(
            headline="Synthetic clinic introduction",
            seo_title="Synthetic Phase5 clinic",
            seo_description="Synthetic clinic public information",
            indexable=True,
        )
        slug = "phasefive-" + stamp
        saved = websites.action(
            req, identifier, "save", {"slug": slug, "content": content}, 0
        )
        websites.action(
            req, identifier, "publish", {"reviewed": True}, saved["version"]
        )
        website = ClinicWebsite.objects.get(organization_id=identifier)
        domain = domains.prepare(website, slug + ".synthetic.example")
        # Simulate an already verified DNS state in the review fixture only.
        # No DNS query, real hostname verification, TLS or public deployment.
        domain.verified_at = timezone.now()
        domain.save(update_fields=["verified_at"])
        meta["website"] = {"host": domain.hostname, "slug": slug}
    storage(req, "phase5-" + kind + ".json")
write("phase5-metadata.json", meta)
print(
    "Prepared synthetic onboarding, first-run and verified-state website fixtures in isolated DB only. Mail remains in that DB with no review worker."
)
