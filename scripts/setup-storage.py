"""Append missing local object-store credentials without exposing or replacing secrets."""

import secrets
from pathlib import Path

target = Path(__file__).resolve().parents[1] / ".env"
if not target.exists():
    raise SystemExit("Run scripts/setup-local.py first.")
existing = target.read_text()
lines = existing.splitlines()
values = {
    "STORAGE_ACCESS_KEY": "medframe-" + secrets.token_hex(8),
    "STORAGE_SECRET_KEY": secrets.token_urlsafe(40),
}
changed = False
for name, value in values.items():
    index = next(
        (i for i, line in enumerate(lines) if line.startswith(name + "=")), None
    )
    if index is None:
        lines.append(f"{name}={value}")
        changed = True
    elif not lines[index].partition("=")[2].strip().strip("\"'"):
        lines[index] = f"{name}={value}"
        changed = True
if changed:
    target.write_text("\n".join(lines) + "\n")
target.chmod(0o600)
print("Private local storage configuration is ready.")
