from django.contrib import admin

from config.admin import site
from medframe_apps.operations.models import (
    Appointment,
    BranchResource,
    ProviderSchedule,
    QueueTicket,
    ScheduleOverride,
)


class ReadOnlyOperations(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


for model in (Appointment, BranchResource, ProviderSchedule, QueueTicket, ScheduleOverride):
    site.register(model, ReadOnlyOperations)
