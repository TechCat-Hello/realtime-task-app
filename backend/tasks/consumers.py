import json
from channels.generic.websocket import AsyncWebsocketConsumer

class TaskConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]

        # 🔒 未ログインは WebSocket 接続拒否
        if user.is_anonymous:
            await self.close()
            return

        # ✅ 全員共通グループに変更（これが重要！）
        self.group_name = "tasks_all"

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

        # （デバッグ用・あってもなくてもOK）
        await self.send(text_data=json.dumps({
            "type": "connection",
            "message": f"connected to tasks_all as user {user.id}"
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    # =========================
    # 単体更新
    # =========================
    async def task_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "task_update",
            "task": event["task"]
        }))

    # =========================
    # 削除
    # =========================
    async def task_delete(self, event):
        await self.send(text_data=json.dumps({
            "type": "task_delete",
            "task_id": event["task_id"]
        }))

    # =========================
    # 並び替え（全件同期）
    # =========================
    async def task_bulk_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "task_bulk_update",
            "tasks": event["tasks"]
        }))

