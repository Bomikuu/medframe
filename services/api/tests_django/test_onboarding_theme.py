from django.test import SimpleTestCase

from medframe_apps.branding.services import ThemeSettings


class ThemeTests(SimpleTestCase):
    def test_secondary_is_additive_for_legacy_and_new_themes(self):
        old = ThemeSettings.model_validate({"primary": "#102A43", "accent": "#0D9488"})
        self.assertEqual(old.secondary, "#0EA5A4")
        new = ThemeSettings(primary="#0F2D4A", secondary="#164E63", accent="#22C1B6")
        self.assertEqual(new.secondary, "#164E63")
