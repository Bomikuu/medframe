from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import func, or_, select

from app.core.errors import DomainError
from app.modules.audit.models import AuditEvent
from app.modules.audit.service import append_event
from app.modules.patients.models import Patient
from app.modules.patients.policy import resolve_patient_scope, scoped_patients


@dataclass
class PatientPage:
    items: list[Patient]
    end_cursor: UUID | None
    has_next_page: bool
    total_count: int


def check_page(first):
    if not 1 <= first <= 50:
        raise DomainError("INVALID_INPUT", "Choose a page size between 1 and 50.")


async def search_patients(db, principal, context, organization_id, query="", first=20, after=None):
    check_page(first)
    if len(query) > 160:
        raise DomainError("INVALID_INPUT", "Search must be 160 characters or fewer.")
    scope = await resolve_patient_scope(
        db, principal, organization_id, "patients.demographics.read"
    )
    statement = scoped_patients(scope)
    term = query.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    if term:
        statement = statement.where(
            or_(
                Patient.full_name.ilike(f"%{term}%", escape="\\"),
                Patient.reference.ilike(f"{term}%", escape="\\"),
            )
        )
    count = await db.scalar(select(func.count()).select_from(statement.subquery()))
    if after:
        statement = statement.where(Patient.id > after)
    rows = list(await db.scalars(statement.order_by(Patient.id).limit(first + 1)))
    items = rows[:first]
    await append_event(db, principal, context, "patient.directory.read", organization_id)
    return PatientPage(items, items[-1].id if items else None, len(rows) > first, count)


async def recent_patients(db, principal, context, organization_id):
    scope = await resolve_patient_scope(
        db, principal, organization_id, "patients.demographics.read"
    )
    allowed = scoped_patients(scope).subquery()
    recent = (
        select(
            AuditEvent.resource_id.label("patient_id"),
            func.max(AuditEvent.created_at).label("accessed"),
        )
        .where(
            AuditEvent.actor_id == principal.user_id,
            AuditEvent.organization_id == organization_id,
            AuditEvent.action == "patient.read",
        )
        .group_by(AuditEvent.resource_id)
        .subquery()
    )
    items = list(
        await db.scalars(
            select(Patient)
            .join(allowed, allowed.c.id == Patient.id)
            .join(recent, recent.c.patient_id == Patient.id)
            .order_by(recent.c.accessed.desc(), Patient.id)
            .limit(5)
        )
    )

    await append_event(db, principal, context, "patient.recent.read", organization_id)
    return items
