# tasks/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer


class TaskConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "tasks"

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

        await self.send(text_data=json.dumps({
            "type": "connection",
            "message": "connected"
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    # 単体更新
    async def task_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "task_update",
            "task": event["task"]
        }))

    # 削除
    async def task_delete(self, event):
        await self.send(text_data=json.dumps({
            "type": "task_delete",
            "task_id": event["task_id"]
        }))

    # ✅ 並び替え用（超重要）
    async def task_bulk_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "task_bulk_update",
            "tasks": event["tasks"]
        }))
