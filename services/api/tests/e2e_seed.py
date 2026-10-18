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

    from tests_django.browser_seed import clear_browser_throttle, provision

    data = json.load(sys.stdin)
    clear_browser_throttle([data["email"], "not-registered@example.org"])
    for clinic in ["Synthetic Harbor Dental", "Synthetic Riverside Dental"]:
        provision({**data, "name": "Dr. Althea Reyes (test)", "role": "dentist"}, clinic)


if __name__ == "__main__":
    main()
