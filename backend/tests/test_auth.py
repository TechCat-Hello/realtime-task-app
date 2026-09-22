import re

import pytest
from django.contrib.auth.tokens import default_token_generator
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


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


def _extract_reset_link_params(email_body):
    match = re.search(r"reset_uid=([^&\s]+)&reset_token=([^&\s]+)", email_body)
    assert match is not None, f"reset link not found in email body: {email_body}"
    return match.group(1), match.group(2)


@pytest.mark.django_db
def test_forgot_and_reset_password(api_client, create_user, mailoutbox):
    create_user(username="charlie", email="charlie@example.com", password="oldpass")

    res = api_client.post("/api/forgot-password/", data={"email": "charlie@example.com"})
    assert res.status_code == 200
    assert len(mailoutbox) == 1

    uid, token = _extract_reset_link_params(mailoutbox[0].body)

    res2 = api_client.post(
        "/api/reset-password/",
        data={"uid": uid, "token": token, "new_password": "newpass"},
    )
    assert res2.status_code == 200

    # Now login with new password
    login = api_client.post(reverse("token_obtain"), data={"username": "charlie", "password": "newpass"})
    assert login.status_code == 200
    assert "access" in login.data


@pytest.mark.django_db
def test_forgot_password_does_not_leak_whether_email_exists(api_client, mailoutbox):
    """The response (and whether an email is sent) must not reveal if the address is registered."""
    res = api_client.post("/api/forgot-password/", data={"email": "nobody@example.com"})
    assert res.status_code == 200
    assert len(mailoutbox) == 0


@pytest.mark.django_db
def test_reset_password_rejects_invalid_token(api_client, create_user):
    user = create_user(username="dave", email="dave@example.com", password="oldpass")
    uid = urlsafe_base64_encode(force_bytes(user.pk))

    res = api_client.post(
        "/api/reset-password/",
        data={"uid": uid, "token": "not-a-real-token", "new_password": "hacked"},
    )
    assert res.status_code == 400

    # Password must be unchanged
    login = api_client.post(reverse("token_obtain"), data={"username": "dave", "password": "oldpass"})
    assert login.status_code == 200


@pytest.mark.django_db
def test_reset_password_rejects_token_issued_for_a_different_user(api_client, create_user):
    """A token is only valid for the user it was generated for."""
    victim = create_user(username="eve", email="eve@example.com", password="oldpass")
    attacker = create_user(username="mallory", email="mallory@example.com", password="attackpass")

    uid = urlsafe_base64_encode(force_bytes(victim.pk))
    token = default_token_generator.make_token(attacker)

    res = api_client.post(
        "/api/reset-password/",
        data={"uid": uid, "token": token, "new_password": "hacked"},
    )
    assert res.status_code == 400

    login = api_client.post(reverse("token_obtain"), data={"username": "eve", "password": "oldpass"})
    assert login.status_code == 200


@pytest.mark.django_db
def test_reset_password_token_cannot_be_reused(api_client, create_user, mailoutbox):
    """Once a token has been used to change the password, it must not work again."""
    create_user(username="frank", email="frank@example.com", password="oldpass")

    api_client.post("/api/forgot-password/", data={"email": "frank@example.com"})
    uid, token = _extract_reset_link_params(mailoutbox[0].body)

    first = api_client.post(
        "/api/reset-password/",
        data={"uid": uid, "token": token, "new_password": "newpass"},
    )
    assert first.status_code == 200

    second = api_client.post(
        "/api/reset-password/",
        data={"uid": uid, "token": token, "new_password": "newpass2"},
    )
    assert second.status_code == 400
