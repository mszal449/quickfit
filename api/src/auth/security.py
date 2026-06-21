import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

import jwt

from auth.schemas import AccessToken
from config.service import get_config


class InvalidTokenError(Exception):
    pass


def create_access_token(user_id: uuid.UUID) -> str:
    cfg = get_config().jwt
    now = datetime.now(UTC)
    payload = AccessToken(
        sub=user_id, iat=now, exp=now + timedelta(seconds=cfg.access_token_ttl), type="access"
    )
    return jwt.encode(payload.to_claims(), cfg.jwt_secret, algorithm=cfg.jwt_algorithm)


def decode_access_token(token: str) -> AccessToken:
    cfg = get_config().jwt
    try:
        raw = jwt.decode(token, cfg.jwt_secret, algorithms=[cfg.jwt_algorithm])
    except jwt.PyJWTError as e:
        raise InvalidTokenError from e

    payload = AccessToken.model_validate(raw)
    if payload.type != "access":
        raise InvalidTokenError
    return payload


def create_refresh_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()
