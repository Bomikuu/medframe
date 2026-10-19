import io
from unittest.mock import patch

from django.core.files.storage import FileSystemStorage
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from config.errors import DomainError
from medframe_apps.onboarding.logos import remove_logo, upload_logo
from medframe_apps.onboarding.models import OnboardingLogo
from medframe_apps.onboarding.tasks import scan_logo
from tests_django.onboarding_fixture import OnboardingFixture


class LogoTests(OnboardingFixture):
    def test_raster_validation_and_scan_blocks_promotion(self):
        request, state = self.verified()
        with self.assertRaises(DomainError):
            upload_logo(
                request, SimpleUploadedFile("bad.svg", b"<svg/>", "image/svg+xml"), state["version"]
            )
        data = io.BytesIO()
        Image.new("RGB", (3000, 20)).save(data, "PNG")
        with self.assertRaises(DomainError):
            upload_logo(
                request,
                SimpleUploadedFile("large.png", data.getvalue(), "image/png"),
                state["version"],
            )

    def test_clean_private_upload_removed_job_cannot_restore_selection(self):
        import tempfile

        request, state = self.verified()
        data = io.BytesIO()
        Image.new("RGB", (120, 60), "navy").save(data, "PNG")
        with (
            tempfile.TemporaryDirectory() as directory,
            patch(
                "medframe_apps.onboarding.logos.default_storage",
                FileSystemStorage(location=directory),
            ),
            patch(
                "medframe_apps.onboarding.tasks.default_storage",
                FileSystemStorage(location=directory),
            ),
            patch("medframe_apps.onboarding.tasks.scan_stream", return_value="clean"),
        ):
            updated = upload_logo(
                request,
                SimpleUploadedFile("logo.png", data.getvalue(), "image/png"),
                state["version"],
            )
            logo = OnboardingLogo.objects.get(id=updated["logo"]["id"])
            scan_logo(str(logo.id))
            logo.refresh_from_db()
            self.assertEqual(logo.scan_state, "clean")
            remove_logo(request, updated["version"])
            scan_logo(str(logo.id))
            self.assertFalse(OnboardingLogo.objects.get(id=logo.id).selected)
