from django.db import transaction

from config.errors import DomainError
from medframe_apps.auditing.services import audit
from medframe_apps.common import check_version
from medframe_apps.encounters.template_starters import STARTERS
from medframe_apps.expansion_policy import require_native_staff
from medframe_apps.idempotency import record_request_result, replay_request
from medframe_apps.onboarding.models import MedicalSpecialty, OrganizationSpecialty
from medframe_apps.organizations.models import Organization
from medframe_apps.organizations.policy import require_membership
from medframe_apps.providers.models import SpecialtyConfiguration

LEGACY = {"general_medicine": "General medicine", "dentistry": "Dentistry", "other": "Other"}


def specialty_setup(request, organization_id):
    require_native_staff(request)
    require_membership(request.user, organization_id, "workspace.read")
    selected = list(
        OrganizationSpecialty.objects.filter(organization_id=organization_id)
        .values_list("specialty_id", flat=True)
        .order_by("specialty_id")
    )
    configuration = SpecialtyConfiguration.objects.filter(organization_id=organization_id).first()
    return {
        "version": configuration.version if configuration else 0,
        "selected": selected,
        "catalog": list(
            MedicalSpecialty.objects.order_by("category", "name").values(
                "code", "name", "category", "active"
            )
        ),
        "legacy": [{"code": code, "name": name} for code, name in LEGACY.items()],
        "starters": [item for item in STARTERS if item["specialty"] in selected],
        "starter_catalog": STARTERS,
        "starter_revision": 1,
    }


def validate_template_specialty(organization_id, code, previous=None):
    if code in LEGACY or code == previous:
        return
    if not OrganizationSpecialty.objects.filter(
        organization_id=organization_id, specialty_id=code, specialty__active=True
    ).exists():
        raise DomainError("INVALID_INPUT", "Choose a specialty enabled for this clinic.")


@transaction.atomic
def save_specialties(request, organization_id, codes, expected_version, request_id):
    require_native_staff(request)
    require_membership(request.user, organization_id, "organization.manage")
    if (
        not isinstance(codes, list)
        or len(codes) > 30
        or any(not isinstance(code, str) or len(code) > 48 for code in codes)
        or len(set(codes)) != len(codes)
        or type(expected_version) is not int
        or expected_version < 0
    ):
        raise DomainError("INVALID_INPUT", "Choose distinct supported clinic specialties.")
    values = {"codes": sorted(codes), "version": expected_version}
    Organization.objects.select_for_update().get(id=organization_id)
    if replay_request(request.user, organization_id, "specialties.save", request_id, values):
        return specialty_setup(request, organization_id)
    if MedicalSpecialty.objects.filter(code__in=codes, active=True).count() != len(codes):
        raise DomainError("INVALID_INPUT", "Choose active catalog specialties.")
    config = SpecialtyConfiguration.objects.filter(organization_id=organization_id).first()
    check_version(config.version if config else 0, expected_version)
    OrganizationSpecialty.objects.filter(organization_id=organization_id).exclude(
        specialty_id__in=codes
    ).delete()
    for code in codes:
        OrganizationSpecialty.objects.get_or_create(
            organization_id=organization_id, specialty_id=code
        )
    if config:
        config.version += 1
        config.save(update_fields=["version"])
    else:
        SpecialtyConfiguration.objects.create(organization_id=organization_id)
    record_request_result(
        request.user, organization_id, "specialties.save", request_id, values, organization_id
    )
    audit(request.user, "specialties.saved", organization_id, organization_id)
    return specialty_setup(request, organization_id)
