import json
from pathlib import Path

from django.core.management.base import BaseCommand

from medframe_apps.anatomy.reference import anatomy_reference


class Command(BaseCommand):
    help = "Export the versioned server anatomy registry to a frontend JSON file."

    def add_arguments(self, parser):
        parser.add_argument("path")

    def handle(self, *args, **options):
        Path(options["path"]).write_text(json.dumps(anatomy_reference(), indent=2) + "\n")
