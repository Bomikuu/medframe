"""Synthetic browser fixtures, used only in separate Django development databases."""

import hashlib

from django.conf import settings
from django.db import transaction
from redis import Redis

from config.runtime import get_settings
from medframe_apps.accounts.models import User
from medframe_apps.organizations.models import Branch, Membership, Organization
from medframe_apps.organizations.policy import seed_roles
from medframe_apps.providers.models import ProviderProfile


def clear_browser_throttle(identities):
    with Redis.from_url(get_settings().redis_url) as redis:
        for action in ["login", "mfa", "graphql", "recovery"]:
            redis.delete(f"django:throttle:{action}:1:" + hashlib.sha256(b"127.0.0.1").hexdigest())
        for identity in identities:
            for action in ["login", "recovery"]:
                redis.delete(
                    f"django:throttle:{action}:0:" + hashlib.sha256(identity.encode()).hexdigest()
                )


@transaction.atomic
def provision(person, clinic, *, all_branches=False):
    if get_settings().app_env == "production" or not settings.DATABASES["default"][
        "NAME"
    ].startswith("medframe_django"):
        raise RuntimeError("Synthetic browser fixtures require a Django development database")
    seed_roles()
    user = User.objects.filter(email=person["email"]).first()
    if user is None:
        user = User.objects.create_user(
            person["email"], person["password"], display_name=person["name"]
        )
    organization, _ = Organization.objects.get_or_create(name=clinic)
    branch, _ = Branch.objects.get_or_create(organization=organization, name="Main branch")
    membership, _ = Membership.objects.get_or_create(
        user=user, organization=organization, defaults={"branch": None if all_branches else branch}
    )
    membership.roles.add(person["role"])
    if person["role"] in {"doctor", "dentist"}:
        ProviderProfile.objects.get_or_create(
            membership=membership,
            defaults={
                "specialty": "dentistry" if person["role"] == "dentist" else "general_medicine"
            },
        )
    return organization
