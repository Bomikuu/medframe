from django.db import models

from medframe_apps.common import Record


class Document(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, null=True)
    encounter = models.ForeignKey("encounters.Encounter", on_delete=models.PROTECT, null=True)
    uploaded_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    purpose = models.CharField(max_length=20, default="clinical")
    label = models.CharField(max_length=120)


class DocumentVersion(Record):
    uploaded_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    document = models.ForeignKey(Document, on_delete=models.PROTECT, related_name="versions")
    version = models.PositiveIntegerField(default=1)
    key = models.CharField(max_length=200, unique=True)
    filename = models.CharField(max_length=160)
    content_type = models.CharField(max_length=64)
    expected_size = models.PositiveIntegerField()
    size = models.PositiveIntegerField(default=0)
    sha256 = models.CharField(max_length=64, default="")
    scan_state = models.CharField(max_length=20, default="uploading")
    scanned_at = models.DateTimeField(null=True)
    scan_attempts = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["document", "version"], name="document_version")
        ]
