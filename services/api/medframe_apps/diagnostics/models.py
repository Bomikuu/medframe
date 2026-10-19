from django.db import models

from medframe_apps.common import Record


class DiagnosticCenter(Record):
    organization = models.OneToOneField("organizations.Organization", on_delete=models.PROTECT)
    name = models.CharField(max_length=160)
    kind = models.CharField(max_length=24, default="diagnostic")
    modalities = models.JSONField(default=list)
    address = models.CharField(max_length=500, default="")
    accepting = models.BooleanField(default=True)
    version = models.PositiveIntegerField(default=1)


class DiagnosticPartnership(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    center = models.ForeignKey(DiagnosticCenter, on_delete=models.PROTECT)
    active = models.BooleanField(default=True)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["organization", "center"], name="diagnostic_partner")
        ]


class PartnershipEvent(Record):
    partnership = models.ForeignKey(DiagnosticPartnership, on_delete=models.PROTECT)
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    active = models.BooleanField()
    reason = models.CharField(max_length=240)


class DiagnosticRequest(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    branch = models.ForeignKey("organizations.Branch", on_delete=models.PROTECT)
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT)
    encounter = models.ForeignKey("encounters.Encounter", on_delete=models.PROTECT, null=True)
    provider = models.ForeignKey("providers.ProviderProfile", on_delete=models.PROTECT)
    number = models.CharField(max_length=32)
    version = models.PositiveIntegerField(default=1)
    state = models.CharField(max_length=24, default="draft")
    sharing = models.BooleanField(default=True)
    details = models.JSONField(default=dict)
    package = models.JSONField(default=dict)
    assignment = models.ForeignKey(
        "DiagnosticAssignment", on_delete=models.PROTECT, null=True, related_name="current_requests"
    )
    current_result = models.ForeignKey(
        "ResultRevision", on_delete=models.PROTECT, null=True, related_name="current_requests"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "number"], name="diagnostic_request_number"
            )
        ]


class RequestRevision(Record):
    request = models.ForeignKey(DiagnosticRequest, on_delete=models.PROTECT)
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    snapshot = models.JSONField()


class RequestAttachment(Record):
    request = models.ForeignKey(DiagnosticRequest, on_delete=models.PROTECT)
    version = models.ForeignKey("documents.DocumentVersion", on_delete=models.PROTECT)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["request", "version"], name="diagnostic_request_file")
        ]


class DiagnosticAssignment(Record):
    request = models.ForeignKey(
        DiagnosticRequest, on_delete=models.PROTECT, related_name="assignments"
    )
    partnership = models.ForeignKey(DiagnosticPartnership, on_delete=models.PROTECT)
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    reason = models.CharField(max_length=240, default="")
    accepted_at = models.DateTimeField(null=True)
    performed_at = models.DateTimeField(null=True)
    active = models.BooleanField(default=True)


class DiagnosticEvent(Record):
    request = models.ForeignKey(DiagnosticRequest, on_delete=models.PROTECT, related_name="events")
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    action = models.CharField(max_length=32)
    reason = models.CharField(max_length=240, default="")
    version = models.PositiveIntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["request", "version"], name="diagnostic_event_version")
        ]


class ResultDraft(Record):
    assignment = models.OneToOneField(DiagnosticAssignment, on_delete=models.PROTECT)
    version = models.PositiveIntegerField(default=1)
    report = models.TextField(default="")
    accession = models.CharField(max_length=120, default="")
    reason = models.CharField(max_length=240, default="")


class ResultDraftAttachment(Record):
    draft = models.ForeignKey(ResultDraft, on_delete=models.PROTECT, related_name="attachments")
    version = models.OneToOneField("documents.DocumentVersion", on_delete=models.PROTECT)


class ResultRevision(Record):
    request = models.ForeignKey(DiagnosticRequest, on_delete=models.PROTECT, related_name="results")
    assignment = models.ForeignKey(DiagnosticAssignment, on_delete=models.PROTECT)
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    sequence = models.PositiveIntegerField()
    report = models.TextField()
    accession = models.CharField(max_length=120, default="")
    reason = models.CharField(max_length=240, default="")
    performed_at = models.DateTimeField()
    manifest = models.JSONField(default=list)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["request", "sequence"], name="diagnostic_result_sequence"
            )
        ]


class ResultAttachment(Record):
    result = models.ForeignKey(ResultRevision, on_delete=models.PROTECT, related_name="attachments")
    version = models.ForeignKey("documents.DocumentVersion", on_delete=models.PROTECT)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["result", "version"], name="diagnostic_result_file")
        ]


class ResultReview(Record):
    result = models.OneToOneField(ResultRevision, on_delete=models.PROTECT, related_name="review")
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    interpretation = models.TextField()
    next_steps = models.TextField(default="")
