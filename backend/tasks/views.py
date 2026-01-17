from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from django.db import transaction

from .models import Task
from .serializers import TaskSerializer
from .slack_notifier import notify_task_created, notify_task_done, notify_task_title_updated

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Task.objects.all().order_by("status", "order")

    def perform_create(self, serializer):
        task = serializer.save(user=self.request.user)
        self.broadcast_task_update(task)
        notify_task_created(task)

    def perform_update(self, serializer):
        task = self.get_object()
        request_user = self.request.user
        is_owner = task.user == request_user

        validated = serializer.validated_data

        if "title" in validated:
            if not is_owner:
                raise PermissionDenied("タスク名を変更できるのは作成者だけです。")
            old_title = task.title
            new_title = validated["title"]
            notify_task_title_updated(old_title, new_title, request_user.username)

        updated_task = serializer.save()

        if "status" in validated and validated["status"] == "done" and task.status != "done":
            notify_task_done(updated_task)
        
        self.broadcast_task_update(updated_task)

    def perform_destroy(self, instance):
        is_owner = instance.user == self.request.user

        if not is_owner:
            raise PermissionDenied("このタスクを削除できるのは作成者だけです。")

        task_title = instance.title
        task_id = instance.id
        instance.delete()

        from .slack_notifier import send_slack_notification
        message = f"タスク「{task_title}」(ID: {task_id}) が削除されました。\n削除者: @{self.request.user.username}"
        send_slack_notification(message, title="🗑️ タスク削除", color="#d32f2f")

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "tasks_all",
            {
                "type": "task_delete",
                "task_id": task_id,
            }
        )

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        task_id = request.data.get("task_id")
        new_status = request.data.get("status")
        new_order = request.data.get("order")

        if task_id is None:
            return Response(
                {"error": "task_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                task = Task.objects.select_for_update().get(id=task_id)

                is_owner = (task.user == request.user)
                is_admin = request.user.is_staff

                # new_status should be one of the status keys (strings)
                valid_statuses = [s[0] for s in Task.STATUS_CHOICES]
                if new_status not in valid_statuses:
                    return Response({"error": "invalid status"}, status=status.HTTP_400_BAD_REQUEST)

                try:
                    new_order = int(new_order)
                except (TypeError, ValueError):
                    return Response({"error": "invalid order"}, status=status.HTTP_400_BAD_REQUEST)

                old_status = task.status

                if not is_owner and not is_admin:
                    return Response(
                        {"error": "他のユーザーのタスクは移動できません。"},
                        status=status.HTTP_403_FORBIDDEN,
                    )

                if is_admin and not is_owner and new_status != old_status:
                    return Response(
                        {"error": "管理者でも、他のユーザーのタスクを別のカラムへは移動できません。"},
                        status=status.HTTP_403_FORBIDDEN,
                    )

                task.status = new_status
                task.save()

                if new_status == "done" and old_status != "done":
                    notify_task_done(task)
                tasks_same_column = (
                    Task.objects
                    .filter(status=new_status)
                    .order_by("order")
                )

                tasks_same_column = [t for t in tasks_same_column if t.id != task.id]

                if new_order < 0:
                    new_order = 0
                if new_order > len(tasks_same_column):
                    new_order = len(tasks_same_column)

                tasks_same_column.insert(new_order, task)

                for i, t in enumerate(tasks_same_column):
                    t.order = i
                    t.save()
        except Task.DoesNotExist:
            return Response({"error": "task not found"}, status=status.HTTP_404_NOT_FOUND)

        self.broadcast_all_tasks()
        return Response({"status": "ok"})

    def broadcast_task_update(self, task):
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "tasks_all",
            {
                "type": "task_update",
                "task": TaskSerializer(task).data,
            }
        )

    def broadcast_all_tasks(self):
        channel_layer = get_channel_layer()
        tasks = TaskSerializer(
            Task.objects.all().order_by("status", "order"),
            many=True
        ).data

        async_to_sync(channel_layer.group_send)(
            "tasks_all",
            {
                "type": "task_bulk_update",
                "tasks": tasks,
            }
        )


