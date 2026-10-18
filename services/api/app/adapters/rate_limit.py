from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import get_settings
from app.core.errors import DomainError
from app.core.security import digest

redis = Redis.from_url(get_settings().redis_url, decode_responses=True)
COUNTER_SCRIPT = """
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return count
"""


async def enforce_rate_limit(
    bucket: str, identity: str, client_address: str, limit: int, window_seconds: int
) -> None:
    try:
        counts = []
        for key in (f"identity:{identity}", f"client:{client_address}"):
            count = await redis.eval(
                COUNTER_SCRIPT, 1, f"medframe:{bucket}:{digest(key)}", window_seconds
            )
            counts.append(count)
    except RedisError:
        raise DomainError(
            "UNAVAILABLE", "Sign-in is temporarily unavailable. Try again shortly.", 503
        ) from None
    if max(counts) > limit:
        raise DomainError("RATE_LIMITED", "Too many attempts. Please try again later.", 429)


async def refund_successful_attempt(bucket: str, identity: str, client_address: str) -> None:
    """Reserve attempts before expensive authentication, then refund successful ones."""
    script = """
    local count = tonumber(redis.call('GET', KEYS[1]) or '0')
    if count > 0 then redis.call('DECR', KEYS[1]) end
    return 1
    """
    try:
        for key in (f"identity:{identity}", f"client:{client_address}"):
            await redis.eval(script, 1, f"medframe:{bucket}:{digest(key)}")
    except RedisError:
        # A failed refund makes throttling stricter; authentication has already committed.
        pass
