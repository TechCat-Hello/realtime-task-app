import pytest
from django.urls import reverse
from tasks.models import Task


@pytest.mark.django_db
def test_task_crud_and_permissions(api_client, create_user):
    alice = create_user(username="alice", email="alice@example.com", password="pass")
    bob = create_user(username="bob", email="bob@example.com", password="pass")

    # alice client
    from rest_framework.test import APIClient
    alice_client = APIClient()
    alice_client.force_authenticate(user=alice)

    # create task as alice
    create_res = alice_client.post("/api/tasks/", data={"title": "A1", "status": "todo", "order": 0})
    assert create_res.status_code == 201
    task_id = create_res.data["id"]

    # bob tries to edit title -> should be forbidden by view logic (permission check raises)
    bob_client = APIClient()
    bob_client.force_authenticate(user=bob)
    update_res = bob_client.put(f"/api/tasks/{task_id}/", data={"title": "Broke"})
    assert update_res.status_code in (403, 400, 405)

    # alice can delete
    del_res = alice_client.delete(f"/api/tasks/{task_id}/")
    assert del_res.status_code == 204


@pytest.mark.django_db
def test_reorder(api_client, create_user):
    user = create_user(username="c", email="c@example.com")
    from rest_framework.test import APIClient
    client = APIClient()
    client.force_authenticate(user=user)

    # create multiple tasks
    ids = []
    for i in range(5):
        r = client.post("/api/tasks/", data={"title": f"T{i}", "status": "todo", "order": i})
        assert r.status_code == 201
        ids.append(r.data["id"])

    # reorder task 0 to position 3
    r2 = client.post("/api/tasks/reorder/", data={"task_id": ids[0], "status": "todo", "order": 3})
    assert r2.status_code == 200
