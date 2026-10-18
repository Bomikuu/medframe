"""One-way compatibility with the saved pwdlib Argon2 encoding."""

import base64

from argon2 import extract_parameters
from argon2.low_level import Type
from django.contrib.auth.hashers import BasePasswordHasher
from pwdlib import PasswordHash


def encode_legacy_password(encoded: str) -> str:
    if not encoded.startswith("$argon2id$") or len(encoded) > 512:
        raise ValueError("Unsupported source password encoding")
    parameters = extract_parameters(encoded)
    if not (
        parameters.type == Type.ID
        and parameters.version == 19
        and 8192 <= parameters.memory_cost <= 131072
        and 1 <= parameters.time_cost <= 6
        and 1 <= parameters.parallelism <= 8
        and 8 <= parameters.salt_len <= 64
        and 16 <= parameters.hash_len <= 64
    ):
        raise ValueError("Source password parameters exceed the compatible bounded profile")
    return "legacy_argon2$" + base64.b64encode(encoded.encode()).decode()


class LegacyArgon2Hasher(BasePasswordHasher):
    algorithm = "legacy_argon2"

    def verify(self, password, encoded):
        try:
            value = base64.b64decode(encoded.split("$", 1)[1], validate=True).decode()
            encode_legacy_password(value)
            return PasswordHash.recommended().verify(password, value)
        except Exception:
            return False

    def must_update(self, encoded):
        return True

    def safe_summary(self, encoded):
        return {"algorithm": self.algorithm}

    def encode(self, password, salt):
        raise ValueError("Legacy hashes are import-only")
