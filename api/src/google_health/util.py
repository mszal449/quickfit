import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from config.service import get_config

NONCE_SIZE = 12


def encrypt_token(token: str) -> str:
    cfg = get_config()
    nonce = os.urandom(NONCE_SIZE)
    aesgcm = AESGCM(cfg.integration_secret)
    ciphertext = aesgcm.encrypt(nonce, token.encode(), None)
    return base64.b64encode(nonce + ciphertext).decode()


def decrypt_token(token: str) -> str:
    cfg = get_config()
    raw = base64.b64decode(token)
    nonce = raw[:NONCE_SIZE]
    encrypted_token = raw[NONCE_SIZE:]
    aesgcm = AESGCM(cfg.integration_secret)
    return aesgcm.decrypt(nonce, encrypted_token, None).decode()
