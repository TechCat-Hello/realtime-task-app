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

    def get_queryset(self):
        return Task.objects.all().order_by("status", "order")

    def perform_create(self, serializer):
        task = serializer.save(user=self.request.user)
        self.broadcast_task_update(task)

    # =========================
    # 更新（title は作成者だけ）
    # =========================
    def perform_update(self, serializer):
        task = self.get_object()
        request_user = self.request.user

        validated = serializer.validated_data

        if "title" in validated:
            if task.user != request_user:
                raise PermissionDenied(
                    "タスク名を変更できるのは作成者だけです。"
                )

        updated_task = serializer.save()
        self.broadcast_task_update(updated_task)

    # =========================
    # 削除（作成者だけ）
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

            # -----------------------------
            # ★ ここが重要
            # 1. 本人 → OK
            # 2. 管理者 → OK（ただし同じカラムのみ）
            # 3. それ以外 → 403
            # -----------------------------
            is_owner = (task.user == request.user)
            is_admin = request.user.is_staff

            # int へ変換
            new_order = int(new_order)

            old_status = task.status

            # ★ 別カラムへ移動しようとした場合
            if new_status != old_status:

                # 管理者含めて「全員 NG」
                return Response(
                    {"error": "別のカラムへ移動することはできません。"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # ★ 同じカラム内だけど
            #   → 作成者ではなく & 管理者でもない
            if not is_owner and not is_admin:
                return Response(
                    {"error": "他のユーザーのタスクは移動できません。"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # -----------------------------
            # 並び替え処理（同じカラムのみ）
            # -----------------------------
            tasks_same_column = (
                Task.objects
                .filter(status=old_status)
                .order_by("order")
            )

            tasks_same_column = [t for t in tasks_same_column if t.id != task.id]

            tasks_same_column.insert(new_order, task)

            for i, t in enumerate(tasks_same_column):
                t.order = i
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

