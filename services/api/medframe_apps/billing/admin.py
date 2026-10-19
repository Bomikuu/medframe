from config.admin import ScopedReadOnlyAdmin, site
from medframe_apps.billing.models import BillingSettings, Invoice
from medframe_apps.billing.policy import invoice_scope


class InvoiceAdmin(ScopedReadOnlyAdmin):
    list_display = ("number", "state", "currency", "created_at")

    def get_queryset(self, request):
        from medframe_apps.organizations.models import Membership

        members = Membership.objects.filter(
            user=request.user,
            active=True,
            organization__active=True,
            roles__permissions__codename="billing.read",
        ).distinct()
        query = Invoice.objects.none()
        for member in members:
            query = query | invoice_scope(member)
        return query


site.register(Invoice, InvoiceAdmin)
site.register(BillingSettings, ScopedReadOnlyAdmin)
