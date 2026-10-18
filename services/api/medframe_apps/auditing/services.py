from contextvars import ContextVar

from medframe_apps.auditing.models import AuditEvent

request_id = ContextVar("request_id", default="system")


def audit(user, action, organization_id=None, resource_id=None, outcome="success"):
    return AuditEvent.objects.create(
        actor_id=user.pk if user and user.is_authenticated else None,
        organization_id=organization_id,
        resource_id=resource_id,
        action=action,
        outcome=outcome,
        request_id=request_id.get(),
    )
