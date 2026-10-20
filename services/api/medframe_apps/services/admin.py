from django.contrib import admin

from medframe_apps.services.models import PatientServiceCase, ServiceCaseEvent, ServiceDefinition


@admin.register(ServiceDefinition, PatientServiceCase, ServiceCaseEvent)
class ServiceAuditAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
