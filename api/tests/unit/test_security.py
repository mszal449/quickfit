import uuid

import pytest

from auth.security import InvalidTokenError, create_access_token, decode_access_token, hash_token


def test_access_token_roundtrip():
    user_id = uuid.uuid4()
    token = create_access_token(user_id)
    payload = decode_access_token(token)

    assert payload.sub == user_id
    assert payload.type == "access"

def test_decode_rejects_garbage():
    with pytest.raises(InvalidTokenError):
        decode_access_token("not-a-real-jwt")


def test_hash_token_is_deterministic():
    raw = "some-refresh-token"
    assert hash_token(raw) == hash_token(raw)
