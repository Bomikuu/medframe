"""Run a command against the synthetic review DB without copying secrets to argv."""

import os
import subprocess
import sys
from urllib.parse import urlsplit, urlunsplit

from config.runtime import get_settings

runtime = get_settings()
url = urlsplit(runtime.database_url.get_secret_value())
env = os.environ.copy()
env["DJANGO_DATABASE_URL"] = urlunsplit(
    url._replace(path="/medframe_django_station_kiosk_review_20261019")
)
env["DJANGO_DATABASE_NAME"] = "medframe_django_station_kiosk_review_20261019"
env["WEB_ORIGIN"] = "http://localhost:3001"
raise SystemExit(subprocess.call(sys.argv[1:], env=env))
