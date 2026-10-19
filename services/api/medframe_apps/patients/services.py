"""Patient services authorize before discovery and serialize writes on the patient."""

import base64
import hashlib
import secrets
from datetime import datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from django.core import signing
from django.db import transaction
from django.db.models import Max, Q
from django.db.models.functions import Lower
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.auditing.models import AuditEvent
from medframe_apps.auditing.services import audit
from medframe_apps.common import advisory_lock, check_page, check_version
from medframe_apps.organizations.models import Branch, Membership
from medframe_apps.organizations.policy import (
    eligible_memberships,
    permissions_for,
    require_membership,
)
from medframe_apps.patients.models import (
    Patient,
    PatientAccessGrant,
    PatientClinicalRevision,
    PatientEvent,
    PatientRegistrationRequest,
)


def scoped_patients(user, organization_id, permission="patients.demographics.read"):
    member = require_membership(user, organization_id, permission)
    permissions = permissions_for(member)
    queryset = Patient.objects.filter(organization_id=organization_id)
    if member.branch_id:
        queryset = queryset.filter(branch_id=member.branch_id)
    from medframe_apps.stations.context import current_request

    request = current_request.get()
    credential = getattr(request, "station_credential", None) if request else None
    if credential:
        queryset = queryset.filter(branch_id=credential.device.branch_id)
    directory = not permission.startswith("patients.clinical.") and bool(
        {"patients.directory.manage", "patients.access.manage"} & permissions
    )
    if not directory:
        if "patients.clinical.read" not in permissions:
            return queryset.none()
        queryset = queryset.filter(access_grants__membership=member, access_grants__active=True)
    return queryset


def require_patient(user, organization_id, patient_id, permission, *, lock=False):
    queryset = scoped_patients(user, organization_id, permission)
    if lock:
        queryset = queryset.select_for_update(of=("self",))
    patient = queryset.filter(id=patient_id).first()
    # A revocation may have committed while this transaction waited for the row.
    if patient is None or (
        lock
        and not scoped_patients(user, organization_id, permission).filter(id=patient_id).exists()
    ):
        raise DomainError("NOT_FOUND", "Patient is unavailable or you do not have access.", 404)
    return patient


def record_event(user, patient, action, revision_id=None, target_membership_id=None):
    event = PatientEvent.objects.create(
        organization_id=patient.organization_id,
        patient=patient,
        actor=user,
        action=action,
        revision_id=revision_id,
        target_membership_id=target_membership_id,
    )
    audit(user, "patient." + action, patient.organization_id, patient.id)
    return event


def validate_birth_date(data, organization):
    today = datetime.now(ZoneInfo(organization.timezone)).date()
    if data.date_of_birth and data.date_of_birth > today:
        raise DomainError("INVALID_INPUT", "Date of birth cannot be in the future.")


@transaction.atomic
def register_patient(user, organization_id, data):
    member = require_membership(user, organization_id, "patients.register")
    branch = Branch.objects.filter(id=data.branch_id, organization_id=organization_id).first()
    if branch is None or (member.branch_id and member.branch_id != branch.id):
        raise DomainError("FORBIDDEN", "Choose an authorized branch.", 403)
    validate_birth_date(data, member.organization)
    digest = hashlib.sha256(data.model_dump_json().encode()).hexdigest()
    advisory_lock(f"{organization_id}:{user.id}:{data.request_id}")
    previous = PatientRegistrationRequest.objects.filter(
        organization_id=organization_id,
        actor=user,
        request_id=data.request_id,
    ).first()
    if previous:
        if previous.input_digest != digest:
            raise DomainError(
                "CONFLICT", "This registration was already submitted with different details.", 409
            )
        return require_patient(
            user, organization_id, previous.patient_id, "patients.demographics.read"
        )
    patient = Patient.objects.create(
        organization_id=organization_id,
        branch=branch,
        registered_by=user,
        reference="MFP-" + base64.b32encode(secrets.token_bytes(10)).decode()[:16],
        **data.model_dump(exclude={"branch_id", "request_id"}),
    )
    if "patients.clinical.write" in permissions_for(member):
        PatientAccessGrant.objects.create(
            organization_id=organization_id,
            patient=patient,
            membership=member,
            granted_by=user,
        )
    PatientRegistrationRequest.objects.create(
        organization_id=organization_id,
        actor=user,
        request_id=data.request_id,
        patient=patient,
        input_digest=digest,
    )
    record_event(user, patient, "registered")
    return patient


@transaction.atomic
def update_demographics(user, organization_id, patient_id, data):
    patient = require_patient(
        user, organization_id, patient_id, "patients.demographics.write", lock=True
    )
    check_version(patient.version, data.expected_version)
    validate_birth_date(data, patient.organization)
    for field, value in data.model_dump(exclude={"expected_version"}).items():
        setattr(patient, field, value)
    patient.version += 1
    patient.updated_at = timezone.now()
    patient.save()
    record_event(user, patient, "demographics.updated")
    return patient


@transaction.atomic
def save_clinical_history(user, organization_id, patient_id, data):
    patient = require_patient(
        user, organization_id, patient_id, "patients.clinical.write", lock=True
    )
    latest = PatientClinicalRevision.objects.filter(patient=patient).order_by("-version").first()
    check_version(latest.version if latest else 0, data.expected_version)
    revision = PatientClinicalRevision.objects.create(
        organization_id=organization_id,
        patient=patient,
        author=user,
        version=data.expected_version + 1,
        **data.model_dump(exclude={"expected_version"}),
    )
    record_event(user, patient, "clinical.updated", revision.id)
    return revision


@transaction.atomic
def search_patients(user, organization_id, query="", first=20, after=None):
    check_page(first)
    if len(query) > 160:
        raise DomainError("INVALID_INPUT", "Search must be 160 characters or fewer.")
    queryset = scoped_patients(user, organization_id)
    if query.strip():
        queryset = queryset.filter(
            Q(full_name__icontains=query.strip()) | Q(reference__istartswith=query.strip())
        )
    total = queryset.count()
    if after:
        queryset = queryset.filter(id__gt=after)
    rows = list(queryset.order_by("id")[: first + 1])
    audit(user, "patient.directory.read", organization_id)
    return rows[:first], len(rows) > first, total


@transaction.atomic
def patient_directory(
    user, organization_id, query="", first=20, after=None, sort="name_asc", branch_id=None
):
    """Query-bound keyset pagination over the current authorized demographic scope."""
    check_page(first)
    query = query.strip()
    if len(query) > 160 or sort not in {"name_asc", "name_desc", "reference"}:
        raise DomainError("INVALID_INPUT", "Choose a valid directory search and order.")
    member = require_membership(user, organization_id, "patients.demographics.read")
    grants = list(
        PatientAccessGrant.objects.filter(membership=member, active=True)
        .order_by("id")
        .values_list("patient_id", flat=True)
    )
    scope = hashlib.sha256(
        str(
            (
                str(member.id),
                str(member.branch_id),
                sorted(permissions_for(member)),
                [str(value) for value in grants],
            )
        ).encode()
    ).hexdigest()
    binding = {
        "user": str(user.id),
        "organization": str(organization_id),
        "query": query,
        "sort": sort,
        "branch": str(branch_id or ""),
        "scope": scope,
    }
    queryset = scoped_patients(user, organization_id)
    if branch_id:
        queryset = queryset.filter(branch_id=branch_id)
    if query:
        queryset = queryset.filter(Q(full_name__icontains=query) | Q(reference__istartswith=query))
    total = queryset.count()
    field = "reference" if sort == "reference" else "full_name"
    queryset = queryset.annotate(directory_key=Lower(field))
    descending = sort == "name_desc"
    if after:
        try:
            cursor = signing.loads(after, salt="medframe.patient-directory", max_age=3600)
            if cursor["binding"] != binding:
                raise ValueError("Directory scope changed")
            identifier = UUID(cursor["id"])
            key = cursor["key"]
            if not isinstance(key, str):
                raise ValueError("Invalid directory key")
        except (signing.BadSignature, ValueError, KeyError, TypeError):
            raise DomainError(
                "INVALID_INPUT", "The directory changed. Return to its first page."
            ) from None
        comparison = "directory_key__lt" if descending else "directory_key__gt"
        queryset = queryset.filter(Q(**{comparison: key}) | Q(directory_key=key, id__gt=identifier))
    rows = list(
        queryset.order_by("-directory_key" if descending else "directory_key", "id")[: first + 1]
    )
    items = rows[:first]
    cursor = (
        signing.dumps(
            {"binding": binding, "key": items[-1].directory_key, "id": str(items[-1].id)},
            salt="medframe.patient-directory",
            compress=True,
        )
        if len(rows) > first and items
        else None
    )
    audit(user, "patient.directory.read", organization_id)
    return items, cursor, len(rows) > first, total


@transaction.atomic
def recent_patients(user, organization_id):
    allowed = scoped_patients(user, organization_id)
    recent = (
        AuditEvent.objects.filter(
            actor=user,
            organization_id=organization_id,
            action="patient.read",
            resource_id__in=allowed.values("id"),
        )
        .values("resource_id")
        .annotate(accessed=Max("created_at"))
        .order_by("-accessed", "resource_id")[:5]
    )
    ids = [row["resource_id"] for row in recent]
    by_id = {patient.id: patient for patient in allowed.filter(id__in=ids)}
    audit(user, "patient.recent.read", organization_id)
    return [by_id[identifier] for identifier in ids]


@transaction.atomic
def patient_timeline(user, organization_id, patient_id, first=20, after=None):
    check_page(first)
    require_patient(user, organization_id, patient_id, "patients.demographics.read")
    member = require_membership(user, organization_id, "patients.demographics.read")
    actions = ["registered", "demographics.updated"]
    try:
        require_patient(user, organization_id, patient_id, "patients.clinical.read")
        actions += [
            "clinical.updated",
            "encounter.created",
            "encounter.finalized",
            "encounter.amended",
            "document.clean",
        ]
    except DomainError:
        pass
    if "patients.access.manage" in permissions_for(member):
        actions += ["access.granted", "access.revoked"]
    queryset = PatientEvent.objects.filter(
        patient_id=patient_id, organization_id=organization_id, action__in=actions
    ).select_related("actor", "encountertimelinelink__revision")
    if after:
        try:
            timestamp, identifier = base64.urlsafe_b64decode(after.encode()).decode().split("|")
            value = datetime.fromisoformat(timestamp)
            if value.tzinfo is None:
                raise ValueError("timezone")
            queryset = queryset.filter(
                Q(created_at__lt=value) | Q(created_at=value, id__lt=UUID(identifier))
            )
        except (ValueError, TypeError):
            raise DomainError("INVALID_INPUT", "Use a valid timeline cursor.") from None
    rows = list(queryset.order_by("-created_at", "-id")[: first + 1])
    items = rows[:first]
    cursor = (
        base64.urlsafe_b64encode(
            f"{items[-1].created_at.isoformat()}|{items[-1].id}".encode()
        ).decode()
        if items
        else None
    )
    audit(user, "patient.timeline.read", organization_id, patient_id)
    return items, cursor, len(rows) > first


def assignee(member, active=True):
    return {
        "membership_id": member.id,
        "display_name": member.user.display_name,
        "branch_label": member.branch.name if member.branch_id else "All branches",
        "active": active,
    }


@transaction.atomic
def set_patient_access(user, organization_id, patient_id, membership_id, active):
    patient = require_patient(
        user, organization_id, patient_id, "patients.access.manage", lock=True
    )
    member = (
        eligible_memberships(organization_id, patient.branch_id).filter(id=membership_id).first()
    )
    grant = (
        PatientAccessGrant.objects.select_for_update()
        .filter(patient=patient, membership_id=membership_id)
        .first()
    )
    if member is None and (active or grant is None):
        raise DomainError("INVALID_INPUT", "Choose an active clinician in this clinic and branch.")
    if grant is None:
        grant = PatientAccessGrant(
            organization_id=organization_id,
            patient=patient,
            membership_id=membership_id,
            granted_by=user,
        )
    elif grant.active == active:
        return assignee(grant.membership, active)
    grant.active = active
    grant.updated_at = timezone.now()
    if active:
        grant.granted_by = user
    grant.revoked_by = None if active else user
    grant.save()
    record_event(
        user,
        patient,
        "access.granted" if active else "access.revoked",
        target_membership_id=membership_id,
    )
    return assignee(
        member or Membership.objects.select_related("user", "branch").get(id=membership_id), active
    )
