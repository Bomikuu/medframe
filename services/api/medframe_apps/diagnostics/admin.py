from config.admin import ScopedReadOnlyAdmin, site
from medframe_apps.diagnostics.models import DiagnosticCenter, DiagnosticPartnership

site.register(DiagnosticCenter, ScopedReadOnlyAdmin)
site.register(DiagnosticPartnership, ScopedReadOnlyAdmin)
