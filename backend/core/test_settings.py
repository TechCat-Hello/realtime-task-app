from .settings import *

# Use an in-memory SQLite DB for tests to avoid needing Postgres/Docker
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# Ensure Django's connection settings include ATOMIC_REQUESTS to avoid KeyError during tests
DATABASES["default"]["ATOMIC_REQUESTS"] = False

# Speed up password hashing for tests
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]
