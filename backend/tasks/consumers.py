import json
from channels.generic.websocket import AsyncWebsocketConsumer

class TaskConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "tasks"

        # グループ参加
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
        # グループ離脱
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    # group_send から呼ばれる
    async def task_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "task_update",
            "task": event["task"]
        }))

