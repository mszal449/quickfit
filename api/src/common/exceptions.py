class AppError(Exception):
    """Base for domain errors translated to HTTP responses by a global handler."""


class NotFoundError(AppError):
    pass


class ConflictError(AppError):
    pass


class ForbiddenError(AppError):
    pass
