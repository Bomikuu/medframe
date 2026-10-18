class DomainError(Exception):
    def __init__(self, code: str, message: str, status: int = 400):
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


def forbidden() -> DomainError:
    return DomainError("FORBIDDEN", "You do not have access to this workspace.", 403)
