"""Synthetic Django browser-test staff; credentials arrive on stdin."""

import json
import os
import sys
from pathlib import Path

import django


def main():
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
    django.setup()

    from medframe_apps.organizations.models import Branch
    from tests_django.browser_seed import clear_browser_throttle, provision

    data = json.load(sys.stdin)
    clear_browser_throttle([person["email"] for person in data["staff"]])
    for person in data["staff"]:
        safety = "Safety" in person["name"]
        organization = provision(person, data["clinic"], all_branches=safety)
        if safety:
            Branch.objects.get_or_create(organization=organization, name="Secondary branch")
            provision(person, data["clinic"] + " Second")


if __name__ == "__main__":
    main()
