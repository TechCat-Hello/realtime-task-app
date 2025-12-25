from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from django.db import transaction

from .models import Task
from .serializers import TaskSerializer

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    # =========================
    # 取得（全員 → 全タスク表示）
    # =========================
    def get_queryset(self):
        return Task.objects.all().order_by("status", "order")

    # =========================
    # 作成
    # =========================
    def perform_create(self, serializer):
        task = serializer.save(user=self.request.user)
        self.broadcast_task_update(task)

    # =========================
    # 更新（★ title は作成者だけ）
    # =========================
    def perform_update(self, serializer):
        task = self.get_object()
        request_user = self.request.user

        # いまの値
        old_title = task.title

        # 保存前にデータだけ取得
        validated = serializer.validated_data

        # title が更新されようとしている？
        if "title" in validated:
            new_title = validated["title"]

            # 変更しようとしていて & 作成者でない
            if new_title != old_title and task.user != request_user:
                raise PermissionDenied(
                    "タスク名を変更できるのは作成者だけです。"
                )

        # それ以外はOK
        updated_task = serializer.save()
        self.broadcast_task_update(updated_task)

    # =========================
    # 削除（★ 作成者だけ）
    # =========================
    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            raise PermissionDenied("このタスクを削除できるのは作成者だけです。")

        task_id = instance.id
        instance.delete()

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "tasks_all",
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

            # 並び替えは「本人だけ」
            if task.user != request.user:
                return Response(
                    {"error": "permission denied"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # int 変換（安全策）
            new_order = int(new_order)

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

            for i, t in enumerate(old_tasks):
                t.order = i
                t.save()

            task.status = new_status
            task.order = new_order
            task.save()

            for i, t in enumerate(new_tasks):
                t.order = i + 1 if i >= new_order else i
                t.save()

        self.broadcast_all_tasks()
        return Response({"status": "ok"})

    # =========================
    # WebSocket helpers
    # =========================
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

