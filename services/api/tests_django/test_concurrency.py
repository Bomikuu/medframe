from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

from django.db import close_old_connections
from django.test import TransactionTestCase

from config.errors import DomainError
from medframe_apps.accounts.models import ClinicalSession, MfaCredential, RecoveryCode, User
from medframe_apps.accounts.services import verify_mfa
from medframe_apps.encounters import services
from medframe_apps.organizations.models import Branch, Membership, Organization
from medframe_apps.organizations.policy import seed_roles
from medframe_apps.patients.inputs import RegisterPatientInput
from medframe_apps.patients.services import register_patient
from medframe_apps.providers.models import ProviderProfile


class ClinicalConcurrencyTests(TransactionTestCase):
    def mfa_race(self, recovery=False):
        import time

        import pyotp
        from django.contrib.auth.models import AnonymousUser
        from django.contrib.sessions.backends.db import SessionStore
        from django.test import RequestFactory

        from config.crypto import cipher, digest

        secret = pyotp.random_base32()
        MfaCredential.objects.create(
            user=self.user,
            encrypted_secret=cipher().encrypt(secret.encode()).decode(),
            confirmed=True,
        )
        code = "synthetic-once-recovery" if recovery else pyotp.TOTP(secret).now()
        if recovery:
            RecoveryCode.objects.create(user=self.user, code_hash=digest(code))
        requests = []
        for _ in range(2):
            request = RequestFactory().post("/auth/mfa/verify")
            request.user = AnonymousUser()
            request.session = SessionStore()
            request.session.update(
                {
                    "challenge_user": str(self.user.id),
                    "challenge_epoch": 1,
                    "challenge_expires": time.time() + 300,
                }
            )
            request.session.save()
            requests.append(request)
        barrier = Barrier(2)

        def verify(request):
            close_old_connections()
            try:
                barrier.wait(timeout=5)
                verify_mfa(request, code)
                return "verified"
            except DomainError as error:
                return error.code
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(verify, requests))
        self.assertCountEqual(results, ["verified", "INVALID_MFA"])
        self.assertEqual(ClinicalSession.objects.filter(user=self.user).count(), 1)

    def test_totp_replay_race_has_one_winner(self):
        self.mfa_race()

    def test_recovery_code_race_has_one_winner(self):
        self.mfa_race(recovery=True)

    def setUp(self):
        seed_roles()
        self.user = User.objects.create_user("race@synthetic.example", "Synthetic race password 95")
        self.organization = Organization.objects.create(name="Synthetic concurrency clinic")
        branch = Branch.objects.create(organization=self.organization, name="Main")
        member = Membership.objects.create(
            user=self.user, organization=self.organization, branch=branch
        )
        member.roles.add("doctor")
        provider = ProviderProfile.objects.create(membership=member)
        patient = register_patient(
            self.user,
            self.organization.id,
            RegisterPatientInput(
                full_name="Synthetic concurrent patient", branch_id=branch.id, request_id=uuid4()
            ),
        )
        self.encounter = services.create_encounter(
            self.user,
            self.organization.id,
            patient.id,
            provider.id,
            branch.id,
            "Synthetic concurrency check",
            uuid4(),
        )

    def test_two_concurrent_saves_have_one_winner(self):
        barrier = Barrier(2)

        def save(text):
            close_old_connections()
            try:
                user = User.objects.get(id=self.user.id)
                barrier.wait(timeout=5)
                services.save_encounter_draft(
                    user, self.organization.id, self.encounter.id, {"soap": {"subjective": text}}, 1
                )
                return "saved"
            except DomainError as error:
                return error.code
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(save, ["First synthetic edit", "Second synthetic edit"]))
        self.assertCountEqual(results, ["saved", "CONFLICT"])
        self.encounter.refresh_from_db()
        self.assertEqual(self.encounter.version, 2)

    def test_stale_save_and_finalize_cannot_mutate_completed_evidence(self):
        encounter = services.save_encounter_draft(
            self.user,
            self.organization.id,
            self.encounter.id,
            {"soap": {"objective": "Preserved evidence"}},
            1,
        )
        encounter = services.transition_encounter(
            self.user, self.organization.id, encounter.id, "completed", encounter.version
        )
        barrier = Barrier(2)

        def act(action):
            close_old_connections()
            try:
                user = User.objects.get(id=self.user.id)
                barrier.wait(timeout=5)
                if action == "finalize":
                    services.finalize_encounter(
                        user, self.organization.id, encounter.id, encounter.version
                    )
                else:
                    services.save_encounter_draft(
                        user,
                        self.organization.id,
                        encounter.id,
                        {"soap": {"objective": "Stale edit"}},
                        2,
                    )
                return action
            except DomainError as error:
                return error.code
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(act, ["finalize", "save"]))
        self.assertCountEqual(results, ["finalize", "CONFLICT"])
        self.assertEqual(
            self.encounter.revisions.get().content["soap"]["objective"], "Preserved evidence"
        )
