from dataclasses import dataclass


@dataclass(frozen=True)
class RequestContext:
    request_id: str
    client_address: str
    origin: str | None
