from django.db import models

from medframe_apps.common import Record


class BillingSettings(Record):
    organization = models.OneToOneField("organizations.Organization", on_delete=models.PROTECT)
    currency = models.CharField(max_length=3, default="PHP")
    prefix = models.CharField(max_length=12, default="INV")
    next_number = models.PositiveBigIntegerField(default=1)
    version = models.PositiveIntegerField(default=1)


class Invoice(Record):
    organization = models.ForeignKey("organizations.Organization", on_delete=models.PROTECT)
    branch = models.ForeignKey("organizations.Branch", on_delete=models.PROTECT)
    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT)
    encounter = models.ForeignKey("encounters.Encounter", null=True, on_delete=models.PROTECT)
    number = models.CharField(max_length=40, null=True)
    currency = models.CharField(max_length=3, default="PHP")
    state = models.CharField(max_length=12, default="draft")
    due_date = models.DateField()
    discount_kind = models.CharField(max_length=12, default="fixed")
    discount_value = models.CharField(max_length=20, default="0")
    subtotal = models.PositiveBigIntegerField(default=0)
    discount = models.PositiveBigIntegerField(default=0)
    total = models.PositiveBigIntegerField(default=0)
    version = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    issued_by = models.ForeignKey(
        "accounts.User", null=True, on_delete=models.PROTECT, related_name="issued_invoices"
    )
    issued_at = models.DateTimeField(null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["organization", "number"], name="invoice_number_org"),
        ]
        indexes = [models.Index(fields=["organization", "branch", "-created_at", "-id"])]


class InvoiceLine(Record):
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="lines")
    position = models.PositiveIntegerField()
    description = models.CharField(max_length=240)
    kind = models.CharField(max_length=16)
    quantity = models.PositiveIntegerField()
    unit_amount = models.PositiveBigIntegerField()
    procedure = models.ForeignKey("treatments.Procedure", null=True, on_delete=models.PROTECT)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["invoice", "position"], name="invoice_line_position"),
        ]


class Payment(Record):
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="payments")
    amount = models.PositiveBigIntegerField()
    method = models.CharField(max_length=20)
    reference = models.CharField(max_length=120, default="")
    paid_date = models.DateField()
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT)


class Refund(Record):
    payment = models.ForeignKey(Payment, on_delete=models.PROTECT, related_name="refunds")
    amount = models.PositiveBigIntegerField()
    reason = models.CharField(max_length=500)
    paid_date = models.DateField()
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT)


class CreditNote(Record):
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="credits")
    amount = models.PositiveBigIntegerField()
    reason = models.CharField(max_length=500)
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT)


class FinancialEvent(Record):
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="events")
    actor = models.ForeignKey("accounts.User", on_delete=models.PROTECT)
    kind = models.CharField(max_length=32)
    request_key = models.UUIDField()
    reason = models.CharField(max_length=500, default="")
    payload = models.JSONField(default=dict)
