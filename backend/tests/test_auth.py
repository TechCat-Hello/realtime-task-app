import re

import pytest
from django.contrib.auth.tokens import default_token_generator
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

# Passwords used where the request is expected to get past AUTH_PASSWORD_VALIDATORS.
STRONG_PASSWORD = "Str0ng-Passphrase-2026"
OTHER_STRONG_PASSWORD = "An0ther-Passphrase-2026"


@pytest.mark.django_db
def test_register_and_login(api_client):
    # Register
    res = api_client.post(reverse("token_obtain"), data={"username": "u1", "password": STRONG_PASSWORD})
    # token endpoint requires existing user; first create via register view
    register_res = api_client.post(
        "/api/register/",
        data={"username": "u1", "email": "u1@example.com", "password": STRONG_PASSWORD},
    )
    assert register_res.status_code == 201

    # Login
    token_res = api_client.post(reverse("token_obtain"), data={"username": "u1", "password": STRONG_PASSWORD})
    assert token_res.status_code == 200
    assert "access" in token_res.data


@pytest.mark.django_db
def test_register_rejects_weak_password(api_client):
    """AUTH_PASSWORD_VALIDATORS must actually apply to the API, not just to Django's forms."""
    res = api_client.post(
        "/api/register/",
        data={"username": "weakling", "email": "weakling@example.com", "password": "1"},
    )
    assert res.status_code == 400

    from django.contrib.auth.models import User

    assert not User.objects.filter(username="weakling").exists()


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
        data={"uid": uid, "token": token, "new_password": STRONG_PASSWORD},
    )
    assert res2.status_code == 200

    # Now login with new password
    login = api_client.post(reverse("token_obtain"), data={"username": "charlie", "password": STRONG_PASSWORD})
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
        data={"uid": uid, "token": "not-a-real-token", "new_password": STRONG_PASSWORD},
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
        data={"uid": uid, "token": token, "new_password": STRONG_PASSWORD},
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
        data={"uid": uid, "token": token, "new_password": STRONG_PASSWORD},
    )
    assert first.status_code == 200

    second = api_client.post(
        "/api/reset-password/",
        data={"uid": uid, "token": token, "new_password": OTHER_STRONG_PASSWORD},
    )
    assert second.status_code == 400


@pytest.mark.django_db
def test_reset_password_rejects_weak_password(api_client, create_user, mailoutbox):
    """A valid reset link must not be usable to set a trivial password."""
    create_user(username="grace", email="grace@example.com", password="oldpass")

    api_client.post("/api/forgot-password/", data={"email": "grace@example.com"})
    uid, token = _extract_reset_link_params(mailoutbox[0].body)

    res = api_client.post(
        "/api/reset-password/",
        data={"uid": uid, "token": token, "new_password": "1"},
    )
    assert res.status_code == 400

    # The old password must still work, i.e. nothing was changed.
    login = api_client.post(reverse("token_obtain"), data={"username": "grace", "password": "oldpass"})
    assert login.status_code == 200


@pytest.mark.django_db
def test_forgot_password_is_rate_limited(api_client, create_user, mailoutbox):
    """Without a limit this endpoint can be used to flood a mailbox and burn the SES quota."""
    create_user(username="heidi", email="heidi@example.com", password="oldpass")

    for _ in range(5):
        allowed = api_client.post("/api/forgot-password/", data={"email": "heidi@example.com"})
        assert allowed.status_code == 200

    blocked = api_client.post("/api/forgot-password/", data={"email": "heidi@example.com"})
    assert blocked.status_code == 429
    assert len(mailoutbox) == 5


@pytest.mark.django_db
def test_rate_limit_is_keyed_on_the_real_client_behind_proxies(api_client):
    """Requests reach Django via CloudFront -> ALB, so REMOTE_ADDR is always the load balancer.

    REST_FRAMEWORK["NUM_PROXIES"] makes DRF read the client out of
    X-Forwarded-For instead. If that were wrong, one caller hitting the limit
    would lock out everybody.
    """
    attacker = "1.1.1.1, 2.2.2.2"
    bystander = "9.9.9.9, 2.2.2.2"

    for _ in range(5):
        res = api_client.post(
            "/api/forgot-password/",
            data={"email": "nobody@example.com"},
            HTTP_X_FORWARDED_FOR=attacker,
        )
        assert res.status_code == 200

    blocked = api_client.post(
        "/api/forgot-password/",
        data={"email": "nobody@example.com"},
        HTTP_X_FORWARDED_FOR=attacker,
    )
    assert blocked.status_code == 429

    unaffected = api_client.post(
        "/api/forgot-password/",
        data={"email": "nobody@example.com"},
        HTTP_X_FORWARDED_FOR=bystander,
    )
    assert unaffected.status_code == 200
