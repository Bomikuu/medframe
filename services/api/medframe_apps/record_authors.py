from django.db.models import Q

from medframe_apps.accounts.models import User
from medframe_apps.documents.models import DocumentVersion
from medframe_apps.encounters.models import Encounter
from medframe_apps.patients.models import PatientEvent
from medframe_apps.patients.services import require_patient, scoped_patients


def record_authors(user, organization_id, patient_id=None):
    allowed = scoped_patients(user, organization_id, "patients.clinical.read")
    if patient_id:
        require_patient(user, organization_id, patient_id, "patients.clinical.read")
        allowed = allowed.filter(id=patient_id)
    patient_ids = allowed.values("id")
    providers = Encounter.objects.filter(
        organization_id=organization_id, patient_id__in=patient_ids
    ).values("provider__membership__user_id")
    uploaders = DocumentVersion.objects.filter(
        document__organization_id=organization_id,
        document__patient_id__in=patient_ids,
        document__purpose="clinical",
    ).values("uploaded_by_id")
    actors = PatientEvent.objects.filter(
        organization_id=organization_id, patient_id__in=patient_ids
    ).values("actor_id")
    identities = User.objects.filter(
        Q(id__in=providers) | Q(id__in=uploaders) | Q(id__in=actors) | Q(id=user.id)
    )
    return [
        {"value": str(item.id), "label": item.display_name or "Recorded author"}
        for item in identities.order_by("display_name", "id")[:50]
    ]
