from uuid import UUID

import strawberry
from strawberry.scalars import JSON
from strawberry.types import Info

from medframe_apps.patients.services import require_patient
from medframe_apps.portal.invitations import issue_invitation, manage_patient, revoke_access
from medframe_apps.portal.models import PatientReport, PortalInvitation, PortalLink, PortalRelease
from medframe_apps.portal.records import release_details
from medframe_apps.portal.releases import preview_release, publish_release, withdraw_release
from medframe_apps.portal.reports import report_details, review_report
from medframe_apps.record_filters import page_records


def invitation_details(item):
    return {
        "id": str(item.id),
        "email": item.email,
        "relationship": item.relationship,
        "created_at": item.created_at.isoformat(),
        "expires_at": item.expires_at.isoformat(),
        "state": "claimed" if item.consumed_at else "revoked" if item.revoked_at else "pending",
    }


@strawberry.type
class PortalStaffQuery:
    @strawberry.field
    def patient_portal_access(
        self, info: Info, organization_id: UUID, patient_id: UUID, after: str | None = None
    ) -> JSON:
        from django.db import transaction

        with transaction.atomic():
            manage_patient(info.context.user, organization_id, patient_id)
        invitations = page_records(
            PortalInvitation.objects.filter(organization_id=organization_id, patient_id=patient_id),
            scope=f"portal-invites:{patient_id}",
            after=after,
            serialize=invitation_details,
        )
        links = [
            {
                "id": str(item.id),
                "display_name": item.user.display_name,
                "email": item.user.email,
                "relationship": item.relationship,
                "active": item.active,
                "version": item.version,
            }
            for item in PortalLink.objects.filter(
                organization_id=organization_id, patient_id=patient_id
            )
            .select_related("user")
            .order_by("-created_at")[:50]
        ]
        return {"invitations": invitations, "links": links}

    @strawberry.field
    def release_sources(self, info: Info, organization_id: UUID, patient_id: UUID) -> JSON:
        from medframe_apps.portal.sources import release_source_page

        pages = {
            kind: release_source_page(info.context.user, organization_id, patient_id, kind)
            for kind in ["encounters", "plans", "follow_ups", "documents", "diagnostics", "anatomy"]
        }
        return {
            **{kind: page["items"] for kind, page in pages.items()},
            "source_cursors": {kind: page["end_cursor"] for kind, page in pages.items()},
        }

    @strawberry.field
    def release_source_page(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID,
        kind: str,
        after: str | None = None,
    ) -> JSON:
        from medframe_apps.portal.sources import release_source_page

        return release_source_page(info.context.user, organization_id, patient_id, kind, after)

    @strawberry.field
    def patient_releases(
        self, info: Info, organization_id: UUID, patient_id: UUID, after: str | None = None
    ) -> JSON:
        require_patient(info.context.user, organization_id, patient_id, "patients.clinical.read")
        return page_records(
            PortalRelease.objects.filter(
                organization_id=organization_id, patient_id=patient_id
            ).select_related("author"),
            scope=f"staff-releases:{patient_id}",
            after=after,
            serialize=lambda item: release_details(item, content=True),
        )

    @strawberry.field
    def patient_reports(
        self, info: Info, organization_id: UUID, patient_id: UUID, after: str | None = None
    ) -> JSON:
        require_patient(info.context.user, organization_id, patient_id, "patients.clinical.read")
        return page_records(
            PatientReport.objects.filter(
                organization_id=organization_id, patient_id=patient_id
            ).select_related("author"),
            scope=f"staff-reports:{patient_id}",
            after=after,
            serialize=report_details,
        )


@strawberry.type
class PortalStaffMutation:
    @strawberry.mutation
    def issue_portal_invitation(
        self, info: Info, organization_id: UUID, patient_id: UUID, data: JSON, request_id: UUID
    ) -> JSON:
        return invitation_details(
            issue_invitation(info.context.user, organization_id, patient_id, data, request_id)
        )

    @strawberry.mutation
    def revoke_portal_access(
        self,
        info: Info,
        organization_id: UUID,
        identifier: UUID,
        kind: str,
        reason: str,
        expected_version: int = 1,
    ) -> bool:
        from config.errors import DomainError

        if kind not in {"link", "invitation"}:
            raise DomainError("INVALID_INPUT", "Choose a connection or invitation.")
        revoke_access(
            info.context.user,
            organization_id,
            identifier,
            kind=kind,
            reason=reason,
            expected_version=expected_version,
        )
        return True

    @strawberry.mutation
    def preview_portal_release(
        self, info: Info, organization_id: UUID, patient_id: UUID, selection: JSON
    ) -> JSON:
        return preview_release(info.context.user, organization_id, patient_id, selection)

    @strawberry.mutation
    def publish_portal_release(
        self,
        info: Info,
        organization_id: UUID,
        patient_id: UUID,
        selection: JSON,
        preview_digest: str,
        request_id: UUID,
    ) -> JSON:
        return release_details(
            publish_release(
                info.context.user,
                organization_id,
                patient_id,
                selection,
                preview_digest,
                request_id,
            ),
            content=True,
        )

    @strawberry.mutation
    def withdraw_portal_release(
        self,
        info: Info,
        organization_id: UUID,
        release_id: UUID,
        expected_version: int,
        reason: str,
    ) -> JSON:
        return release_details(
            withdraw_release(
                info.context.user, organization_id, release_id, expected_version, reason
            )
        )

    @strawberry.mutation
    def review_patient_report(
        self,
        info: Info,
        organization_id: UUID,
        report_id: UUID,
        state: str,
        expected_version: int,
        history_revision_id: UUID | None = None,
    ) -> JSON:
        return report_details(
            review_report(
                info.context.user,
                organization_id,
                report_id,
                state,
                expected_version,
                history_revision_id,
            )
        )
