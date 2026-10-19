from config.errors import DomainError
from medframe_apps.branding import services
from tests_django.test_boundaries import ClinicalFixture


class AppearanceTests(ClinicalFixture):
    def test_default_is_refined_light_even_with_dark_system(self):
        appearance = services.read_appearance(self.doctor, self.organization.id)
        self.assertEqual(appearance["personal"]["settings"]["mode"], "light")
        self.assertEqual(appearance["organization"]["settings"]["primary"], "#102A43")
        self.assertEqual(appearance["organization"]["settings"]["font"], "medframe")

    def test_reconstruction_fonts_preserve_legacy_choices(self):
        for font in ["medframe", "jakarta", "manrope", "inter", "source_sans_3", "noto_sans"]:
            with self.subTest(font=font):
                self.assertEqual(
                    services.validate(services.ThemeSettings, {"font": font})["font"], font
                )

    def test_workspace_returns_configured_clinic_timezone(self):
        from django.test import RequestFactory

        from api_graphql.schema import Query

        request = RequestFactory().post("/graphql")
        request.user = self.doctor
        self.organization.timezone = "Asia/Tokyo"
        self.organization.save(update_fields=["timezone"])
        from types import SimpleNamespace

        workspace = Query().clinic_workspace(SimpleNamespace(context=request), self.organization.id)
        self.assertEqual(workspace.organization.timezone, "Asia/Tokyo")

    def test_clinician_cannot_change_organization_branding(self):
        with self.assertRaises(DomainError):
            services.save_organization_branding(self.doctor, self.organization.id, {}, 0)

    def test_invalid_or_inaccessible_theme_rejected(self):
        for settings in [
            {"primary": "#FFFFFF"},
            {"font": "https://example.com/font"},
            {"sidebar_width": 500},
            {"css": "body{}"},
        ]:
            with self.subTest(settings=settings), self.assertRaises(DomainError):
                services.save_organization_branding(self.admin, self.organization.id, settings, 0)

    def test_personal_ownership_and_optimistic_conflict(self):
        saved = services.save_user_preferences(
            self.doctor, self.organization.id, {"mode": "dark"}, 0
        )
        self.assertEqual(saved["personal"]["settings"]["mode"], "dark")
        self.assertEqual(
            services.read_appearance(self.admin, self.organization.id)["personal"]["settings"][
                "mode"
            ],
            "light",
        )
        with self.assertRaises(DomainError):
            services.save_user_preferences(self.doctor, self.organization.id, {}, 0)

    def test_widget_layout_cannot_accept_unknown_or_duplicate_keys(self):
        for widgets in [
            [{"id": "private_records"}],
            [{"id": "draft_notes"}, {"id": "draft_notes"}],
        ]:
            with self.assertRaises(DomainError):
                services.save_user_preferences(self.doctor, self.organization.id, {}, 0, widgets)
