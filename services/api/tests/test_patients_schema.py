from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.database import session_factory
from app.modules.organizations.models import Membership
from app.modules.patients.models import Patient, PatientAccessGrant


async def test_patient_branch_and_grant_cannot_cross_tenants(staff):
    async with session_factory() as db:
        membership = await db.scalar(select(Membership))
        org_id, branch_id = membership.organization_id, membership.branch_id
    with pytest.raises(IntegrityError):
        async with session_factory.begin() as db:
            db.add(
                Patient(
                    organization_id=uuid4(),
                    branch_id=branch_id,
                    full_name="Synthetic patient",
                    reference="MFP-TEST",
                    registered_by=membership.user_id,
                )
            )
            await db.flush()
    async with session_factory.begin() as db:
        patient = Patient(
            organization_id=org_id,
            branch_id=branch_id,
            full_name="Synthetic patient",
            reference="MFP-TEST",
            registered_by=membership.user_id,
        )
        db.add(patient)
        await db.flush()
        patient_id = patient.id
    with pytest.raises(IntegrityError):
        async with session_factory.begin() as db:
            db.add(
                PatientAccessGrant(
                    organization_id=uuid4(),
                    patient_id=patient_id,
                    membership_id=membership.id,
                    granted_by=membership.user_id,
                )
            )
            await db.flush()
