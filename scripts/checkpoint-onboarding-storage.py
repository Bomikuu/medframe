"""Encrypted private-object checkpoint and isolated review-bucket restore; no keys printed."""

import argparse
import hashlib
import io
import json
import os
import struct
from pathlib import Path

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()
import boto3
from config.crypto import cipher
from config.runtime import get_settings

parser = argparse.ArgumentParser()
parser.add_argument("--folder", required=True)
parser.add_argument("--clone-bucket", required=True)
args = parser.parse_args()
runtime = get_settings()
if (
    runtime.app_env == "production"
    or args.clone_bucket == runtime.storage_bucket
    or not args.clone_bucket.startswith("medframe-review-")
):
    raise SystemExit("Use a new local review bucket.")
folder = Path(args.folder).expanduser()
folder.mkdir(mode=0o700, parents=True, exist_ok=True)
client = boto3.client(
    "s3",
    endpoint_url=runtime.storage_endpoint,
    aws_access_key_id=runtime.storage_access_key,
    aws_secret_access_key=runtime.storage_secret_key.get_secret_value(),
    region_name="us-east-1",
)
existing = {entry["Name"] for entry in client.list_buckets()["Buckets"]}
if args.clone_bucket in existing:
    raise SystemExit("Review bucket exists; nothing overwritten.")
client.create_bucket(Bucket=args.clone_bucket)
manifest = []
for page in client.get_paginator("list_objects_v2").paginate(
    Bucket=runtime.storage_bucket
):
    for entry in page.get("Contents", []):
        item = client.get_object(Bucket=runtime.storage_bucket, Key=entry["Key"])
        target = folder / f"object-{len(manifest):06d}.fernet"
        digest = hashlib.sha256()
        restored = io.BytesIO()
        with target.open("xb") as output:
            for chunk in item["Body"].iter_chunks(chunk_size=1024 * 1024):
                if not chunk:
                    continue
                digest.update(chunk)
                encrypted = cipher().encrypt(chunk)
                output.write(struct.pack("!I", len(encrypted)))
                output.write(encrypted)
        target.chmod(0o600)
        with target.open("rb") as encrypted_file:
            while length := encrypted_file.read(4):
                restored.write(
                    cipher().decrypt(
                        encrypted_file.read(struct.unpack("!I", length)[0])
                    )
                )
        if hashlib.sha256(restored.getvalue()).hexdigest() != digest.hexdigest():
            raise SystemExit("Encrypted restore checksum mismatch.")
        restored.seek(0)
        client.upload_fileobj(
            restored,
            args.clone_bucket,
            entry["Key"],
            ExtraArgs={
                "ContentType": item.get("ContentType", "application/octet-stream")
            },
        )
        copied = client.get_object(Bucket=args.clone_bucket, Key=entry["Key"])[
            "Body"
        ].read()
        if hashlib.sha256(copied).hexdigest() != digest.hexdigest():
            raise SystemExit("Review object checksum mismatch.")
        manifest.append(
            {"key": entry["Key"], "sha256": digest.hexdigest(), "bytes": len(copied)}
        )
(folder / "objects.manifest.fernet").write_bytes(
    cipher().encrypt(json.dumps(manifest).encode())
)
(folder / "objects.manifest.fernet").chmod(0o600)
print(
    json.dumps(
        {
            "objects_verified": len(manifest),
            "review_bucket": args.clone_bucket,
            "originals_written": False,
        }
    )
)
