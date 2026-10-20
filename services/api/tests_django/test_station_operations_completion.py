import json
import secrets
from datetime import time, timedelta
from uuid import uuid4

from django.contrib.auth.models import AnonymousUser
from django.db import DatabaseError, transaction
from django.test import Client, RequestFactory
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.billing.invoices import invoice_action
from medframe_apps.operations.models import ProviderSchedule, QueueTicket
from medframe_apps.operations.queue import new_ticket, transition_ticket
from medframe_apps.providers.models import ProviderProfile
from medframe_apps.stations.context import DEVICE_COOKIE, digest
from medframe_apps.stations.display import display, save_settings, snapshot
from medframe_apps.stations.kiosk_visits import admit, staff_stage_action
from medframe_apps.stations.models import (
    DeviceCredential,
    KioskEvent,
    StationDepartment,
    StationDevice,
    StationDisplaySettings,
    VisitStage,
)
from medframe_apps.stations.payment_policy import clearance, link_invoice, require_clearance
from tests_django.test_billing import request
from tests_django.test_installment_billing import InstallmentFixture


class StationOperationsFixture(InstallmentFixture):
    def setUp(self):
        super().setUp()
        self.provider, _ = ProviderProfile.objects.get_or_create(
            membership=self.membership, defaults={"specialty": "dentistry"}
        )
        from zoneinfo import ZoneInfo

        day = timezone.localdate(timezone=ZoneInfo(self.organization.timezone))
        ProviderSchedule.objects.create(
            provider=self.provider,
            branch=self.branch,
            weekday=day.weekday(),
            effective_from=day,
            effective_to=day,
            opens=time(0),
            closes=time(23, 59),
            duration=30,
        )
        self.lab = StationDepartment.objects.create(
            branch=self.branch,
            name="Laboratory",
            prefix="L",
            kind="laboratory",
            counter_label="Counter 2",
        )
        self.consult = StationDepartment.objects.create(
            branch=self.branch, name="Consultation", prefix="C", kind="consultation"
        )
        self.cashier = StationDepartment.objects.create(
            branch=self.branch, name="Cashier", prefix="P", kind="cashier"
        )
        self.device = StationDevice.objects.create(
            organization=self.organization,
            branch=self.branch,
            name="Synthetic TV",
            mode="display",
            state="active",
            functions=["queue.display"],
            created_by=self.admin,
        )
        self.secret = secrets.token_urlsafe(32)
        self.credential = DeviceCredential.objects.create(
            device=self.device,
            digest=digest(self.secret),
            verification_phrase="ABCDEF",
            expires_at=timezone.now() + timedelta(days=1),
        )

    def stage(self, department=None):
        department = department or self.lab
        return admit(
            self.branch,
            self.patient,
            department,
            self.admin,
            provider=self.provider if department.kind == "consultation" else None,
        )

    def move(self, stage, target, **extra):
        return staff_stage_action(
            self.request,
            stage.id,
            {
                "expected_version": stage.version,
                "target": target,
                **extra,
            },
        )

    def payment(self, invoice, action="payment", amount="12000", **extra):
        return invoice_action(
            self.request,
            self.organization.id,
            action,
            {
                "id": str(invoice.id),
                "expected_version": invoice.version,
                "amount": amount,
                **extra,
            },
            uuid4(),
        )

    def display_request(self, body=None):
        req = RequestFactory().post(
            "/stations/display", json.dumps(body or {}), content_type="application/json"
        )
        req.user = AnonymousUser()
        req.session = {}
        req.station_credential = self.credential
        req.station_error = None
        return req


class StationDisplayTests(StationOperationsFixture):
    def test_device_only_allowlist_and_private_cache(self):
        stage = self.move(self.stage(), "called")
        response = display(self.display_request())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Cache-Control"], "no-store, private")
        result = json.loads(response.content)
        entry = result["called"][0]
        self.assertEqual(
            set(entry),
            {"key", "label", "department", "provider", "counter", "status", "call_token"},
        )
        self.assertEqual(entry["label"], stage.label)
        self.assertEqual(entry["counter"], "Counter 2")
        text = json.dumps(result)
        for value in [
            str(self.patient.id),
            self.patient.full_name,
            str(stage.id),
            str(stage.visit_id),
        ]:
            self.assertNotIn(value, text)
        self.assertTrue(entry["call_token"])
        self.assertEqual(
            display(self.display_request({"branch_id": str(self.branch.id)})).status_code, 400
        )

    def test_live_revocation_expiry_mode_and_pending_denial(self):
        self.credential.revoked = True
        self.credential.save(update_fields=["revoked"])
        self.assertEqual(display(self.display_request()).status_code, 403)
        self.credential.revoked = False
        self.credential.expires_at = timezone.now() - timedelta(seconds=1)
        self.credential.save(update_fields=["revoked", "expires_at"])
        self.assertEqual(display(self.display_request()).status_code, 403)
        self.credential.expires_at = timezone.now() + timedelta(days=1)
        self.credential.save(update_fields=["expires_at"])
        for state, mode in [("pending", "display"), ("active", "kiosk"), ("active", "clinician")]:
            self.device.state = state
            self.device.mode = mode
            self.device.save(update_fields=["state", "mode"])
            self.assertEqual(display(self.display_request()).status_code, 403)

    def test_response_caps_and_device_branch_are_authoritative(self):
        for _ in range(23):
            new_ticket(self.request, self.branch, self.patient, self.provider, None, 30)
        self.assertEqual(len(snapshot(self.credential)["upcoming"]), 20)
        for ticket in QueueTicket.objects.filter(day__branch=self.branch):
            transition_ticket(
                self.request,
                ticket.id,
                {"target": "called", "expected_version": ticket.version},
                uuid4(),
            )
        self.assertEqual(len(snapshot(self.credential)["called"]), 12)
        from medframe_apps.organizations.models import Branch

        other = Branch.objects.create(organization=self.organization, name="Other display branch")
        self.device.branch = other
        self.device.save(update_fields=["branch"])
        result = json.loads(display(self.display_request()).content)
        self.assertEqual(result["branch"], other.name)
        self.assertEqual(result["called"], [])

    def test_display_cannot_inherit_staff_or_graphql_access(self):
        client = Client()
        client.cookies[DEVICE_COOKIE] = self.secret
        self.assertEqual(
            client.post(
                "/graphql", {"query": "{ currentUser { id } }"}, content_type="application/json"
            ).status_code,
            403,
        )
        route = client.get("/auth/session").json()
        self.assertEqual(route["destination"], "/station/display")
        req = self.display_request()
        req.station_credential = None
        req.user = self.admin
        self.assertEqual(display(req).status_code, 403)

    def test_linked_queue_dedup_recall_and_completion(self):
        stage = self.stage(self.consult)
        stage = self.move(stage, "called")
        result = snapshot(self.credential)
        self.assertEqual(len(result["called"]), 1)
        self.assertEqual(result["called"][0]["label"], stage.label)
        token = result["called"][0]["call_token"]
        stage = self.move(stage, "called")
        self.assertNotEqual(snapshot(self.credential)["called"][0]["call_token"], token)
        stage = self.move(stage, "in_service")
        stage = self.move(stage, "completed")
        self.assertEqual(snapshot(self.credential)["called"], [])

    def test_legacy_recall_keeps_order_and_has_exact_retry(self):
        ticket = new_ticket(self.request, self.branch, self.patient, self.provider, None, 30)
        ticket = transition_ticket(
            self.request,
            ticket.id,
            {"target": "called", "expected_version": ticket.version},
            uuid4(),
        )
        before = snapshot(self.credential)["called"][0]["call_token"]
        key = uuid4()
        data = {"target": "recall", "expected_version": ticket.version}
        first = transition_ticket(self.request, ticket.id, data, key)
        second = transition_ticket(self.request, ticket.id, data, key)
        self.assertEqual(
            (first.order, first.status, first.version), (second.order, "called", second.version)
        )
        self.assertNotEqual(snapshot(self.credential)["called"][0]["call_token"], before)

    def test_native_order_and_previous_day_exclusion(self):
        ticket = new_ticket(self.request, self.branch, self.patient, self.provider, None, 30)
        other = new_ticket(self.request, self.branch, self.patient, self.provider, None, 30)
        other.order = ticket.order - 1
        other.save(update_fields=["order"])
        self.assertEqual(
            [row["label"] for row in snapshot(self.credential)["upcoming"]],
            [f"{other.number:03d}", f"{ticket.number:03d}"],
        )
        ticket.day.date -= timedelta(days=1)
        ticket.day.save(update_fields=["date"])
        self.assertEqual(snapshot(self.credential)["upcoming"], [])

    def test_authored_notices_bounds_version_and_permission(self):
        result = save_settings(
            self.request,
            self.branch,
            {"expected_version": 0, "announcements": ["Public clinic notice", ""]},
        )
        self.assertEqual(result, {"version": 1, "announcements": ["Public clinic notice"]})
        with self.assertRaises(DomainError):
            save_settings(self.request, self.branch, {"expected_version": 0, "announcements": []})
        for notices in [["x"] * 4, ["x" * 241], ["<script>bad</script>"], ["https://example.com"]]:
            with self.assertRaises(DomainError):
                save_settings(
                    self.request, self.branch, {"expected_version": 1, "announcements": notices}
                )
        with self.assertRaises(DomainError):
            save_settings(
                request(self.doctor), self.branch, {"expected_version": 1, "announcements": []}
            )
        with self.assertRaises(DatabaseError), transaction.atomic():
            StationDisplaySettings.objects.filter(branch=self.branch).update(
                announcements=["x"] * 4
            )


class StationPaymentPolicyTests(StationOperationsFixture):
    def before(self, department=None):
        department = department or self.lab
        department.payment_timing = "before"
        department.save(update_fields=["payment_timing"])
        return self.move(self.stage(department), "called")

    def test_missing_invoice_blocks_but_cashier_transfer_preserves_visit(self):
        stage = self.before()
        with self.assertRaises(DomainError):
            self.move(stage, "in_service")
        cashier = self.move(
            stage, "transfer", department_id=str(self.cashier.id), reason="Cashier continuation"
        )
        self.assertEqual(cashier.visit_id, stage.visit_id)
        self.assertEqual(cashier.previous_id, stage.id)
        self.assertEqual(
            VisitStage.objects.filter(
                visit=stage.visit, status__in=["waiting", "called", "in_service"]
            ).count(),
            1,
        )
        self.assertFalse(clearance(cashier)["required"])

    def test_current_due_not_future_principal_and_refund_reopens(self):
        invoice = self.payment(self.issue_plan())
        stage = self.before()
        stage = link_invoice(self.request, stage, invoice.id, stage.version)
        self.assertFalse(clearance(stage)["blocked"])
        payment = invoice.payments.first()
        self.payment(
            invoice, "refund", "100", payment_id=str(payment.id), reason="Synthetic refund"
        )
        self.assertTrue(clearance(stage)["blocked"])
        with self.assertRaises(DomainError):
            self.move(stage, "in_service")

    def test_paid_deposit_permits_service_with_future_balance(self):
        invoice = self.payment(self.issue_plan())
        stage = self.before()
        stage = link_invoice(self.request, stage, invoice.id, stage.version)
        stage = self.move(stage, "in_service")
        self.assertEqual(stage.status, "in_service")
        self.assertEqual(invoice.payments.count(), 1)

    def test_exception_is_attributed_without_payment_or_reusable_clearance(self):
        stage = self.before()
        with self.assertRaises(DomainError):
            self.move(stage, "in_service", payment_exception_reason="short")
        stage = self.move(
            stage,
            "in_service",
            payment_exception_reason="Explicit synthetic urgent service exception",
        )
        event = KioskEvent.objects.get(object_id=stage.id, kind="payment.exception")
        self.assertEqual(event.actor, self.admin)
        self.assertTrue(clearance(stage)["blocked"])
        self.assertIsNone(stage.payment_invoice_id)

    def test_link_invoice_rejects_draft_foreign_patient_and_stale_version(self):
        stage = self.before()
        draft = self.plan_draft()
        with self.assertRaises(DomainError):
            link_invoice(self.request, stage, draft.id, stage.version)
        invoice = self.issue_plan()
        with self.assertRaises(DomainError):
            link_invoice(self.request, stage, invoice.id, 0)
        with self.assertRaises(DomainError):
            link_invoice(request(self.doctor), stage, invoice.id, stage.version)
        other = self.register()
        other_stage = admit(self.branch, other, self.lab, self.admin)
        with self.assertRaises(DomainError):
            link_invoice(self.request, other_stage, invoice.id, other_stage.version)
        with self.assertRaises(DatabaseError), transaction.atomic():
            VisitStage.objects.filter(id=other_stage.id).update(payment_invoice=invoice)

    def test_direct_native_queue_cannot_bypass_before_service(self):
        stage = self.before(self.consult)
        ticket = QueueTicket.objects.get(id=stage.queue_ticket_id)
        with self.assertRaises(DomainError):
            transition_ticket(
                self.request,
                ticket.id,
                {"target": "in_service", "expected_version": ticket.version},
                uuid4(),
            )
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, "called")
        ticket = transition_ticket(
            self.request,
            ticket.id,
            {
                "target": "in_service",
                "expected_version": ticket.version,
                "payment_exception_reason": "Authorized synthetic urgent exception",
            },
            uuid4(),
        )
        self.assertEqual(ticket.status, "in_service")
        self.assertEqual(
            KioskEvent.objects.filter(kind="payment.exception", object_id=stage.id).count(), 1
        )

    def test_exception_requires_financial_adjustment_permission(self):
        stage = self.before()
        with self.assertRaises(DomainError):
            require_clearance(request(self.doctor), stage, "Explicit synthetic urgent exception")
        self.assertFalse(
            KioskEvent.objects.filter(kind="payment.exception", object_id=stage.id).exists()
        )

    def test_after_service_default_preserves_native_behavior(self):
        stage = self.move(self.stage(), "called")
        stage = self.move(stage, "in_service")
        self.assertEqual(stage.status, "in_service")
