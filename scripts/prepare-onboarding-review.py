"""Create synthetic identities only in the explicit isolated review database."""
import json
import os
import secrets
import uuid
from pathlib import Path

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()
import pyotp
from config.crypto import cipher
from django.conf import settings
from django.contrib.sessions.backends.db import SessionStore
from django.test import RequestFactory
from medframe_apps.accounts.models import MailOutbox, MfaCredential, User
from medframe_apps.onboarding.invitations import issue_invitation

if not settings.DATABASES["default"]["NAME"].startswith("medframe_django_onboarding_"):
    raise SystemExit("Review database required.")
stamp = uuid.uuid4().hex[:10]
password = "Review synthetic " + secrets.token_hex(12)
user = User.objects.create_superuser(f"platform-{stamp}@example.test", password, display_name="Synthetic platform operator")
secret = pyotp.random_base32()
MfaCredential.objects.create(user=user, encrypted_secret=cipher().encrypt(secret.encode()).decode(), confirmed=True)
request = RequestFactory().post("/")
request.user = user
request.session = SessionStore()
request.session.create()
request.session["mfa_verified"] = True
request.session["auth_realm"] = "staff"
email = f"clinic-{stamp}@example.test"
result = issue_invitation(request, {"email": email, "contact_name": "Synthetic Administrator", "clinic_name": "Review Clinic " + stamp}, uuid.uuid4())
mail = MailOutbox.objects.filter(kind="clinic_invitation").latest("created_at")
link = json.loads(cipher().decrypt(mail.encrypted_payload.encode()))["link"]
folder = Path.home()/".local/share/medframe/ui-review"
folder.mkdir(mode=0o700, parents=True, exist_ok=True)
file = folder/"clinic-onboarding.json"
file.write_text(json.dumps({"platform_email":user.email,"platform_password":password,"platform_secret":secret,"email":email,"password":"Synthetic Clinic " + secrets.token_hex(12),"link":link,"invitation":result["id"],"clinic_name":"Review Clinic " + stamp}))
file.chmod(0o600)
print("Synthetic onboarding fixture saved privately.")
