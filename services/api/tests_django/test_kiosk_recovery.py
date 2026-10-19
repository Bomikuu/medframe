"""Native staff assistance and public identity must remain separate."""

import json
from uuid import uuid4

from medframe_apps.stations import kiosk_management, kiosk_views
from medframe_apps.stations.models import KioskIntake, KioskPatientSession
from tests_django import test_station_kiosk as baseline
from tests_django.test_boundaries import ClinicalFixture


class KioskRecoveryTests(ClinicalFixture):
    setUp = baseline.StationKioskTests.setUp
    request = baseline.StationKioskTests.request
    staff = baseline.StationKioskTests.staff

    def test_native_middleware_context_allows_only_kiosk_operations(self):
        from config.errors import DomainError
        from medframe_apps.organizations.policy import require_membership
        from medframe_apps.stations.context import current_request

        request = self.request({"action": "staff_context"}, self.doctor)
        request.station_credential = self.credential
        token = current_request.set(request)
        try:
            self.assertEqual(kiosk_views.kiosk(request).status_code, 200)
            with self.assertRaises(DomainError):
                require_membership(self.doctor, self.organization.id, "patients.clinical.read")
            request.path = "/graphql"
            with self.assertRaises(DomainError):
                require_membership(self.doctor, self.organization.id, "operations.read")
        finally:
            current_request.reset(token)

    def test_native_middleware_rejects_cross_organization_assistance(self):
        from medframe_apps.stations.context import current_request

        request = self.request({"action": "staff_context"}, self.admin)
        request.station_credential = self.credential
        from medframe_apps.organizations.models import Branch, Organization

        other = Organization.objects.create(name="Synthetic other clinic")
        branch = Branch.objects.create(organization=other, name="Other")
        self.device.organization = other
        self.device.branch = branch
        self.device.save()
        token = current_request.set(request)
        try:
            self.assertEqual(kiosk_views.kiosk(request).status_code, 403)
        finally:
            current_request.reset(token)

    def test_pairing_alone_cannot_open_staff_search(self):
        response = kiosk_views.kiosk(self.request({"action": "staff_context"}))
        self.assertEqual(response.status_code, 401)

    def test_native_staff_mfa_and_realm_are_required(self):
        for session in [{"auth_realm": "staff"}, {"mfa_verified": True, "auth_realm": "patient"}]:
            request = self.request({"action": "staff_context"}, self.admin)
            request.station_credential = self.credential
            request.session = session
            self.assertIn(kiosk_views.kiosk(request).status_code, [401, 403])

    def test_assistance_context_is_current_device_branch(self):
        request = self.request({"action": "staff_context"}, self.admin)
        request.station_credential = self.credential
        response = kiosk_views.kiosk(request)
        self.assertEqual(response.status_code, 200)
        body = json.loads(response.content)
        self.assertEqual(body["branch_id"], str(self.branch.id))
        self.assertEqual(body["organization_id"], str(self.organization.id))
        self.assertEqual(response["Cache-Control"], "no-store, private")
        self.assertNotIn("patients", body)

    def test_staff_can_search_contact_fields_within_branch(self):
        self.patient.phone = "09123456789"
        self.patient.email = "contact-search@synthetic.example"
        self.patient.save()
        for query in ["09123456789", "contact-search@synthetic.example"]:
            response = kiosk_management.manage(self.staff(action="patients", query=query))
            rows = json.loads(response.content)["patients"]
            self.assertEqual([row["id"] for row in rows], [str(self.patient.id)])

    def test_public_identity_is_intake_only_and_retry_is_idempotent(self):
        data = {
            "action": "register",
            "full_name": "Synthetic identity",
            "phone": "09123456789",
            "request_id": str(uuid4()),
        }
        first = kiosk_views.kiosk(self.request(data))
        second = kiosk_views.kiosk(self.request(data))
        self.assertEqual(first.status_code, 200)
        self.assertEqual(
            json.loads(first.content)["reference"], json.loads(second.content)["reference"]
        )
        self.assertEqual(KioskIntake.objects.count(), 1)
        self.assertFalse(KioskPatientSession.objects.exists())
        self.assertNotIn("patient_id", json.loads(first.content))

    def test_public_device_cannot_search_existing_patients(self):
        response = kiosk_management.manage(
            self.request(
                {
                    "action": "patients",
                    "organization_id": str(self.organization.id),
                    "branch_id": str(self.branch.id),
                    "query": self.patient.full_name,
                }
            )
        )
        self.assertEqual(response.status_code, 401)
