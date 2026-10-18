from django.db import models
from django.utils import timezone

from medframe_apps.common import Record


class Patient(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    branch = models.ForeignKey("organizations.Branch", on_delete=models.PROTECT)
    reference = models.CharField(max_length=32)
    full_name = models.CharField(max_length=160)
    date_of_birth = models.DateField(null=True)
    sex = models.CharField(max_length=20, default="not_recorded")
    email = models.EmailField(max_length=254, null=True)
    phone = models.CharField(max_length=40, null=True)
    address = models.CharField(max_length=500, null=True)
    emergency_contact_name = models.CharField(max_length=160, null=True)
    emergency_contact_phone = models.CharField(max_length=40, null=True)
    emergency_contact_relationship = models.CharField(max_length=160, null=True)
    guardian_name = models.CharField(max_length=160, null=True)
    guardian_phone = models.CharField(max_length=40, null=True)
    guardian_relationship = models.CharField(max_length=160, null=True)
    registered_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    version = models.PositiveIntegerField(default=1)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "reference"], name="patient_reference_org"
            ),
            models.CheckConstraint(
                condition=models.Q(version__gt=0), name="patient_positive_version"
            ),
            models.CheckConstraint(
                condition=models.Q(sex__in=["female", "male", "intersex", "not_recorded"]),
                name="patient_sex",
            ),
        ]
        indexes = [models.Index(fields=["organization", "id"])]


class PatientAccessGrant(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT, related_name="access_grants")
    membership = models.ForeignKey("organizations.Membership", on_delete=models.PROTECT)
    active = models.BooleanField(default=True)
    granted_by = models.ForeignKey(
        "accounts.User", on_delete=models.PROTECT, related_name="granted_patient_access"
    )
    revoked_by = models.ForeignKey(
        "accounts.User", on_delete=models.PROTECT, null=True, related_name="revoked_patient_access"
    )
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["patient", "membership"], name="patient_grant_membership"
            )
        ]


class PatientClinicalRevision(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT)
    version = models.PositiveIntegerField()
    author = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    medical_history = models.TextField(default="")
    conditions = models.TextField(default="")
    past_procedures = models.TextField(default="")
    allergy_state = models.CharField(max_length=20, default="unreviewed")
    allergies = models.JSONField(default=list)
    medication_state = models.CharField(max_length=20, default="unreviewed")
    medications = models.JSONField(default=list)
    reason = models.CharField(max_length=240, default="")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["patient", "version"], name="patient_clinical_version")
        ]


class PatientEvent(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT)
    action = models.CharField(max_length=60)
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    revision = models.ForeignKey(PatientClinicalRevision, on_delete=models.PROTECT, null=True)
    target_membership = models.ForeignKey(
        "organizations.Membership", on_delete=models.PROTECT, null=True
    )

    class Meta:
        indexes = [models.Index(fields=["patient", "-created_at", "-id"])]


class PatientRegistrationRequest(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    request_id = models.UUIDField()
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT)
    input_digest = models.CharField(max_length=64)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "actor", "request_id"], name="patient_registration_request"
            )
        ]
