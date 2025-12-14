# tasks/views.py
from rest_framework import viewsets
from .models import Task
from .serializers import TaskSerializer

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all().order_by("order")
    serializer_class = TaskSerializer

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

    def broadcast_task_update(self, task):
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "tasks",
            {
                "type": "task_update",
                "task": TaskSerializer(task).data,
            }
        )
