import pytest
from django.urls import reverse


@pytest.mark.django_db
def test_register_and_login(api_client):
    # Register
    res = api_client.post(reverse("token_obtain"), data={"username": "u1", "password": "p1"})
    # token endpoint requires existing user; first create via register view
    register_res = api_client.post("/api/register/", data={"username": "u1", "email": "u1@example.com", "password": "p1"})
    assert register_res.status_code == 201

    # Login
    token_res = api_client.post(reverse("token_obtain"), data={"username": "u1", "password": "p1"})
    assert token_res.status_code == 200
    assert "access" in token_res.data


@pytest.mark.django_db
def test_forgot_and_reset_password(api_client, create_user):
    user = create_user(username="charlie", email="charlie@example.com", password="oldpass")
    # Forgot (should return 200 even if not sending email)
    res = api_client.post("/api/forgot-password/", data={"email": "charlie@example.com"})
    assert res.status_code == 200

    # Reset (email-based)
    res2 = api_client.post("/api/reset-password/", data={"email": "charlie@example.com", "new_password": "newpass"})
    assert res2.status_code == 200

    # Now login with new password
    login = api_client.post(reverse("token_obtain"), data={"username": "charlie", "password": "newpass"})
    assert login.status_code == 200
    assert "access" in login.data
