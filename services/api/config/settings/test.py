from .base import *  # noqa: F403

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
THROTTLE_PREFIX = "django:test:throttle"

SMS_LIVE_ENABLED = False
TWILIO_AUTH_TOKEN = ""
TWILIO_ACCOUNT_SID = ""
TWILIO_FROM = ""
TWILIO_STATUS_CALLBACK_URL = ""
