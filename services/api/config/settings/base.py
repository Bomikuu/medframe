"""Explicit Django configuration; the preserved source database is read-only input."""

import os
from pathlib import Path
from urllib.parse import unquote, urlsplit

from config.runtime import get_settings

BASE_DIR = Path(__file__).resolve().parents[2]
runtime = get_settings()
SECRET_KEY = runtime.app_secret.get_secret_value()
DEBUG = False
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver").split(",")
WEB_ORIGIN = runtime.web_origin
CSRF_TRUSTED_ORIGINS = [WEB_ORIGIN]
CSRF_COOKIE_NAME = "medframe_csrf"
CSRF_HEADER_NAME = "HTTP_X_CSRF_TOKEN"
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SECURE = runtime.cookie_secure
CSRF_FAILURE_VIEW = "config.views.csrf_failure"
SESSION_COOKIE_NAME = "medframe_django_session"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = runtime.cookie_secure
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_AGE = 8 * 3600
SESSION_ENGINE = "django.contrib.sessions.backends.db"
AUTH_USER_MODEL = "accounts.User"
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "medframe_apps.accounts.hashers.LegacyArgon2Hasher",
]
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 15},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
]
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "strawberry_django",
    "medframe_apps.accounts",
    "medframe_apps.organizations",
    "medframe_apps.patients",
    "medframe_apps.providers",
    "medframe_apps.auditing",
    "medframe_apps.branding",
    "medframe_apps.encounters",
    "medframe_apps.dental",
    "medframe_apps.treatments",
    "medframe_apps.documents",
    "medframe_apps.portal",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "config.middleware.RequestBoundaryMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "medframe_apps.accounts.middleware.ClinicalSessionMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]
ROOT_URLCONF = "config.urls"
ASGI_APPLICATION = "config.asgi.application"

source_url = urlsplit(runtime.database_url.get_secret_value().replace("+asyncpg", ""))
target_url = urlsplit(
    os.environ.get("DJANGO_DATABASE_URL", source_url._replace(path="/medframe_django").geturl())
)
if os.environ.get("DJANGO_DATABASE_NAME"):
    target_url = target_url._replace(path="/" + os.environ["DJANGO_DATABASE_NAME"])
if target_url.path == source_url.path and target_url.hostname == source_url.hostname:
    raise ValueError("DJANGO_DATABASE_URL must use a separate target database.")
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": unquote(target_url.path.lstrip("/")),
        "USER": unquote(target_url.username or ""),
        "PASSWORD": unquote(target_url.password or ""),
        "HOST": target_url.hostname,
        "PORT": target_url.port or 5432,
        "CONN_MAX_AGE": 0,
        "TEST": {"NAME": "medframe_django_test"},
    }
}
USE_TZ = True
TIME_ZONE = "UTC"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DATA_UPLOAD_MAX_MEMORY_SIZE = 65536
FILE_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
EMAIL_HOST = runtime.smtp_host
EMAIL_PORT = runtime.smtp_port
EMAIL_HOST_USER = runtime.smtp_username
EMAIL_HOST_PASSWORD = runtime.smtp_password.get_secret_value()
EMAIL_USE_TLS = runtime.smtp_start_tls
DEFAULT_FROM_EMAIL = runtime.mail_from
EMAIL_TIMEOUT = 10
CELERY_BROKER_URL = (
    runtime.celery_broker_url.get_secret_value()
    if runtime.celery_broker_url
    else runtime.redis_url.rsplit("/", 1)[0] + "/2"
)
CELERY_TASK_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_IGNORE_RESULT = True
CELERY_BEAT_SCHEDULE = {
    "private-recovery-mail": {
        "task": "medframe_apps.accounts.tasks.deliver_recovery_mail",
        "schedule": 10.0,
    },
}
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "endpoint_url": runtime.storage_endpoint,
            "access_key": runtime.storage_access_key,
            "secret_key": runtime.storage_secret_key.get_secret_value(),
            "bucket_name": runtime.storage_bucket,
            "region_name": "us-east-1",
            "default_acl": None,
            "querystring_auth": True,
            "file_overwrite": False,
            "addressing_style": "path",
            "object_parameters": {"CacheControl": "private, no-store"},
        },
    },
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"null": {"class": "logging.NullHandler"}},
    "loggers": {"django.request": {"handlers": ["null"], "propagate": False}},
}
LOGGING["loggers"]["django.server"] = {"handlers": ["null"], "propagate": False}
