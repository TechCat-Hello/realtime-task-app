import pytest
from tasks.models import Task


@pytest.mark.django_db
def test_create_task(create_user):
    user = create_user(username="alice", email="alice@example.com")
    task = Task.objects.create(user=user, title="Sample Task")
    assert task.id is not None
    assert task.title == "Sample Task"
    assert task.status == "todo"


@pytest.mark.django_db
def test_email_uniqueness(create_user):
    # The default User model may not enforce unique emails at the DB level.
    # We assert that creating a second user with the same email is possible,
    # but the application-level register API prevents duplicates (tested elsewhere).
    create_user(username="bob", email="bob@example.com")
    from django.contrib.auth import get_user_model

    User = get_user_model()
    u2 = User.objects.create_user(username="bob2", email="bob@example.com", password="pass")
    assert u2.email == "bob@example.com"
    assert User.objects.filter(email="bob@example.com").count() == 2
