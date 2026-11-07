"""Install one verified official LiveKit release into private local runtime state."""

import hashlib
import io
import ipaddress
import json
import os
from pathlib import Path
import platform
import secrets
import tarfile
import urllib.request
from urllib.parse import urlsplit

root = Path(__file__).resolve().parents[1]
state = root / ".medframe-runtime/media"
state.mkdir(parents=True, exist_ok=True, mode=0o700)
state.chmod(0o700)
os.umask(0o077)
if platform.system() != "Linux" or platform.machine() not in {"x86_64", "amd64"}:
    raise SystemExit("Local call media currently requires Linux amd64.")
binary = state / "livekit-server"
if not binary.exists():
    url = "https://github.com/livekit/livekit/releases/download/v1.13.10/livekit_1.13.10_linux_amd64.tar.gz"
    with urllib.request.urlopen(url, timeout=60) as response:
        data = response.read(120 * 1024 * 1024)
    if (
        hashlib.sha256(data).hexdigest()
        != "c25a3e45fb922e9a93c6443d10c0ed041ba64342097e38632331736630283165"
    ):
        raise SystemExit(
            "Official media archive checksum did not match; nothing installed."
        )
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
        member = next(
            item
            for item in archive.getmembers()
            if Path(item.name).name == "livekit-server" and item.isfile()
        )
        binary.write_bytes(archive.extractfile(member).read())
    binary.chmod(0o700)
    print("Installed verified official LiveKit1.13.10 locally.")
credentials = state / "credentials.json"
if not credentials.exists():
    credentials.write_text(
        json.dumps(
            {"key": "mf" + secrets.token_hex(12), "secret": secrets.token_urlsafe(48)}
        )
    )
    credentials.chmod(0o600)
config = json.loads(credentials.read_text())
public_ip = os.environ.get("MEDFRAME_MEDIA_PUBLIC_IP", "").strip()
public_origin = os.environ.get("MEDFRAME_PUBLIC_ORIGIN", "").strip()
if public_ip:
    address = ipaddress.ip_address(public_ip)
    origin = urlsplit(public_origin)
    if not address.is_global or address.version != 4:
        raise SystemExit(
            "Internet media needs an explicit globally routable IPv4 address."
        )
    if (
        origin.scheme != "https"
        or not origin.hostname
        or origin.path
        or origin.query
        or origin.fragment
        or origin.username
        or origin.password
    ):
        raise SystemExit(
            "Internet media needs a trusted HTTPS MEDFRAME_PUBLIC_ORIGIN without a path."
        )
config["public_media"] = bool(public_ip)
turn_domain = os.environ.get("MEDFRAME_TURN_DOMAIN", "").strip()
turn = {"enabled": False}
if turn_domain:
    if not public_ip or not all(
        part and all(char.isalnum() or char == "-" for char in part)
        for part in turn_domain.split(".")
    ):
        raise SystemExit(
            "TURN needs the public-media profile and a valid DNS hostname."
        )
    cert = Path(os.environ.get("MEDFRAME_TURN_CERT", ""))
    key = Path(os.environ.get("MEDFRAME_TURN_KEY", ""))
    if not cert.is_file() or not key.is_file():
        raise SystemExit(
            "Provide existing trusted TURN certificate and key file paths."
        )
    turn = {
        "enabled": True,
        "domain": turn_domain,
        "tls_port": 5349,
        "cert_file": str(cert.resolve()),
        "key_file": str(key.resolve()),
    }

credentials.write_text(json.dumps(config))
(state / "server.yaml").write_text(
    json.dumps(
        {
            "port": 7880,
            "bind_addresses": ["127.0.0.1"],
            "rtc": {
                "tcp_port": 7881,
                "udp_port": 7882,
                "node_ip": public_ip or "127.0.0.1",
                "use_external_ip": False,
                "enable_loopback_candidate": not bool(public_ip),
            },
            "turn": turn,
            "keys": {config["key"]: config["secret"]},
            "room": {"max_participants": 2},
            "logging": {"level": "error"},
        }
    )
)
print(
    "Internet media configuration prepared; reachability is not verified."
    if public_ip
    else "Private loopback-only media configuration ready."
)
