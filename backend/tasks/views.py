from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.db import transaction

from .models import Task
from .serializers import TaskSerializer

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    # =========================
    # 取得制御（★最重要）
    # =========================
    def get_queryset(self):
        user = self.request.user

        # 管理者は全件
        if user.is_staff or user.is_superuser:
            return Task.objects.all().order_by("status", "order")

        # 一般ユーザーは自分のタスクのみ
        return Task.objects.filter(user=user).order_by("status", "order")

    # =========================
    # CRUD
    # =========================
    def perform_create(self, serializer):
        task = serializer.save(user=self.request.user)
        self.broadcast_task_update(task)

    def perform_update(self, serializer):
        task = serializer.save()
        self.broadcast_task_update(task)

    def perform_destroy(self, instance):
        task_id = instance.id
        user_id = instance.user.id
        instance.delete()

        channel_layer = get_channel_layer()
        group_name = f"tasks_user_{user_id}"

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "task_delete",
                "task_id": task_id,
            }
        )

    # =========================
    # 並び替え（Drag & Drop）
    # =========================
    @action(detail=False, methods=["post"])
    def reorder(self, request):
        """
        {
          task_id: number,
          status: string,
          order: number
        }
        """
        task_id = request.data.get("task_id")
        new_status = request.data.get("status")
        new_order = request.data.get("order")

        if task_id is None:
            return Response(
                {"error": "task_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            task = Task.objects.select_for_update().get(id=task_id)

            # 🔐 権限制御（管理者 or 本人のみ）
            if not (request.user.is_staff or task.user == request.user):
                return Response(
                    {"error": "permission denied"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            old_status = task.status

            old_tasks = (
                Task.objects
                .filter(user=task.user, status=old_status)
                .exclude(id=task_id)
                .order_by("order")
            )

            new_tasks = (
                Task.objects
                .filter(user=task.user, status=new_status)
                .exclude(id=task_id)
                .order_by("order")
            )

            # 元の列を詰める
            for i, t in enumerate(old_tasks):
                t.order = i
                t.save()

            # 移動タスク
            task.status = new_status
            task.order = new_order
            task.save()

            # 移動先をずらす
            for i, t in enumerate(new_tasks):
                t.order = i + 1 if i >= new_order else i
                t.save()

        # 🔴 並び替え後は「その user のみ」同期
        self.broadcast_all_tasks_for_user(task.user)

        return Response({"status": "ok"})

    # =========================
    # WebSocket helpers
    # =========================
    def broadcast_task_update(self, task):
        channel_layer = get_channel_layer()
        group_name = f"tasks_user_{task.user.id}"

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "task_update",
                "task": TaskSerializer(task).data,
            }
        )

    def broadcast_all_tasks_for_user(self, user):
        channel_layer = get_channel_layer()
        group_name = f"tasks_user_{user.id}"

        tasks = TaskSerializer(
            Task.objects.filter(user=user).order_by("status", "order"),
            many=True
        ).data

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "task_bulk_update",
                "tasks": tasks,
            }
        )
