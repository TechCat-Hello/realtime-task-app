from django.db import models

# 例: Task モデル
class Task(models.Model):
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    completed = models.BooleanField(default=False)

    def __str__(self):
        return self.title

