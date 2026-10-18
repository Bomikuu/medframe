from .base import *  # noqa: F403

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
THROTTLE_PREFIX = "django:test:throttle"
