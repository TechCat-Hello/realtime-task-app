import os
import pytest

# Ensure tests use a lightweight SQLite DB so pytest can run without Docker/Postgres
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
from django.conf import settings
settings.DATABASES["default"] = {
    "ENGINE": "django.db.backends.sqlite3",
    "NAME": ":memory:",
}

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model


def pytest_configure(config=None):
    # Ensure every DB settings dict contains 'ATOMIC_REQUESTS' to avoid KeyError
    try:
        from django.db import connections
        for alias, cfg in connections.settings.items():
            if "ATOMIC_REQUESTS" not in cfg:
                cfg["ATOMIC_REQUESTS"] = False
    except Exception:
        # If Django isn't fully configured yet, ignore—pytest-django will set up later.
        pass


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def create_user(db):
    def _create(username="testuser", email="test@example.com", password="password", is_staff=False):
        User = get_user_model()
        user = User.objects.create_user(username=username, email=email, password=password)
        user.is_staff = is_staff
        user.save()
        return user

    return _create


@pytest.fixture
def auth_client(api_client, create_user):
    user = create_user()
    # Use force_authenticate to avoid depending on JWT token issuance in tests
    api_client.force_authenticate(user=user)
    return api_client, user
