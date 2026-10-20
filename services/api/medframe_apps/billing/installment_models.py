from django.db import models

from medframe_apps.common import Record


class InstallmentAgreement(Record):
    invoice = models.OneToOneField(
        "billing.Invoice", on_delete=models.PROTECT, related_name="installment"
    )
    case = models.OneToOneField(
        "services.PatientServiceCase", on_delete=models.PROTECT, related_name="agreement"
    )
    terms = models.JSONField()
    source_snapshot = models.JSONField()
    confirmed_at = models.DateTimeField(null=True)
    confirmed_by = models.ForeignKey("accounts.User", null=True, on_delete=models.PROTECT)
    confirmed_digest = models.CharField(max_length=64, default="")


class InstallmentObligation(Record):
    agreement = models.ForeignKey(
        InstallmentAgreement, on_delete=models.PROTECT, related_name="obligations"
    )
    position = models.PositiveSmallIntegerField()
    kind = models.CharField(max_length=12)
    due_date = models.DateField()
    amount = models.PositiveBigIntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["agreement", "position"], name="installment_position")
        ]
        ordering = ["position"]


class InvoiceLineServiceSource(Record):
    line = models.OneToOneField(
        "billing.InvoiceLine", on_delete=models.PROTECT, related_name="service_source"
    )
    service = models.ForeignKey("services.ServiceDefinition", on_delete=models.PROTECT)
    service_version = models.PositiveIntegerField()
    snapshot = models.JSONField()


class ServiceCaseInvoice(Record):
    case = models.OneToOneField(
        "services.PatientServiceCase", on_delete=models.PROTECT, related_name="billing_link"
    )
    invoice = models.ForeignKey(
        "billing.Invoice", on_delete=models.PROTECT, related_name="service_cases"
    )
