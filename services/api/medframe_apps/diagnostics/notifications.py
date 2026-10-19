from config.errors import DomainError
from medframe_apps.auditing.models import Notification
from medframe_apps.organizations.models import Membership
from medframe_apps.patients.services import require_patient


def notify_reviewers(row):
    members = (
        Membership.objects.filter(
            organization_id=row.organization_id,
            active=True,
            user__is_active=True,
            roles__permissions__codename="diagnostics.review",
        )
        .select_related("user")
        .distinct()
    )
    for member in members.iterator():
        try:
            require_patient(
                member.user, row.organization_id, row.patient_id, "patients.clinical.read"
            )
        except DomainError:
            continue
        Notification.objects.create(
            user=member.user,
            organization_id=row.organization_id,
            kind="diagnostic_result",
            resource_id=row.id,
        )
