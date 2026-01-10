from rest_framework import serializers
from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    # ✅ 作成者のユーザー名を追加
    username = serializers.CharField(
        source="user.username",
        read_only=True
    )

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "status",
            "username",
            "created_at",
            "updated_at",
        ]
