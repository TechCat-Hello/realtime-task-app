from rest_framework import serializers
from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    # ✅ 完了フラグ（既存）
    completed = serializers.SerializerMethodField()

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
            "completed",
            "username",      # ← ★追加
            "created_at",
            "updated_at",
        ]

    def get_completed(self, obj):
        return obj.status == "done"
