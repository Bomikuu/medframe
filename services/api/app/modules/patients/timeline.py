import base64
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy import select, tuple_

from app.core.errors import DomainError
from app.modules.audit.service import append_event
from app.modules.patients.models import PatientEvent
from app.modules.patients.policy import (
    effective_permissions,
    require_patient,
    resolve_patient_scope,
)
from app.modules.patients.search import check_page


@dataclass
class PatientEventPage:
    items: list[PatientEvent]
    end_cursor: str | None
    has_next_page: bool


async def list_patient_events(
    db, principal, context, organization_id, patient_id, first=20, after=None
):
    check_page(first)
    await require_patient(db, principal, organization_id, patient_id, "patients.demographics.read")
    scope = await resolve_patient_scope(
        db, principal, organization_id, "patients.demographics.read"
    )
    permissions = await effective_permissions(db, scope.membership_id)
    actions = ["registered", "demographics.updated"]
    if "patients.clinical.read" in permissions:
        # Permission alone is insufficient even when directory permission is also held.
        try:
            await require_patient(
                db, principal, organization_id, patient_id, "patients.clinical.read"
            )
            actions.append("clinical.updated")
        except DomainError:
            pass
    if "patients.access.manage" in permissions:
        actions.extend(["access.granted", "access.revoked"])
    query = select(PatientEvent).where(
        PatientEvent.patient_id == patient_id,
        PatientEvent.organization_id == organization_id,
        PatientEvent.action.in_(actions),
    )
    if after:
        try:
            timestamp, identifier = base64.urlsafe_b64decode(after.encode()).decode().split("|")
            value = datetime.fromisoformat(timestamp)
            if value.tzinfo is None:
                raise ValueError("timezone")
            query = query.where(
                tuple_(PatientEvent.created_at, PatientEvent.id) < tuple_(value, UUID(identifier))
            )
        except Exception:
            raise DomainError("INVALID_INPUT", "Use a valid timeline cursor.") from None
    rows = list(
        await db.scalars(
            query.order_by(PatientEvent.created_at.desc(), PatientEvent.id.desc()).limit(first + 1)
        )
    )
    items = rows[:first]
    cursor = (
        base64.urlsafe_b64encode(
            f"{items[-1].created_at.isoformat()}|{items[-1].id}".encode()
        ).decode()
        if items
        else None
    )
    await append_event(db, principal, context, "patient.timeline.read", organization_id, patient_id)
    return PatientEventPage(items, cursor, len(rows) > first)
