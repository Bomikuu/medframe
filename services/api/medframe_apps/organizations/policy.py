from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q

from config.errors import DomainError
from medframe_apps.organizations.models import Membership, Role
from medframe_apps.patients.role_defaults import PATIENT_ROLE_PERMISSIONS

ROLE_PERMISSIONS = {
    "platform_administrator": {"workspace.read"},
    "clinic_administrator": {"workspace.read", "organization.manage"},
    "doctor": {"workspace.read"},
    "dentist": {"workspace.read"},
    "nurse": {"workspace.read"},
    "receptionist": {"workspace.read"},
    "patient": set(),
}
for permission, roles in PATIENT_ROLE_PERMISSIONS.items():
    for role in roles:
        ROLE_PERMISSIONS[role].add(permission)
for role in ("doctor", "dentist"):
    ROLE_PERMISSIONS[role].update({"encounters.write", "treatments.write", "documents.write"})


def seed_roles():
    content_type = ContentType.objects.get_for_model(Membership)
    for name, codenames in ROLE_PERMISSIONS.items():
        role, created = Role.objects.get_or_create(name=name)
        permissions = [
            Permission.objects.get_or_create(
                content_type=content_type,
                codename=code,
                defaults={"name": code},
            )[0]
            for code in codenames
        ]
        if created:
            role.permissions.set(permissions)


def permissions_for(membership):
    return set(membership.roles.values_list("permissions__codename", flat=True)) - {None}


def require_membership(user, organization_id, permission):
    if not user.is_authenticated or not user.is_active:
        raise DomainError("UNAUTHENTICATED", "Sign in to continue.", 401)
    membership = (
        Membership.objects.filter(
            user=user,
            user__is_active=True,
            organization_id=organization_id,
            active=True,
            organization__active=True,
            roles__permissions__codename=permission,
        )
        .select_related("organization", "branch")
        .first()
    )
    if membership is None:
        raise DomainError("FORBIDDEN", "You do not have access to this workspace.", 403)
    return membership


def eligible_memberships(organization_id, branch_id):
    return (
        Membership.objects.filter(
            Q(branch_id=branch_id) | Q(branch__isnull=True),
            organization_id=organization_id,
            active=True,
            user__is_active=True,
            roles__permissions__codename="patients.clinical.read",
        )
        .select_related("user", "branch")
        .distinct()
    )
