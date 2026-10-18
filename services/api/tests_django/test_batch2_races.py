from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

from django.db import close_old_connections

from config.errors import DomainError
from medframe_apps.encounters import services
from medframe_apps.encounters.templates import apply_template, save_template
from medframe_apps.portal.releases import preview_release, publish_release
from tests_django import test_concurrency


class BatchTwoRaces(test_concurrency.ClinicalConcurrencyTests):
    # New races share the PostgreSQL fixture but do not rediscover baseline tests.
    test_totp_replay_race_has_one_winner = None
    test_recovery_code_race_has_one_winner = None
    test_two_concurrent_saves_have_one_winner = None
    test_stale_save_and_finalize_cannot_mutate_completed_evidence = None

    def race(self, work):
        barrier = Barrier(2)

        def execute(index):
            close_old_connections()
            try:
                barrier.wait(timeout=5)
                return work(index)
            except DomainError as error:
                return error.code
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            return list(pool.map(execute, [0, 1]))

    def test_template_application_and_autosave_have_one_version_winner(self):
        template = save_template(
            self.user,
            self.organization.id,
            {"name": "Synthetic prompts", "prompts": {"subjective": "Ask, do not assume."}},
            0,
            uuid4(),
        )

        def work(index):
            if index == 0:
                apply_template(
                    self.user,
                    self.organization.id,
                    self.encounter.id,
                    template.revisions.get().id,
                    1,
                    uuid4(),
                )
            else:
                services.save_encounter_draft(
                    self.user,
                    self.organization.id,
                    self.encounter.id,
                    {"soap": {"subjective": "Authored finding"}},
                    1,
                )
            return "saved"

        self.assertCountEqual(self.race(work), ["saved", "CONFLICT"])
        self.encounter.refresh_from_db()
        self.assertEqual(self.encounter.version, 2)

    def test_duplicate_publication_is_one_release(self):
        encounter = services.save_encounter_draft(
            self.user,
            self.organization.id,
            self.encounter.id,
            {"soap": {"objective": "Synthetic release evidence"}},
            1,
        )
        encounter = services.transition_encounter(
            self.user, self.organization.id, self.encounter.id, "completed", encounter.version
        )
        revision = services.finalize_encounter(
            self.user, self.organization.id, encounter.id, encounter.version
        )
        selection = {"summary": "Synthetic frozen release", "chart_revision_id": str(revision.id)}
        preview = preview_release(self.user, self.organization.id, encounter.patient_id, selection)
        key = uuid4()

        def work(index):
            return str(
                publish_release(
                    self.user,
                    self.organization.id,
                    encounter.patient_id,
                    selection,
                    preview["digest"],
                    key,
                ).id
            )

        results = self.race(work)
        self.assertEqual(results[0], results[1])
        from medframe_apps.portal.models import PortalRelease

        self.assertEqual(PortalRelease.objects.count(), 1)

    def test_duplicate_invitation_claims_have_one_link_and_native_session(self):
        import json

        import pyotp
        from django.contrib.auth.models import AnonymousUser
        from django.contrib.sessions.backends.db import SessionStore
        from django.test import RequestFactory

        from config.crypto import cipher
        from medframe_apps.accounts.models import ClinicalSession, MailOutbox, MfaCredential, User
        from medframe_apps.accounts.services import enroll, verify_mfa
        from medframe_apps.portal.invitations import (
            PortalActivation,
            issue_invitation,
            prepare_invitation,
        )
        from medframe_apps.portal.models import PortalLink

        issue_invitation(
            self.user,
            self.organization.id,
            self.encounter.patient_id,
            {
                "email": "race-portal@example.org",
                "relationship": "self",
                "method": "in_person",
                "attested": True,
            },
            uuid4(),
        )
        payload = json.loads(cipher().decrypt(MailOutbox.objects.get().encrypted_payload.encode()))
        token = payload["link"].split("#token=")[1]
        request = RequestFactory().post("/portal/auth/invitations/prepare")
        request.user = AnonymousUser()
        request.session = SessionStore()
        request.session.save()
        prepare_invitation(
            request, token, "Synthetic race portal password 91", "Synthetic race patient"
        )
        enroll(request, realm="patient")
        request.session.save()
        user = User.objects.get(email="race-portal@example.org")
        secret = (
            cipher()
            .decrypt(MfaCredential.objects.get(user=user).encrypted_secret.encode())
            .decode()
        )
        code = pyotp.TOTP(secret).now()
        requests = []
        for _ in range(2):
            pending = RequestFactory().post("/portal/auth/mfa/verify")
            pending.user = AnonymousUser()
            pending.session = SessionStore(session_key=request.session.session_key)
            # Force the same pre-completion native challenge into both connections.
            dict(pending.session)
            requests.append(pending)

        def work(index):
            verify_mfa(requests[index], code, realm="patient", activation=PortalActivation())
            return "claimed"

        result = self.race(work)
        self.assertEqual(result.count("claimed"), 1)
        self.assertEqual(PortalLink.objects.filter(user=user).count(), 1)
        self.assertEqual(ClinicalSession.objects.filter(user=user, realm="patient").count(), 1)
