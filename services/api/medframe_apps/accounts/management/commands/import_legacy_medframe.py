import json

from django.core.management.base import BaseCommand, CommandError

from medframe_apps.accounts.importer import import_snapshot, snapshot_source


class Command(BaseCommand):
    help = (
        "Read-only legacy snapshot import into a separate Django target; "
        "never imports active sessions."
    )

    def add_arguments(self, parser):
        modes = parser.add_mutually_exclusive_group(required=True)
        modes.add_argument("--dry-run", action="store_true")
        modes.add_argument("--apply", action="store_true")
        modes.add_argument("--verify", action="store_true")

    def handle(self, *args, **options):
        try:
            counts = import_snapshot(
                snapshot_source(), apply=options["apply"], verify=options["verify"]
            )
        except ValueError as error:
            raise CommandError(str(error)) from None
        self.stdout.write(
            json.dumps(
                {
                    "mode": "apply"
                    if options["apply"]
                    else "verify"
                    if options["verify"]
                    else "dry-run",
                    "counts": counts,
                    "source_written": False,
                }
            )
        )
