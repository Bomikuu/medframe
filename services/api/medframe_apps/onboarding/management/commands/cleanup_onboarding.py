from django.core.management.base import BaseCommand

from medframe_apps.onboarding.tasks import cleanup_onboarding


class Command(BaseCommand):
    help = "Remove expired onboarding challenges and abandoned private draft content."

    def handle(self, *args, **options):
        cleanup_onboarding()
        self.stdout.write("Expired onboarding cleanup completed.")
