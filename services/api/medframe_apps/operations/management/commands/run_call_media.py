from django.core.management.base import BaseCommand
from medframe_apps.operations.media_supervisor import run


class Command(BaseCommand):
    help = "Run local media with a fail-closed authorization supervisor."

    def handle(self, *args, **options):
        run()
