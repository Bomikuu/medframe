"""Bounded native doctor workspace, device editing and provisional care checks."""

from datetime import timedelta
from unittest.mock import patch
from uuid import uuid4

from django.test import RequestFactory
from django.utils import timezone

from config.errors import DomainError
from medframe_apps.accounts.models import ClinicalSession
from medframe_apps.encounters.models import Encounter
from medframe_apps.organizations.models import Branch
from medframe_apps.patients.models import Patient
from medframe_apps.stations import doctor_access, pairing
from medframe_apps.stations.context import current_request
from medframe_apps.stations.inputs import DeviceInput
from medframe_apps.stations.models import DoctorAccessCode, DoctorStationSession
from tests_django.test_boundaries import ClinicalFixture
from tests_django.test_station_access import StationAccessTests


class DoctorWorkspaceTests(ClinicalFixture):
    setUp = StationAccessTests.setUp
    graphql = StationAccessTests.graphql

    def issue(self):
        return doctor_access.issue(self.sender, self.organization.id, self.branch.id)

    def open(self, code=None):
        return self.client.post(
            "/stations/doctor",
            {"code": code or self.issue()["code"]},
            content_type="application/json",
            HTTP_ORIGIN="http://localhost:3000",
        )

    def post(self, path, data):
        return self.client.post(
            path, data, content_type="application/json", HTTP_ORIGIN="http://localhost:3000"
        )

    def test_workspace_opens_without_encounter_and_preserves_identity(self):
        password = self.doctor.password
        self.assertEqual(self.open().status_code, 200)
        context = self.post("/stations/context", {}).json()["access"]
        self.assertEqual(context["kind"], "doctor")
        self.assertNotIn("encounter_id", context)
        self.assertEqual(self.client.session["_auth_user_id"], str(self.doctor.id))
        self.doctor.refresh_from_db()
        self.assertEqual(self.doctor.password, password)
        self.assertEqual(DoctorStationSession.objects.count(), 1)
        self.assertEqual(
            self.graphql("query {currentUser {id} myOrganizations {id}}").status_code, 200
        )

    def test_replacement_replay_expiry_and_digest_only(self):
        first = self.issue()["code"]
        second = self.issue()["code"]
        self.assertNotEqual(self.open(first).status_code, 200)
        self.assertEqual(self.open(second).status_code, 200)
        self.assertNotEqual(self.open(second).status_code, 200)
        self.assertFalse(DoctorAccessCode.objects.filter(digest=second).exists())
        self.client.logout()
        expired = self.issue()["code"]
        DoctorAccessCode.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertNotEqual(self.open(expired).status_code, 200)

    def test_all_granted_patients_and_consultations_but_not_ungranted(self):
        second = self.register()
        hidden = self.register()
        hidden.access_grants.update(active=False)
        self.assertEqual(self.open().status_code, 200)
        result = self.graphql(
            'query($org:UUID!){patientDirectory(organizationId:$org,query:"",first:20)'
            "{items{id}} encounters(organizationId:$org){id}}",
            {"org": str(self.organization.id)},
        )
        self.assertEqual(result.status_code, 200, result.content)
        ids = {r["id"] for r in result.json()["data"]["patientDirectory"]["items"]}
        self.assertEqual(ids, {str(self.patient.id), str(second.id)})
        self.assertEqual(result.json()["data"]["encounters"][0]["id"], str(self.encounter.id))
        self.patient.access_grants.update(active=False)
        result = self.graphql(
            "query($o:UUID!,$p:UUID!){patientDemographics(organizationId:$o,patientId:$p){id}}",
            {"o": str(self.organization.id), "p": str(self.patient.id)},
        )
        self.assertTrue(result.json().get("errors"))

    def test_settings_billing_auth_and_delegation_are_blocked(self):
        self.assertEqual(self.open().status_code, 200)
        for path in [
            "/stations/manage",
            "/stations/handoff",
            "/stations/doctor",
            "/auth/mfa/enroll",
            "/admin/",
        ]:
            self.assertEqual(self.post(path, {}).status_code, 403, path)
        result = self.graphql(
            "query($o:UUID!){alias:billingOverview(organizationId:$o){id}}",
            {"o": str(self.organization.id)},
        )
        self.assertNotEqual(result.status_code, 200)

    def test_source_revocation_ends_access(self):
        self.assertEqual(self.open().status_code, 200)
        ClinicalSession.objects.filter(id=self.source.id).update(revoked=True)
        self.assertNotEqual(self.graphql("query{currentUser{id}}").status_code, 200)
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_absolute_expiry_ends_access(self):
        self.assertEqual(self.open().status_code, 200)
        row = DoctorStationSession.objects.get()
        row.expires_at = timezone.now() - timedelta(seconds=1)
        row.save()
        self.assertNotEqual(self.graphql("query{currentUser{id}}").status_code, 200)

    def test_unpaired_unapproved_wrong_mode_or_branch_cannot_redeem(self):
        code = self.issue()["code"]
        self.client.cookies.pop("medframe_device")
        self.assertNotEqual(self.open(code).status_code, 200)
        self.client.cookies["medframe_device"] = self.secret
        device = self.credential.device
        for changes in [
            {"state": "pending"},
            {"state": "active", "mode": "kiosk"},
            {
                "mode": "clinician",
                "branch": Branch.objects.create(organization=self.organization, name="Other"),
            },
        ]:
            for key, value in changes.items():
                setattr(device, key, value)
            device.save()
            self.assertNotEqual(self.open(code).status_code, 200)
        self.assertFalse(DoctorStationSession.objects.exists())

    def test_explicit_same_doctor_transfer_blocks_old_writer(self):
        self.assertEqual(self.open().status_code, 200)
        data = {
            "organization_id": str(self.organization.id),
            "encounter_id": str(self.encounter.id),
        }
        lease = self.post("/stations/encounter", data).json()
        take = {
            **data,
            "action": "take",
            "expected_version": lease["version"],
            "generation": lease["generation"],
        }
        self.assertEqual(self.post("/stations/encounter", take).status_code, 200)
        from medframe_apps.encounters.services import save_encounter_draft

        token = current_request.set(self.sender)
        try:
            with self.assertRaises(DomainError):
                save_encounter_draft(self.doctor, self.organization.id, self.encounter.id, {}, 1)
        finally:
            current_request.reset(token)
        self.assertEqual(self.post("/stations/encounter", take).status_code, 409)

    def walk_in(self, **overrides):
        return {
            "organization_id": str(self.organization.id),
            "branch_id": str(self.branch.id),
            "request_id": str(uuid4()),
            "patient_id": None,
            "new_patient": {"full_name": "Synthetic new walk-in"},
            "reason": "Synthetic walk-in",
            "content": {},
            **overrides,
        }

    def test_walk_in_commits_real_patient_and_original_aggregate_once(self):
        self.assertEqual(self.open().status_code, 200)
        count = Patient.objects.count()
        data = self.walk_in()
        first = self.post("/stations/walk-in", data)
        self.assertEqual(first.status_code, 200, first.content)
        self.assertEqual(Patient.objects.count(), count + 1)
        second = self.post("/stations/walk-in", data)
        self.assertEqual(first.json(), second.json())
        self.assertEqual(Patient.objects.count(), count + 1)
        self.assertEqual(
            self.post("/stations/walk-in", {**data, "reason": "Changed"}).status_code, 409
        )

    def test_walk_in_existing_patient_and_failed_save_are_atomic(self):
        self.assertEqual(self.open().status_code, 200)
        count = Patient.objects.count()
        encounters = Encounter.objects.count()
        with patch(
            "medframe_apps.stations.walk_in.save_encounter_draft",
            side_effect=DomainError("CONFLICT", "Synthetic failure", 409),
        ):
            self.assertEqual(self.post("/stations/walk-in", self.walk_in()).status_code, 409)
        self.assertEqual(Patient.objects.count(), count)
        self.assertEqual(Encounter.objects.count(), encounters)
        result = self.post(
            "/stations/walk-in", self.walk_in(patient_id=str(self.patient.id), new_patient=None)
        )
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual(Patient.objects.count(), count)

    def test_walk_in_cannot_link_ungranted_or_omit_identity(self):
        self.assertEqual(self.open().status_code, 200)
        self.patient.access_grants.update(active=False)
        self.assertEqual(
            self.post(
                "/stations/walk-in", self.walk_in(patient_id=str(self.patient.id), new_patient=None)
            ).status_code,
            404,
        )
        self.assertEqual(
            self.post("/stations/walk-in", self.walk_in(new_patient=None)).status_code, 400
        )

    def admin_request(self):
        request = RequestFactory().post("/stations/manage")
        request.user = self.admin
        request.session = {"mfa_verified": True, "auth_realm": "staff"}
        return request

    def test_device_rename_preserves_pairing_and_scope_change_revokes(self):
        device = self.credential.device
        data = DeviceInput(
            name="Renamed tablet",
            branch_id=self.branch.id,
            mode="clinician",
            functions=device.functions,
        )
        pairing.update(self.admin_request(), self.organization.id, device.id, device.version, data)
        self.credential.refresh_from_db()
        self.assertFalse(self.credential.revoked)
        with self.assertRaises(DomainError):
            pairing.update(self.admin_request(), self.organization.id, device.id, 1, data)
        device.refresh_from_db()
        pairing.update(
            self.admin_request(),
            self.organization.id,
            device.id,
            device.version,
            data.model_copy(update={"functions": ["clinical.read"]}),
        )
        self.credential.refresh_from_db()
        self.assertTrue(self.credential.revoked)

    def test_regenerate_active_pairing_and_tenant_scope(self):
        device = self.credential.device
        result = pairing.manage(
            self.admin_request(), self.organization.id, device.id, "pair", device.version
        )
        self.assertEqual(len(result["code"]), 8)
        self.credential.refresh_from_db()
        self.assertTrue(self.credential.revoked)
        self.assertEqual(result["device"]["state"], "setup")
        with self.assertRaises(DomainError):
            pairing.update(
                self.admin_request(),
                uuid4(),
                device.id,
                2,
                DeviceInput(
                    name="Forbidden",
                    branch_id=self.branch.id,
                    mode="display",
                    functions=["queue.display"],
                ),
            )
