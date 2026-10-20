from types import SimpleNamespace
from uuid import uuid4

from config.errors import DomainError
from medframe_apps.encounters.templates import save_template
from medframe_apps.onboarding.models import OrganizationSpecialty
from medframe_apps.providers.models import SpecialtyConfiguration
from medframe_apps.providers.specialties import save_specialties, specialty_setup
from tests_django.test_boundaries import ClinicalFixture


class SpecialtyTests(ClinicalFixture):
    def setUp(self):
        self.request = SimpleNamespace(
            user=self.admin, session={"mfa_verified": True, "auth_realm": "staff"}
        )

    def save(self, codes, version=0, request_id=None):
        return save_specialties(
            self.request, self.organization.id, codes, version, request_id or uuid4()
        )

    def test_read_does_not_create_config_and_save_has_replay(self):
        self.assertEqual(specialty_setup(self.request, self.organization.id)["version"], 0)
        self.assertFalse(SpecialtyConfiguration.objects.exists())
        key = uuid4()
        result = self.save(["pediatrics"], request_id=key)
        self.assertEqual(result["version"], 1)
        self.assertEqual(len(result["starters"]), 1)
        self.assertEqual(self.save(["pediatrics"], request_id=key)["version"], 1)
        with self.assertRaises(DomainError):
            self.save(["dermatology"], request_id=key)

    def test_versions_invalid_codes_duplicates_and_role(self):
        self.save(["dermatology"])
        for codes, version in [
            (["pediatrics"], 0),
            (["unsupported"], 1),
            (["pediatrics", "pediatrics"], 1),
        ]:
            with self.subTest(codes=codes), self.assertRaises(DomainError):
                self.save(codes, version)
        self.request.user = self.doctor
        with self.assertRaises(DomainError):
            self.save([], 1)

    def test_template_new_codes_require_selection_removed_history_retained(self):
        with self.assertRaises(DomainError):
            save_template(
                self.doctor,
                self.organization.id,
                {"name": "Synthetic", "specialty": "orthopedics"},
                0,
                uuid4(),
            )
        self.save(["orthopedics"])
        template = save_template(
            self.doctor,
            self.organization.id,
            {"name": "Synthetic", "specialty": "orthopedics"},
            0,
            uuid4(),
        )
        self.save([], 1)
        self.assertFalse(
            OrganizationSpecialty.objects.filter(organization=self.organization).exists()
        )
        template = save_template(
            self.doctor,
            self.organization.id,
            {"id": str(template.id), "name": "Renamed", "specialty": "orthopedics"},
            1,
            uuid4(),
        )
        self.assertEqual(template.version, 2)
        self.assertEqual(template.revisions.get(version=1).definition["name"], "Synthetic")

    def test_legacy_codes_and_station_denial(self):
        for code in ("general_medicine", "dentistry", "other"):
            save_template(
                self.doctor, self.organization.id, {"name": code, "specialty": code}, 0, uuid4()
            )
        self.request.station_credential = object()
        with self.assertRaises(DomainError):
            specialty_setup(self.request, self.organization.id)
