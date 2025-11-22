# tasks/views.py
from rest_framework import generics
from .models import Task
from .serializers import TaskSerializer
from rest_framework import viewsets

'''class TaskListView(generics.ListCreateAPIView):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer'''

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all().order_by('-created_at')
    serializer_class = TaskSerializer
