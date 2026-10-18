from copy import deepcopy
from uuid import uuid4

from django.test import TestCase
from django.utils import timezone
from pwdlib import PasswordHash

from medframe_apps.accounts.importer import TABLES, import_snapshot
from medframe_apps.accounts.models import MfaCredential, User
from medframe_apps.patients.models import Patient


class LegacyImportTests(TestCase):
    def snapshot(self):
        now = timezone.now()
        user, org, branch, member, patient = [uuid4() for _ in range(5)]
        snapshot = {table: [] for table in TABLES}
        snapshot["users"] = [
            {
                "id": user,
                "created_at": now,
                "email": "legacy@synthetic.example",
                "display_name": "Synthetic Doctor",
                "active": True,
                "password_hash": PasswordHash.recommended().hash("Synthetic legacy password 95"),
            }
        ]
        snapshot["organizations"] = [
            {
                "id": org,
                "created_at": now,
                "name": "Synthetic imported clinic",
                "clinic_type": "dental",
                "timezone": "Asia/Manila",
                "active": True,
            }
        ]
        snapshot["branches"] = [
            {"id": branch, "created_at": now, "organization_id": org, "name": "Main"}
        ]
        snapshot["memberships"] = [
            {
                "id": member,
                "created_at": now,
                "user_id": user,
                "organization_id": org,
                "branch_id": branch,
                "active": True,
            }
        ]
        snapshot["membership_roles"] = [{"membership_id": member, "role": "dentist"}]
        from config.crypto import cipher

        snapshot["mfa_credentials"] = [
            {
                "user_id": user,
                "encrypted_secret": cipher().encrypt(b"JBSWY3DPEHPK3PXP").decode(),
                "confirmed": True,
                "last_step": 123,
            }
        ]
        snapshot["patients"] = [
            {
                "id": patient,
                "created_at": now,
                "organization_id": org,
                "branch_id": branch,
                "registered_by": user,
                "reference": "MFP-IMPORT",
                "full_name": "Synthetic Import",
                "date_of_birth": None,
                "sex": "not_recorded",
                "email": None,
                "phone": None,
                "address": None,
                "emergency_contact_name": None,
                "emergency_contact_phone": None,
                "emergency_contact_relationship": None,
                "guardian_name": None,
                "guardian_phone": None,
                "guardian_relationship": None,
                "version": 4,
                "updated_at": now,
            }
        ]
        snapshot["patient_access_grants"] = [
            {
                "id": uuid4(),
                "created_at": now,
                "organization_id": org,
                "patient_id": patient,
                "membership_id": member,
                "active": True,
                "granted_by": user,
                "revoked_by": None,
                "updated_at": now,
            }
        ]
        snapshot["patient_clinical_revisions"] = [
            {
                "id": uuid4(),
                "created_at": now,
                "organization_id": org,
                "patient_id": patient,
                "version": 1,
                "author_id": user,
                "medical_history": "Patient-reported",
                "conditions": "",
                "past_procedures": "",
                "allergy_state": "none_reported",
                "allergies": [],
                "medication_state": "unreviewed",
                "medications": [],
                "reason": "Initial history",
            }
        ]
        return snapshot

    def test_import_preserves_ids_versions_and_relations(self):
        snapshot = self.snapshot()
        import_snapshot(snapshot, apply=True)
        patient = Patient.objects.get(pk=snapshot["patients"][0]["id"])
        self.assertEqual(patient.version, 4)
        self.assertEqual(
            patient.patientclinicalrevision_set.get().medical_history, "Patient-reported"
        )
        self.assertTrue(patient.access_grants.get().active)
        self.assertEqual(MfaCredential.objects.get().last_step, 123)
        self.assertEqual(User.objects.get().password.split("$", 1)[0], "legacy_argon2")

    def test_import_is_repeatable_without_duplicate_history(self):
        snapshot = self.snapshot()
        counts = import_snapshot(snapshot, apply=True)
        self.assertEqual(import_snapshot(snapshot, apply=True), counts)
        self.assertEqual(Patient.objects.count(), 1)

    def test_import_rejects_changed_source_after_rehearsal(self):
        snapshot = self.snapshot()
        import_snapshot(snapshot, apply=True)
        changed = deepcopy(snapshot)
        changed["patients"][0]["full_name"] = "Source changed"
        with self.assertRaisesMessage(ValueError, "Source changed since rehearsal"):
            import_snapshot(changed, apply=True)

    def test_dry_run_has_no_target_writes(self):
        import_snapshot(self.snapshot())
        self.assertFalse(User.objects.exists())
