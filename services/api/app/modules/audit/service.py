from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.request_context import RequestContext
from app.modules.audit.models import AuditEvent
from app.modules.identity.schemas import Principal


async def append_event(
    db: AsyncSession,
    principal: Principal | None,
    context: RequestContext,
    action: str,
    organization_id: UUID | None = None,
    resource_id: UUID | None = None,
    outcome: str = "allowed",
) -> None:
    db.add(
        AuditEvent(
            actor_id=principal.user_id if principal else None,
            organization_id=organization_id,
            action=action,
            resource_id=resource_id,
            outcome=outcome,
            request_id=context.request_id,
        )
    )
    await db.flush()
