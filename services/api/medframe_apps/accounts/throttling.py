import hashlib

from django.conf import settings
from redis import Redis
from redis.exceptions import RedisError

from config.errors import DomainError
from config.runtime import get_settings


def keys_for(request, action, identity):
    prefix = getattr(settings, "THROTTLE_PREFIX", "django:throttle")
    return [
        f"{prefix}:{action}:{index}:" + hashlib.sha256(value.encode()).hexdigest()
        for index, value in enumerate([identity, request.META.get("REMOTE_ADDR", "unknown")])
    ]


def refund_attempt(request, action, identity):
    try:
        with Redis.from_url(
            get_settings().redis_url, socket_timeout=2, socket_connect_timeout=2
        ) as client:
            for key in keys_for(request, action, identity):
                client.eval(
                    "if tonumber(redis.call('GET',KEYS[1]) or '0') > 0 then "
                    "return redis.call('DECR',KEYS[1]) end; return 0",
                    1,
                    key,
                )
    except RedisError:
        pass  # A successful authentication remains valid; failure budgets remain conservative.


def throttle(request, action, identity, limit, seconds):
    client = Redis.from_url(get_settings().redis_url, socket_timeout=2, socket_connect_timeout=2)
    script = (
        "local n=redis.call('INCR',KEYS[1]); "
        "if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n"
    )
    try:
        for index, key in enumerate(keys_for(request, action, identity)):
            if client.eval(script, 1, key, seconds) > (limit if index == 0 else limit * 10):
                raise DomainError(
                    "RATE_LIMITED", "Too many attempts. Please wait and try again.", 429
                )
    except RedisError:
        raise DomainError(
            "UNAVAILABLE", "Secure sign-in is temporarily unavailable.", 503
        ) from None
    finally:
        client.close()
