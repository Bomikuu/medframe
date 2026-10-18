"""Bound streamed/chunked bodies before Django spools or parses them."""


class BodyTooLarge(Exception):
    pass


class RequestBodyLimit:
    def __init__(self, application):
        self.application = application

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.application(scope, receive, send)
        limit = (
            21 * 1024 * 1024 if scope.get("path", "").startswith("/documents/upload/") else 65536
        )
        size = 0

        async def limited_receive():
            nonlocal size
            message = await receive()
            if message["type"] == "http.request":
                size += len(message.get("body", b""))
                if size > limit:
                    raise BodyTooLarge()
            return message

        try:
            await self.application(scope, limited_receive, send)
        except BodyTooLarge:
            await send(
                {
                    "type": "http.response.start",
                    "status": 413,
                    "headers": [
                        (b"content-type", b"application/json"),
                        (b"cache-control", b"no-store"),
                        (b"x-content-type-options", b"nosniff"),
                    ],
                }
            )
            await send(
                {
                    "type": "http.response.body",
                    "body": b'{"code":"TOO_LARGE","message":"The request is too large."}',
                }
            )
