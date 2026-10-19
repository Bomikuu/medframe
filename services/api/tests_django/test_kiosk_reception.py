"""Focused no-code reception sessions, strict tasks and device boundaries."""

import json
from datetime import timedelta
from uuid import uuid4

from django.utils import timezone

from config.errors import DomainError
from medframe_apps.organizations.models import Branch
from medframe_apps.stations import kiosk_management as management
from medframe_apps.stations import kiosk_reception as reception
from medframe_apps.stations import kiosk_services as services
from medframe_apps.stations import pairing
from medframe_apps.stations.inputs import DeviceInput
from medframe_apps.stations.kiosk_identity import PATIENT_COOKIE, patient_session
from medframe_apps.stations.kiosk_visits import today
from medframe_apps.stations.models import KioskAssignment, KioskBoundary, KioskPolicy
from tests_django import test_station_kiosk as baseline
from tests_django.test_boundaries import ClinicalFixture


class KioskReceptionTests(ClinicalFixture):
    setUp = baseline.StationKioskTests.setUp
    request = baseline.StationKioskTests.request
    staff = baseline.StationKioskTests.staff
    opened = baseline.StationKioskTests.opened
    proof = baseline.StationKioskTests.proof
    view = baseline.StationKioskTests.view

    def assignment(self, **changes):
        boundary, _ = KioskBoundary.objects.get_or_create(credential=self.credential)
        return management.manage(
            self.staff(
                action="assign",
                patient_id=str(self.patient.id),
                device_id=str(self.device.id),
                device_version=self.device.version,
                generation=boundary.generation,
                method="in_person_identity_verified",
                **changes,
            )
        )

    def claim(self):
        boundary, _ = KioskBoundary.objects.get_or_create(credential=self.credential)
        return reception.receive(self.request(), boundary.generation)

    def test_reception_assigns_without_code_and_session_supports_multiple_tasks(self):
        self.assertEqual(self.assignment().status_code, 200)
        secret, session = self.claim()
        request = self.request()
        request.COOKIES[PATIENT_COOKIE] = secret
        self.assertEqual(patient_session(request).proof.patient_id, self.patient.id)
        slot = services.available(
            session,
            {
                "department_id": str(self.consult.id),
                "provider_id": str(self.provider.id),
                "date": (today(self.branch) + timedelta(days=1)).isoformat(),
            },
        )[0]
        booked = services.perform(
            request,
            {
                "action": "book",
                "department_id": str(self.consult.id),
                "provider_id": str(self.provider.id),
                "start": slot["start"],
                "request_id": str(uuid4()),
            },
        )
        self.assertEqual(booked["kind"], "appointment")
        ticket = services.perform(
            request,
            {
                "action": "walk_in",
                "department_id": str(self.lab.id),
                "request_id": str(uuid4()),
            },
        )
        self.assertEqual(ticket["kind"], "ticket")
        self.assertEqual(patient_session(request).id, session.id)
        self.assertIsNone(self.claim())

    def test_claim_sets_device_only_http_only_cookie(self):
        self.assignment()
        boundary = KioskBoundary.objects.get(credential=self.credential)
        response = self.view_response({"action": "receive", "generation": boundary.generation})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.cookies[PATIENT_COOKIE]["httponly"])
        self.assertEqual(response.cookies[PATIENT_COOKIE]["samesite"], "Strict")
        self.assertNotIn("code", json.loads(response.content))

    def view_response(self, data):
        return baseline.kiosk_views.kiosk(self.request(data))

    def test_other_device_cannot_claim_assignment(self):
        self.assignment()
        original = self.credential
        self.credential = type(original).objects.create(
            device=self.device,
            digest="d" * 64,
            verification_phrase="EFGH23",
            expires_at=timezone.now() + timedelta(days=1),
        )
        self.assertIsNone(self.claim())
        self.credential = original
        self.assertIsNotNone(self.claim())

    def test_end_invalidates_pending_assignment_and_old_generation(self):
        self.assignment()
        boundary = KioskBoundary.objects.get(credential=self.credential)
        self.assertEqual(self.view({"action": "end"})[0], 200)
        with self.assertRaises(DomainError):
            reception.receive(self.request(), boundary.generation)
        self.assertIsNone(self.claim())

    def test_expired_assignment_is_not_claimed(self):
        self.assignment()
        KioskAssignment.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertIsNone(self.claim())

    def test_busy_session_and_pending_assignment_cannot_be_replaced(self):
        self.assignment()
        self.assertEqual(self.assignment().status_code, 409)
        self.claim()
        self.assertEqual(self.assignment().status_code, 409)

    def test_revoked_device_and_revoked_staff_cannot_open_patient_scope(self):
        self.assignment()
        self.admin_member.active = False
        self.admin_member.save(update_fields=["active"])
        with self.assertRaises(DomainError):
            self.claim()
        self.credential.revoked = True
        self.credential.save(update_fields=["revoked"])
        with self.assertRaises(DomainError):
            self.claim()

    def test_identity_attestation_and_branch_match_are_required(self):
        body = {
            "action": "assign",
            "patient_id": str(self.patient.id),
            "device_id": str(self.device.id),
            "device_version": 1,
            "generation": 1,
        }
        self.assertEqual(management.manage(self.staff(**body)).status_code, 400)
        other = Branch.objects.create(organization=self.organization, name="Other")
        self.device.branch = other
        self.device.save(update_fields=["branch"])
        self.assertEqual(self.assignment().status_code, 404)

    def test_non_reception_role_cannot_assign(self):
        self.admin_member.roles.clear()
        self.assertEqual(self.assignment().status_code, 403)

    def test_standard_mode_does_not_request_patient_code(self):
        status, data = self.view({"action": "setup"})
        self.assertEqual(status, 200)
        self.assertFalse(data["strict_verification"])
        self.assertEqual(
            self.view({"action": "verify", "generation": 1, "code": self.proof()["code"]})[0], 403
        )

    def test_strict_mode_rejects_reception_assignment_and_second_task_but_retries(self):
        KioskPolicy.objects.create(device=self.device, strict_verification=True)
        self.assertEqual(self.assignment().status_code, 409)
        request, _ = self.opened()
        body = {"action": "walk_in", "department_id": str(self.lab.id), "request_id": str(uuid4())}
        result = services.perform(request, body)
        self.assertEqual(services.perform(request, body), result)
        with self.assertRaises(DomainError) as error:
            services.perform(request, {**body, "request_id": str(uuid4())})
        self.assertEqual(error.exception.code, "REVERIFY_REQUIRED")

    def test_policy_update_is_versioned_and_requires_pairing_again(self):
        request = self.staff()
        result = pairing.update(
            request,
            self.organization.id,
            self.device.id,
            1,
            DeviceInput(
                name=self.device.name,
                branch_id=self.branch.id,
                mode="kiosk",
                functions=self.device.functions,
                strict_verification=True,
            ),
        )
        self.assertTrue(result["pairing_required"])
        self.assertTrue(result["device"]["strict_verification"])
        self.credential.refresh_from_db()
        self.assertTrue(self.credential.revoked)
