from django.conf import settings
from django.contrib.admin import AdminSite, ModelAdmin
from django.http import HttpResponseRedirect

from medframe_apps.organizations.models import Branch, Organization


class OperationsAdminSite(AdminSite):
    site_header = "Medframe operations"
    site_title = "Medframe operations"

    def has_permission(self, request):
        return (
            request.user.is_active
            and request.user.is_staff
            and request.session.get("mfa_verified", False)
            and request.session.get("auth_realm", "staff") == "staff"
        )

    def login(self, request, extra_context=None):
        return HttpResponseRedirect(settings.WEB_ORIGIN + "/login")


class ScopedReadOnlyAdmin(ModelAdmin):
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        organizations = Organization.objects.filter(
            membership__user=request.user,
            membership__active=True,
            active=True,
            membership__roles__permissions__codename="organization.manage",
        )
        return queryset.filter(
            **(
                {"id__in": organizations}
                if self.model is Organization
                else {"organization__in": organizations}
            )
        ).distinct()

    def has_view_permission(self, request, obj=None):
        return self.admin_site.has_permission(request) and (
            obj is None or self.get_queryset(request).filter(pk=obj.pk).exists()
        )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


site = OperationsAdminSite(name="operations")
site.register(Organization, ScopedReadOnlyAdmin)
site.register(Branch, ScopedReadOnlyAdmin)
