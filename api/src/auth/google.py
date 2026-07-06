from urllib.parse import urlencode

import httpx

from auth.schemas import GoogleUserInfo
from config.service import get_config

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


def build_google_auth_url(state: str) -> str:
    cfg = get_config().google_oauth_config
    params = {
        "client_id": cfg.google_client_id,
        "redirect_uri": cfg.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_token(code: str) -> str:
    cfg = get_config().google_oauth_config
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": cfg.google_client_id,
                "client_secret": cfg.google_client_secret,
                "redirect_uri": cfg.google_redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        resp.raise_for_status()
        return resp.json()["access_token"]


async def fetch_google_user(google_access_token: str) -> GoogleUserInfo:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {google_access_token}"},
        )
        resp.raise_for_status()
        return GoogleUserInfo.model_validate(resp.json())
