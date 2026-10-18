from .base import *  # noqa: F403

if runtime.app_env != "production":  # noqa: F405
    raise ValueError(
        "Production settings require APP_ENV=production and validated secure configuration"
    )
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
