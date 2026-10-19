"""A patient portrait selects a same-patient, scanned image; original bytes stay private."""

from django.db import transaction
from django.db.models import F

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.common import check_version
from medframe_apps.documents.services import require_document
from medframe_apps.patients.services import require_patient
from medframe_apps.stations.models import PatientPortrait


def portrait_map(patient_ids):
    rows = PatientPortrait.objects.filter(
        patient_id__in=patient_ids,
        document_version__scan_state="clean",
        document_version__document__purpose="clinical",
        document_version__document__patient_id=F("patient_id"),
        document_version__content_type__in=["image/jpeg", "image/png", "image/webp"],
    )
    return {str(row.patient_id): str(row.document_version_id) for row in rows}


def current(request, organization_id, patient_id):
    patient = require_patient(request.user, organization_id, patient_id, "patients.clinical.read")
    row = PatientPortrait.objects.filter(patient=patient).first()
    return {
        "version": row.version if row else 0,
        "image_id": portrait_map([patient.id]).get(str(patient.id)),
    }


@transaction.atomic
def select(request, organization_id, patient_id, image_id, expected_version):
    patient = require_patient(
        request.user, organization_id, patient_id, "patients.clinical.write", lock=True
    )
    from medframe_apps.organizations.policy import require_membership

    require_membership(request.user, organization_id, "documents.write")
    row = PatientPortrait.objects.filter(patient=patient).first()
    check_version(row.version if row else 0, expected_version)
    image = None
    if image_id:
        image = require_document(request.user, organization_id, image_id)
        if (
            image.document.patient_id != patient.id
            or image.document.purpose != "clinical"
            or image.scan_state != "clean"
            or image.content_type not in {"image/jpeg", "image/png", "image/webp"}
            or image.size > 2 * 1024 * 1024
        ):
            raise DomainError(
                "INVALID_IMAGE", "Choose this patient's scanned image, no larger than 2MiB.", 409
            )
    if row:
        row.document_version = image
        row.updated_by = request.user
        row.version += 1
        row.save()
    else:
        row = PatientPortrait.objects.create(
            patient=patient, document_version=image, updated_by=request.user
        )
    audit(request.user, "patient.portrait.selected", organization_id, patient.id)
    return current(request, organization_id, patient_id)
