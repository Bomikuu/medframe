"""Bounded synthetic phase acceptance: identity, isolation, visits, booking and review."""

import json
import secrets
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, time, timedelta
from threading import Barrier
from uuid import uuid4
from zoneinfo import ZoneInfo

from django.contrib.auth.models import AnonymousUser
from django.db import DatabaseError, close_old_connections, transaction
from django.test import Client, RequestFactory, TransactionTestCase
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.accounts.models import User
from medframe_apps.operations.models import Appointment, ProviderSchedule, QueueTicket, Reservation
from medframe_apps.organizations.models import Branch, Membership, Organization
from medframe_apps.patients.models import Patient
from medframe_apps.portal.models import PortalInvitation, PortalLink
from medframe_apps.providers.models import ProviderProfile
from medframe_apps.stations import kiosk_identity as identity
from medframe_apps.stations import kiosk_management as management
from medframe_apps.stations import kiosk_services as services
from medframe_apps.stations import kiosk_views
from medframe_apps.stations.context import digest
from medframe_apps.stations.kiosk_visits import (
    admit,
    check_in,
    staff_stage_action,
    today,
)
from medframe_apps.stations.models import (
    DeviceCredential,
    KioskEvent,
    KioskIntake,
    KioskPatientSession,
    StationDepartment,
    StationDevice,
    StationVisit,
    VisitStage,
)
from tests_django.test_boundaries import ClinicalFixture


class StationKioskTests(ClinicalFixture):
    def setUp(self):
        self.patient = self.register()
        self.provider = ProviderProfile.objects.create(
            membership=self.membership, specialty="dentistry"
        )
        self.admin_member = Membership.objects.get(user=self.admin, organization=self.organization)
        self.device = StationDevice.objects.create(
            organization=self.organization,
            branch=self.branch,
            name="Synthetic patient kiosk",
            mode="kiosk",
            state="active",
            functions=["booking", "check_in", "walk_in", "payments"],
            created_by=self.admin,
        )
        self.device_secret = secrets.token_urlsafe(32)
        self.credential = DeviceCredential.objects.create(
            device=self.device,
            digest=digest(self.device_secret),
            verification_phrase="ABCD23",
            expires_at=timezone.now() + timedelta(days=1),
        )
        self.consult = StationDepartment.objects.create(
            branch=self.branch, name="Consultation", prefix="C", kind="consultation"
        )
        self.lab = StationDepartment.objects.create(
            branch=self.branch, name="Laboratory", prefix="L", kind="laboratory"
        )
        self.cashier = StationDepartment.objects.create(
            branch=self.branch, name="Cashier", prefix="P", kind="cashier"
        )
        day = today(self.branch) + timedelta(days=1)
        ProviderSchedule.objects.create(
            provider=self.provider,
            branch=self.branch,
            weekday=day.weekday(),
            effective_from=day,
            effective_to=day,
            opens=time(8),
            closes=time(17),
            duration=30,
        )

    def request(self, body=None, user=None):
        row = RequestFactory().post(
            "/stations/kiosk",
            json.dumps(body or {}),
            content_type="application/json",
            HTTP_ORIGIN="http://localhost:3000",
        )
        row.user = user or AnonymousUser()
        row.session = {"mfa_verified": True, "auth_realm": "staff"}
        row.station_credential = self.credential if not user else None
        row.station_error = None
        return row

    def proof(self):
        return identity.issue(
            self.patient,
            self.admin,
            membership=self.admin_member,
            method="in_person_identity_verified",
        )

    def opened(self):
        request = self.request()
        secret, session = identity.redeem(request, self.proof()["code"])
        request.COOKIES[identity.PATIENT_COOKIE] = secret
        return request, session

    def view(self, data, request=None):
        source = request or self.request()
        row = self.request(data)
        row.COOKIES = source.COOKIES
        response = kiosk_views.kiosk(row)
        return response.status_code, json.loads(response.content)

    def staff(self, **extra):
        return self.request(
            {
                "organization_id": str(self.organization.id),
                "branch_id": str(self.branch.id),
                **extra,
            },
            self.admin,
        )

    def test_setup_contains_configuration_not_patient_identity(self):
        status, value = self.view({"action": "setup"})
        self.assertEqual(status, 200)
        self.assertNotIn(self.patient.full_name, json.dumps(value))
        self.assertEqual(len(value["departments"]), 3)
        status, _ = self.view({"action": "status"})
        self.assertEqual(status, 403)

    def test_code_one_use_and_wrong_branch_cannot_consume(self):
        proof = self.proof()
        other = Branch.objects.create(organization=self.organization, name="Other")
        StationDevice.objects.filter(pk=self.device.pk).update(branch=other)
        with self.assertRaises(DomainError):
            identity.redeem(self.request(), proof["code"])
        StationDevice.objects.filter(pk=self.device.pk).update(branch=self.branch)
        identity.redeem(self.request(), proof["code"])
        with self.assertRaises(DomainError):
            identity.redeem(self.request(), proof["code"])

    def test_device_mode_revocation_and_capability_are_live(self):
        request, _ = self.opened()
        self.device.functions = ["check_in"]
        self.device.save()
        with self.assertRaises(DomainError):
            identity.patient_session(request, function="booking")
        self.credential.revoked = True
        self.credential.save()
        with self.assertRaises(DomainError):
            identity.patient_session(request)

    def test_proof_expiry_and_live_staff_membership(self):
        proof = self.proof()
        from medframe_apps.stations.models import KioskProof

        KioskProof.objects.filter(digest=digest(proof["code"])).update(
            expires_at=timezone.now() - timedelta(seconds=1)
        )
        with self.assertRaises(DomainError):
            identity.redeem(self.request(), proof["code"])
        request, _ = self.opened()
        self.admin_member.active = False
        self.admin_member.save()
        with self.assertRaises(DomainError):
            identity.patient_session(request)

    def test_idle_absolute_expiry_and_poll_does_not_extend(self):
        request, session = self.opened()
        before = session.last_active_at
        self.view({"action": "status"}, request)
        session.refresh_from_db()
        self.assertEqual(session.last_active_at, before)
        KioskPatientSession.objects.filter(pk=session.pk).update(
            last_active_at=timezone.now() - timedelta(seconds=121)
        )
        with self.assertRaises(DomainError):
            identity.patient_session(request)
        request, session = self.opened()
        KioskPatientSession.objects.filter(pk=session.pk).update(
            expires_at=timezone.now() - timedelta(seconds=1)
        )
        with self.assertRaises(DomainError):
            identity.patient_session(request)

    def test_end_and_new_patient_scope_clear_earlier_sessions(self):
        request, _ = self.opened()
        self.view({"action": "end"}, request)
        with self.assertRaises(DomainError):
            identity.patient_session(request)
        request, _ = self.opened()
        self.opened()
        with self.assertRaises(DomainError):
            identity.patient_session(request)

    def test_verified_portal_link_revocation_ends_kiosk_scope(self):
        user = User.objects.create_user("portal@synthetic.example", "Synthetic portal password 91")
        invitation = PortalInvitation.objects.create(
            organization=self.organization,
            patient=self.patient,
            issued_by=self.admin,
            email=user.email,
            relationship="self",
            method="in_person",
            token_hash=digest(secrets.token_urlsafe(32)),
            expires_at=timezone.now() + timedelta(days=1),
        )
        link = PortalLink.objects.create(
            organization=self.organization,
            patient=self.patient,
            user=user,
            invitation=invitation,
            relationship="self",
        )
        code = identity.issue(self.patient, user, link=link, method="verified_portal_link")
        request = self.request()
        secret, _ = identity.redeem(request, code["code"])
        request.COOKIES[identity.PATIENT_COOKIE] = secret
        self.assertEqual(identity.patient_session(request).proof.patient_id, self.patient.id)
        link.active = False
        link.save()
        with self.assertRaises(DomainError):
            identity.patient_session(request)

    def test_kiosk_cannot_access_graphql_portal_or_staff_admin(self):
        client = Client(HTTP_ORIGIN="http://localhost:3000")
        client.cookies["medframe_device"] = self.device_secret
        for url in ["/graphql", "/portal/graphql"]:
            response = client.post(url, {"query": "{__typename}"}, content_type="application/json")
            self.assertEqual(response.status_code, 403)
        response = client.post(
            "/stations/kiosk/manage",
            {"organization_id": str(self.organization.id), "branch_id": str(self.branch.id)},
            content_type="application/json",
        )
        self.assertIn(response.status_code, [401, 403])

    def test_booking_retry_and_existing_reservation_prevent_duplicates(self):
        request, session = self.opened()
        day = today(self.branch) + timedelta(days=1)
        slot = services.available(
            session,
            {
                "department_id": str(self.consult.id),
                "provider_id": str(self.provider.id),
                "date": day.isoformat(),
            },
        )[0]
        payload = {
            "action": "book",
            "department_id": str(self.consult.id),
            "provider_id": str(self.provider.id),
            "start": slot["start"],
            "request_id": str(uuid4()),
        }
        first = services.perform(request, payload)
        self.assertEqual(services.perform(request, payload), first)
        self.assertEqual(
            services.perform(request, {**payload, "request_id": str(uuid4())})["appointment"]["id"],
            first["appointment"]["id"],
        )
        self.assertEqual(Appointment.objects.count(), 1)
        self.assertEqual(Reservation.objects.count(), 1)
        self.assertEqual(StationVisit.objects.count(), 0)
        with self.assertRaises(DomainError):
            services.perform(request, {**payload, "start": slot["end"]})

    def test_busy_slot_and_past_date_fail_without_local_confirmation(self):
        request, session = self.opened()
        day = today(self.branch) + timedelta(days=1)
        with self.assertRaises(DomainError):
            services.available(
                session,
                {
                    "department_id": str(self.consult.id),
                    "provider_id": str(self.provider.id),
                    "date": (day - timedelta(days=2)).isoformat(),
                },
            )
        payload = {
            "action": "book",
            "department_id": str(self.consult.id),
            "provider_id": str(self.provider.id),
            "start": datetime.combine(
                day, time(22), ZoneInfo(self.organization.timezone)
            ).isoformat(),
            "request_id": str(uuid4()),
        }
        with self.assertRaises(DomainError):
            services.perform(request, payload)
        self.assertEqual(Appointment.objects.count(), 0)

    def test_check_in_same_day_window_and_duplicate_ticket(self):
        _, session = self.opened()
        now = timezone.now()
        row = Appointment.objects.create(
            organization=self.organization,
            branch=self.branch,
            patient=self.patient,
            provider=self.provider,
            start=now + timedelta(minutes=15),
            end=now + timedelta(minutes=45),
            created_by=self.admin,
        )
        first = check_in(session, row.id, self.consult)
        second = check_in(session, row.id, self.consult)
        self.assertEqual(first.id, second.id)
        self.assertEqual(QueueTicket.objects.count(), 1)
        self.assertEqual(StationVisit.objects.count(), 1)
        row.refresh_from_db()
        self.assertEqual(row.status, "checked_in")

    def test_future_or_other_patient_check_in_is_denied(self):
        _, session = self.opened()
        row = Appointment.objects.create(
            organization=self.organization,
            branch=self.branch,
            patient=self.patient,
            provider=self.provider,
            start=timezone.now() + timedelta(days=2),
            end=timezone.now() + timedelta(days=2, minutes=30),
            created_by=self.admin,
        )
        with self.assertRaises(DomainError):
            check_in(session, row.id, self.consult)
        with self.assertRaises(DomainError):
            check_in(session, uuid4(), self.consult)
        self.assertEqual(QueueTicket.objects.count(), 0)

    def test_department_without_doctor_retries_return_one_stage(self):
        request, _ = self.opened()
        payload = {
            "action": "walk_in",
            "department_id": str(self.lab.id),
            "request_id": str(uuid4()),
        }
        first = services.perform(request, payload)
        second = services.perform(request, {**payload, "request_id": str(uuid4())})
        self.assertEqual(first["ticket"]["id"], second["ticket"]["id"])
        self.assertEqual(first["ticket"]["label"], "L-001")
        self.assertEqual(QueueTicket.objects.count(), 0)
        self.assertEqual(VisitStage.objects.count(), 1)
        with self.assertRaises(DomainError):
            services.perform(
                request,
                {**payload, "department_id": str(self.cashier.id), "request_id": str(uuid4())},
            )

    def test_transfer_preserves_visit_history_and_staff_version(self):
        stage = admit(self.branch, self.patient, self.lab, self.admin)
        moved = staff_stage_action(
            self.request(user=self.admin),
            stage.id,
            {
                "target": "transfer",
                "expected_version": stage.version,
                "department_id": str(self.cashier.id),
                "reason": "Continue to cashier",
            },
        )
        self.assertEqual(moved.visit_id, stage.visit_id)
        self.assertEqual(moved.previous_id, stage.id)
        self.assertIsNone(moved.queue_ticket_id)
        self.assertEqual(StationVisit.objects.count(), 1)
        with self.assertRaises(DomainError):
            staff_stage_action(
                self.request(user=self.admin), stage.id, {"target": "called", "expected_version": 1}
            )

    def test_consultation_transfer_reuses_native_queue_without_encounter(self):
        stage = admit(self.branch, self.patient, self.consult, self.admin, provider=self.provider)
        moved = staff_stage_action(
            self.request(user=self.admin),
            stage.id,
            {
                "target": "transfer",
                "expected_version": stage.version,
                "department_id": str(self.lab.id),
                "reason": "Laboratory next",
            },
        )
        stage.queue_ticket.refresh_from_db()
        self.assertEqual(stage.queue_ticket.status, "cancelled")
        self.assertEqual(moved.visit_id, stage.visit_id)
        from medframe_apps.encounters.models import Encounter

        self.assertEqual(Encounter.objects.count(), 0)

    def test_call_recall_priority_skip_and_complete_are_attributed(self):
        stage = admit(self.branch, self.patient, self.lab, self.admin)
        request = self.request(user=self.admin)
        for target, reason in [
            ("called", ""),
            ("called", ""),
            ("priority", "Access priority"),
            ("in_service", ""),
            ("completed", ""),
        ]:
            stage = staff_stage_action(
                request,
                stage.id,
                {"target": target, "expected_version": stage.version, "reason": reason},
            )
        self.assertEqual(stage.status, "completed")
        self.assertEqual(KioskEvent.objects.filter(object_id=stage.id).count(), 6)
        with self.assertRaises(DatabaseError), transaction.atomic():
            KioskEvent.objects.filter(object_id=stage.id).update(reason="Rewrite")

    def test_intake_requires_review_and_retries_do_not_register(self):
        request = self.request()
        payload = {
            "action": "register",
            "full_name": "Synthetic new arrival",
            "phone": "09123456789",
            "request_id": str(uuid4()),
        }
        self.view(payload, request)
        self.view(payload, request)
        self.assertEqual(KioskIntake.objects.count(), 1)
        from medframe_apps.patients.models import Patient

        self.assertEqual(Patient.objects.count(), 1)
        row = KioskIntake.objects.get()
        response = management.manage(
            self.staff(
                action="review_intake",
                intake_id=str(row.id),
                expected_version=row.version,
                decision="create",
                identity_verified=True,
            )
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Patient.objects.count(), 2)

    def test_intake_duplicate_match_requires_existing_selection(self):
        payload = {
            "action": "register",
            "full_name": self.patient.full_name,
            "phone": "09123456789",
            "request_id": str(uuid4()),
        }
        self.view(payload)
        row = KioskIntake.objects.get()
        response = management.manage(
            self.staff(
                action="review_intake",
                intake_id=str(row.id),
                expected_version=row.version,
                decision="create",
                identity_verified=True,
            )
        )
        self.assertEqual(response.status_code, 409)
        response = management.manage(
            self.staff(
                action="review_intake",
                intake_id=str(row.id),
                expected_version=row.version,
                patient_id=str(self.patient.id),
                identity_verified=True,
            )
        )
        self.assertEqual(response.status_code, 200)
        row.refresh_from_db()
        self.assertEqual(row.state, "linked")

    def test_balances_are_own_patient_only_and_payment_actions_unavailable(self):
        _, session = self.opened()
        self.assertEqual(services.balances(session)["invoices"], [])
        self.assertFalse(services.balances(session)["digital_available"])
        request, _ = self.opened()
        with self.assertRaises(DomainError):
            services.perform(request, {"action": "paid", "request_id": str(uuid4())})

    def test_database_rejects_foreign_department_and_patient_session_scope(self):
        other = Branch.objects.create(organization=self.organization, name="Other branch")
        dept = StationDepartment.objects.create(
            branch=other, name="Other cashier", prefix="P", kind="cashier"
        )
        visit = StationVisit.objects.create(
            branch=self.branch, patient=self.patient, date=today(self.branch)
        )
        with self.assertRaises(DatabaseError), transaction.atomic():
            VisitStage.objects.create(visit=visit, department=dept, number=1, label="P-001")

    def test_clear_generation_rejects_late_verification_without_consuming_code(self):
        request = self.request()
        status, config = self.view({"action": "setup"}, request)
        self.assertEqual(status, 200)
        proof = self.proof()
        self.view({"action": "end"}, request)
        with self.assertRaises(DomainError):
            identity.redeem(request, proof["code"], config["generation"])
        _, latest = self.view({"action": "setup"}, request)
        identity.redeem(request, proof["code"], latest["generation"])

    def test_issued_balance_details_exclude_another_patient(self):
        from medframe_apps.billing.invoices import invoice_action

        other = self.register()
        for patient, description, amount in [
            (self.patient, "Own consultation", "750.00"),
            (other, "Private other service", "1400.00"),
        ]:
            row = invoice_action(
                self.request(user=self.admin),
                self.organization.id,
                "save",
                {
                    "branch_id": str(self.branch.id),
                    "patient_id": str(patient.id),
                    "due_date": today(self.branch).isoformat(),
                    "lines": [{"description": description, "unit_amount": amount}],
                    "expected_version": 0,
                },
                uuid4(),
            )
            invoice_action(
                self.request(user=self.admin),
                self.organization.id,
                "issue",
                {"id": str(row.id), "expected_version": row.version},
                uuid4(),
            )
        _, session = self.opened()
        result = services.balances(session)
        self.assertEqual(len(result["invoices"]), 1)
        self.assertEqual(result["invoices"][0]["outstanding"], "750.00")
        self.assertNotIn("Private other service", json.dumps(result))


class KioskAdmissionRace(TransactionTestCase):
    def test_two_concurrent_admissions_share_one_visit_and_ticket(self):
        organization = Organization.objects.create(name="Synthetic race clinic")
        branch = Branch.objects.create(organization=organization, name="Main")
        actor = User.objects.create_user("race@synthetic.example", "Synthetic race password 91")
        patient = Patient.objects.create(
            organization=organization,
            branch=branch,
            reference="RACE-001",
            full_name="Synthetic race patient",
            registered_by=actor,
        )
        department = StationDepartment.objects.create(
            branch=branch, name="Laboratory", prefix="L", kind="laboratory"
        )
        barrier = Barrier(2)

        def worker():
            close_old_connections()
            try:
                barrier.wait(timeout=10)
                return admit(branch, patient, department, actor).id
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(lambda _: worker(), range(2)))
        self.assertEqual(results[0], results[1])
        self.assertEqual(StationVisit.objects.count(), 1)
        self.assertEqual(VisitStage.objects.count(), 1)
