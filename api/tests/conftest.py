import os

os.environ.setdefault("JWT_SECRET", "test_secret")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-client-secret")
os.environ.setdefault("GOOGLE_REDIRECT_URI", "http://localhost/api/auth/google/callback")
os.environ.setdefault(
    "GOOGLE_HEALTH_REDIRECT_URI", "http://localhost/api/auth/google/callback/health"
)
os.environ.setdefault("INTEGRATION_SECRET", "test_secret")
