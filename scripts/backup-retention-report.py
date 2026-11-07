#!/usr/bin/env python3
"""Read-only checkpoint inventory. Never decrypts, prunes, restores or starts services."""

import argparse
import hashlib
import json
import re
from pathlib import Path


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def inventory(root):
    if not root.is_dir():
        return {
            "mode": "read-only",
            "message": "Checkpoint directory does not exist.",
            "items": [],
        }
    items, eligible = [], []
    for path in sorted(root.iterdir()):
        row = {
            "name": path.name,
            "disposition": "protect",
            "reason": "Unrecognized recovery item",
        }
        items.append(row)
        if path.is_symlink() or not path.is_dir():
            continue
        manifest, archive = path / "manifest.json", path / "database.dump.fernet"
        # Never follow a manifest/archive symlink or inspect private configuration files.
        if manifest.is_symlink() or archive.is_symlink():
            row["reason"] = "Linked recovery files require manual review"
            continue
        try:
            data = json.loads(manifest.read_text())
            counts = data.get("counts")
            if not data.get("clone") or not isinstance(counts, dict) or not counts:
                row["reason"] = "No recorded isolated restore verification"
                continue
            if (
                data.get("source_written") is not False
                or data.get("plaintext_dump_written") is not False
            ):
                row["reason"] = "Unexpected checkpoint metadata"
                continue
            if not archive.is_file() or sha256(archive) != data.get("encrypted_sha256"):
                row["reason"] = "Archive missing or encrypted checksum differs"
                continue
            row["encrypted_bytes"] = archive.stat().st_size
            if data.get("commit") == "77bf229" or "pre-django" in path.name:
                row["reason"] = "Protected pre-Django baseline"
                continue
            if not re.fullmatch(r"pre-batch2-\d{8}-\d{6}-[a-f0-9]{7,40}", path.name):
                row["reason"] = (
                    "Nonstandard checkpoint name; preserve for manual review"
                )
                continue
            signature = tuple(sorted(counts))
            eligible.append((path, row, signature))
        except (OSError, ValueError, TypeError):
            row["reason"] = "Unreadable/incomplete metadata; preserve for manual review"
    eligible.sort(key=lambda item: item[0].name, reverse=True)
    # Checkpoint helper uses pre-batch2-YYYYMMDD-HHMMSS-* names, so this order is chronological.
    newest, milestones = set(), set()
    for index, (path, row, signature) in enumerate(eligible):
        if index < 3:
            newest.add(path.name)
        if signature not in milestones:
            milestones.add(signature)
            row["reason"] = "Latest recorded restore for this table inventory"
        elif path.name in newest:
            row["reason"] = "One of the latest three recorded restore checkpoints"
        else:
            row.update(
                disposition="review-only candidate",
                reason="Older duplicate table inventory; no deletion performed",
            )
    return {
        "mode": "read-only",
        "policy": "Protect baseline, latest 3 recorded restores, latest per table inventory and all unknown items",
        "limitation": "Manifest records prior restore verification. This does not rerun restore or prove full schema equivalence; table names do not capture column/constraint changes. Source bundles and configuration may be unique. Review before any separate cleanup.",
        "items": items,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--directory",
        type=Path,
        default=Path.home() / ".local/share/medframe/checkpoints",
    )
    args = parser.parse_args()
    print(json.dumps(inventory(args.directory), indent=2))


if __name__ == "__main__":
    main()
