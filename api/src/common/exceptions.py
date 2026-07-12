class AppError(Exception):
    """Base for domain errors translated to HTTP responses by a global handler."""

    def __init__(self, message: str = "", *, extra: dict | None = None):
        super().__init__(message)
        self.extra = extra or {}


class NotFoundError(AppError):
    pass


class ConflictError(AppError):
    pass


class ForbiddenError(AppError):
    pass


class UnauthorizedError(AppError):
    pass


class ValidationError(AppError):
    pass


class ExternalServiceError(AppError):
    pass
