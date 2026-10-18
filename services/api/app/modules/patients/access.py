from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select

from app.core.database import utcnow
from app.core.errors import DomainError
from app.modules.audit.service import append_event
from app.modules.identity.models import User
from app.modules.organizations.models import Branch, Membership
from app.modules.patients.events import record_event
from app.modules.patients.models import PatientAccessGrant
from app.modules.patients.policy import eligible_memberships, require_patient
from app.modules.patients.search import check_page


@dataclass
class AssigneeSummary:
    membership_id: UUID
    display_name: str
    branch_label: str
    active: bool


async def summaries(db, memberships, grants=None):
    result = []
    for membership in memberships:
        user = await db.get(User, membership.user_id)
        branch = await db.get(Branch, membership.branch_id) if membership.branch_id else None
        result.append(
            AssigneeSummary(
                membership.id,
                user.display_name,
                branch.name if branch else "All branches",
                grants.get(membership.id, False) if grants is not None else True,
            )
        )
    return result


async def list_eligible_assignees(
    db, principal, context, organization_id, patient_id, query="", first=20
):
    check_page(first)
    patient = await require_patient(
        db, principal, organization_id, patient_id, "patients.access.manage"
    )
    if len(query) > 160:
        raise DomainError("INVALID_INPUT", "Search must be 160 characters or fewer.")
    statement = eligible_memberships(organization_id, patient.branch_id)
    if query.strip():
        term = query.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        statement = statement.where(User.display_name.ilike(f"%{term}%", escape="\\"))
    members = list(
        await db.scalars(statement.order_by(User.display_name, Membership.id).limit(first))
    )
    await append_event(
        db, principal, context, "patient.assignees.read", organization_id, patient_id
    )
    return await summaries(db, members)


async def list_patient_grants(db, principal, context, organization_id, patient_id):
    await require_patient(db, principal, organization_id, patient_id, "patients.access.manage")
    grants = list(
        await db.scalars(
            select(PatientAccessGrant).where(
                PatientAccessGrant.patient_id == patient_id,
                PatientAccessGrant.organization_id == organization_id,
            )
        )
    )
    members = (
        list(
            await db.scalars(
                select(Membership).where(Membership.id.in_([g.membership_id for g in grants]))
            )
        )
        if grants
        else []
    )
    await append_event(db, principal, context, "patient.access.read", organization_id, patient_id)
    return await summaries(db, members, {g.membership_id: g.active for g in grants})


async def set_patient_access(
    db, principal, context, organization_id, patient_id, membership_id, active
):
    patient = await require_patient(
        db, principal, organization_id, patient_id, "patients.access.manage", lock=True
    )
    eligible = await db.scalar(
        eligible_memberships(organization_id, patient.branch_id).where(
            Membership.id == membership_id
        )
    )
    grant = await db.scalar(
        select(PatientAccessGrant)
        .where(
            PatientAccessGrant.patient_id == patient_id,
            PatientAccessGrant.membership_id == membership_id,
        )
        .with_for_update()
    )
    # Allow revoking an existing grant after its assignee becomes ineligible.
    if not eligible and (active or grant is None):
        raise DomainError("INVALID_INPUT", "Choose an active clinician in this clinic and branch.")
    if grant is None:
        grant = PatientAccessGrant(
            organization_id=organization_id,
            patient_id=patient_id,
            membership_id=membership_id,
            granted_by=principal.user_id,
            active=active,
        )
        db.add(grant)
    elif grant.active == active:
        return (
            await summaries(db, [await db.get(Membership, membership_id)], {membership_id: active})
        )[0]
    grant.active = active
    grant.updated_at = utcnow()
    grant.granted_by = principal.user_id if active else grant.granted_by
    grant.revoked_by = None if active else principal.user_id
    await record_event(
        db,
        principal,
        context,
        patient,
        "access.granted" if active else "access.revoked",
        target_membership_id=membership_id,
    )
    return (
        await summaries(db, [await db.get(Membership, membership_id)], {membership_id: active})
    )[0]
