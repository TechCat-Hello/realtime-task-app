# tasks/serializers.py
from rest_framework import serializers
from .models import Task

class TaskSerializer(serializers.ModelSerializer):
    completed = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'status', 'completed', 'created_at', 'updated_at']

    def get_completed(self, obj):
        return obj.status == "done"  # status が "done" ならチェック済み
