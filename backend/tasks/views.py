# tasks/views.py
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

from django.db import transaction

from .models import Task
from .serializers import TaskSerializer

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all().order_by("order")
    serializer_class = TaskSerializer

    # =========================
    # CRUD
    # =========================
    def perform_create(self, serializer):
        task = serializer.save()
        self.broadcast_task_update(task)

    def perform_update(self, serializer):
        task = serializer.save()
        self.broadcast_task_update(task)

    def perform_destroy(self, instance):
        task_id = instance.id
        instance.delete()

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "tasks",
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
            old_status = task.status

            # 元の列
            old_tasks = (
                Task.objects
                .filter(status=old_status)
                .exclude(id=task_id)
                .order_by("order")
            )

            # 移動先の列
            new_tasks = (
                Task.objects
                .filter(status=new_status)
                .exclude(id=task_id)
                .order_by("order")
            )

            # 元の列を詰め直す
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

        # 🔴 並び替えは「全件同期」が正解
        self.broadcast_all_tasks()

        return Response({"status": "ok"})

    # =========================
    # WebSocket helpers
    # =========================
    def broadcast_task_update(self, task):
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "tasks",
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
            "tasks",
            {
                "type": "task_bulk_update",
                "tasks": tasks,
            }
        )
