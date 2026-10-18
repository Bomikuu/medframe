"""Patient realm only. No staff query classes or private staff DTOs are inherited."""

from uuid import UUID

import strawberry
from django.db import transaction
from strawberry.scalars import JSON
from strawberry.types import Info

from config.errors import DomainError
from medframe_apps.accounts.session_realms import require_session_realm
from medframe_apps.branding.models import OrganizationBranding, UserPreferences
from medframe_apps.branding.services import ThemeSettings, default_widgets
from medframe_apps.common import advisory_lock, check_version
from medframe_apps.portal.files import authorize_logo
from medframe_apps.portal.models import PatientReport, PortalLink
from medframe_apps.portal.policy import require_portal_link
from medframe_apps.portal.records import authorize_portal_download, portal_record, portal_records
from medframe_apps.portal.reports import report_details, submit_report
from medframe_apps.record_filters import page_records


@strawberry.type
class PortalQuery:
    @strawberry.field
    def portal_session(self, info: Info) -> JSON:
        user = require_session_realm(info.context, "patient")
        return {"id": str(user.id), "display_name": user.display_name}

    @strawberry.field
    def portal_links(self, info: Info) -> JSON:
        user = require_session_realm(info.context, "patient")
        return [
            {
                "id": str(item.id),
                "patient_name": item.patient.full_name,
                "clinic_name": item.organization.name,
                "relationship": item.relationship,
            }
            for item in PortalLink.objects.filter(user=user, active=True, organization__active=True)
            .select_related("patient", "organization")
            .order_by("created_at")[:50]
        ]

    @strawberry.field
    def portal_workspace(self, info: Info, link_id: UUID) -> JSON:
        link = require_portal_link(info.context, link_id)
        branding = OrganizationBranding.objects.filter(organization_id=link.organization_id).first()
        personal = UserPreferences.objects.filter(
            user=info.context.user, organization_id=link.organization_id
        ).first()
        values = personal.settings if personal else {}
        theme = ThemeSettings.model_validate(branding.settings if branding else {}).model_dump(
            exclude={"logo_id"}
        )
        return {
            "clinic_name": link.organization.name,
            "patient_name": link.patient.full_name,
            "reference": link.patient.reference,
            "relationship": link.relationship,
            "theme": theme,
            "mode": values.get("mode", "light"),
            "density": values.get("density", "inherit"),
            "preferences_version": personal.version if personal else 0,
            "logo_ticket": authorize_logo(info.context, link.id),
        }

    @strawberry.field
    def portal_records(self, info: Info, link_id: UUID, after: str | None = None) -> JSON:
        return portal_records(info.context, link_id, after)

    @strawberry.field
    def portal_record(self, info: Info, link_id: UUID, release_id: UUID) -> JSON:
        return portal_record(info.context, link_id, release_id)

    @strawberry.field
    def portal_reports(self, info: Info, link_id: UUID, after: str | None = None) -> JSON:
        link = require_portal_link(info.context, link_id)
        return page_records(
            PatientReport.objects.filter(link=link, author=info.context.user).select_related(
                "author"
            ),
            scope=f"own-reports:{link.id}:{info.context.user.id}",
            after=after,
            serialize=report_details,
        )


@strawberry.type
class PortalMutation:
    @strawberry.mutation
    def submit_patient_report(
        self, info: Info, link_id: UUID, category: str, text: str, request_id: UUID
    ) -> JSON:
        return report_details(submit_report(info.context, link_id, category, text, request_id))

    @strawberry.mutation
    def authorize_portal_download(
        self, info: Info, link_id: UUID, release_id: UUID, version_id: UUID
    ) -> str:
        return authorize_portal_download(info.context, link_id, release_id, version_id)

    @strawberry.mutation
    @transaction.atomic
    def save_portal_preferences(
        self, info: Info, link_id: UUID, mode: str, density: str, expected_version: int
    ) -> JSON:
        link = require_portal_link(info.context, link_id, lock=True)
        if mode not in {"light", "dark", "system"} or density not in {
            "inherit",
            "comfortable",
            "compact",
        }:
            raise DomainError("INVALID_INPUT", "Choose supported display preferences.")
        advisory_lock(f"preferences:{info.context.user.id}:{link.organization_id}")
        preferences = (
            UserPreferences.objects.select_for_update()
            .filter(user=info.context.user, organization_id=link.organization_id)
            .first()
        )
        if preferences:
            check_version(preferences.version, expected_version)
            preferences.settings = {**preferences.settings, "mode": mode, "density": density}
            preferences.version += 1
            preferences.save(update_fields=["settings", "version"])
        else:
            if expected_version != 0:
                raise DomainError("CONFLICT", "Reload display preferences.", 409)
            preferences = UserPreferences.objects.create(
                user=info.context.user,
                organization_id=link.organization_id,
                settings={"mode": mode, "density": density},
                widgets=default_widgets(),
            )
        return {"mode": mode, "density": density, "version": preferences.version}


class PatientSchema(strawberry.Schema):
    def process_errors(self, errors, execution_context=None):
        pass


schema = PatientSchema(query=PortalQuery, mutation=PortalMutation)
