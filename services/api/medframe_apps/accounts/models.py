from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models

from medframe_apps.common import Record


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        user = self.model(email=self.normalize_email(email).strip().lower(), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        return self.create_user(email, password, is_staff=True, is_superuser=True, **extra)


class User(Record, AbstractBaseUser, PermissionsMixin):
    password = models.CharField(max_length=1024)
    legacy_password_digest = models.CharField(max_length=64, default="", editable=False)
    email = models.EmailField(max_length=320, unique=True)
    display_name = models.CharField(max_length=160, default="")
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    auth_epoch = models.PositiveIntegerField(default=1)
    objects = UserManager()
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []


class MfaCredential(models.Model):
    user = models.OneToOneField(User, on_delete=models.PROTECT, primary_key=True)
    encrypted_secret = models.TextField()
    confirmed = models.BooleanField(default=False)
    last_step = models.BigIntegerField(default=-1)


class RecoveryCode(Record):
    user = models.ForeignKey(User, on_delete=models.PROTECT)
    code_hash = models.CharField(max_length=64, unique=True)
    consumed = models.BooleanField(default=False)


class ClinicalSession(Record):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    session_key = models.CharField(max_length=40, unique=True)
    last_seen_at = models.DateTimeField()
    expires_at = models.DateTimeField()
    revoked = models.BooleanField(default=False)


class PasswordReset(Record):
    user = models.ForeignKey(User, on_delete=models.PROTECT)
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    consumed = models.BooleanField(default=False)


class MailOutbox(Record):
    encrypted_payload = models.TextField()
    attempts = models.PositiveIntegerField(default=0)
    available_at = models.DateTimeField()
    sent_at = models.DateTimeField(null=True)


class ImportRun(Record):
    source_fingerprint = models.CharField(max_length=64, unique=True)
    counts = models.JSONField(default=dict)
    verified_at = models.DateTimeField(null=True)
