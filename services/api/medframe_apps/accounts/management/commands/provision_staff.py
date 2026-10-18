from getpass import getpass

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from medframe_apps.accounts.models import User
from medframe_apps.organizations.models import Branch, Membership, Organization
from medframe_apps.organizations.policy import ROLE_PERMISSIONS, seed_roles
from medframe_apps.providers.models import ProviderProfile


class Command(BaseCommand):
    help = "Provision a scoped staff identity. Password is prompted, never a command argument."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--display-name", required=True)
        parser.add_argument("--organization", required=True)
        parser.add_argument("--branch", required=True)
        parser.add_argument("--role", required=True, choices=sorted(ROLE_PERMISSIONS))

    @transaction.atomic
    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        user = User.objects.filter(email=email).first()
        if user is None:
            password = getpass("Password (15–128 characters): ")
            if not 15 <= len(password) <= 128 or password != getpass("Confirm password: "):
                raise CommandError("Passwords must match and contain 15–128 characters.")
            try:
                validate_password(password, User(email=email, display_name=options["display_name"]))
            except ValidationError:
                raise CommandError(
                    "Choose a longer, less common password unrelated to the account."
                ) from None
            user = User.objects.create_user(email, password, display_name=options["display_name"])
        organization, _ = Organization.objects.get_or_create(name=options["organization"])
        branch, _ = Branch.objects.get_or_create(organization=organization, name=options["branch"])
        seed_roles()
        membership, _ = Membership.objects.get_or_create(
            user=user, organization=organization, defaults={"branch": branch}
        )
        if membership.branch_id and membership.branch_id != branch.id:
            raise CommandError(
                "Existing membership uses another branch; provisioning does not "
                "silently widen branch access."
            )
        membership.roles.add(options["role"])
        if options["role"] in {"doctor", "dentist"}:
            ProviderProfile.objects.get_or_create(
                membership=membership,
                defaults={
                    "specialty": "dentistry" if options["role"] == "dentist" else "general_medicine"
                },
            )
        self.stdout.write(
            "Staff membership is ready. Existing passwords are unchanged; "
            "new staff enroll MFA at sign-in."
        )
