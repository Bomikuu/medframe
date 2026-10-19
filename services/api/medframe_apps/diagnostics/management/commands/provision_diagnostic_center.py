from getpass import getpass

from django.contrib.auth.password_validation import validate_password
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from medframe_apps.accounts.models import User
from medframe_apps.diagnostics.inputs import MODALITIES
from medframe_apps.diagnostics.models import DiagnosticCenter
from medframe_apps.organizations.models import Membership, Organization
from medframe_apps.organizations.policy import seed_roles


class Command(BaseCommand):
    help = "Provision a diagnostic center/operator without altering existing passwords or MFA."

    def add_arguments(self, parser):
        parser.add_argument("--organization-id")
        parser.add_argument("--create-name")
        parser.add_argument("--email", required=True)
        parser.add_argument("--display-name", required=True)
        parser.add_argument("--modality", choices=MODALITIES, action="append", required=True)
        parser.add_argument("--address", default="")

    @transaction.atomic
    def handle(self, *args, **options):
        if bool(options["organization_id"]) == bool(options["create_name"]):
            raise CommandError("Choose exactly one existing organization ID or new center name.")
        if options["organization_id"]:
            org = Organization.objects.get(id=options["organization_id"])
        else:
            if Organization.objects.filter(name=options["create_name"]).exists():
                raise CommandError("Name exists. Use its explicit organization ID.")
            org = Organization.objects.create(name=options["create_name"], clinic_type="diagnostic")
        user = User.objects.filter(email=options["email"].strip().lower()).first()
        if user is None:
            password = getpass("New operator password: ")
            if not 15 <= len(password) <= 128 or password != getpass("Confirm password: "):
                raise CommandError("Passwords must match and contain 15–128 characters.")
            validate_password(password)
            user = User.objects.create_user(
                options["email"].strip().lower(), password, display_name=options["display_name"]
            )
        member, _ = Membership.objects.get_or_create(user=user, organization=org)
        if member.branch_id or not member.active or not user.is_active:
            raise CommandError("Existing membership/account is restricted; no access was widened.")
        seed_roles()
        member.roles.add("diagnostic_operator")
        DiagnosticCenter.objects.get_or_create(
            organization=org,
            defaults={
                "name": org.name,
                "modalities": list(set(options["modality"])),
                "address": options["address"],
            },
        )
        self.stdout.write(
            "Diagnostic center membership ready. Existing credentials and MFA unchanged."
        )
