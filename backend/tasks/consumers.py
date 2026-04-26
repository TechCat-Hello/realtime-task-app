  GNU nano 7.2                                                                                   backend/tasks/consumers.py *
import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
import logging

logger = logging.getLogger(__name__)

class TaskConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.authenticated = True
        self.user = None

        await self.channel_layer.group_add(
            "tasks_all",
            self.channel_name
        )

        await self.accept()

    async def receive(self, text_data):
        print("RECEIVED:", text_data)

        await self.send(text_data=json.dumps({
            "type": "echo",
            "message": text_data
        }))

    async def _auth_timeout(self):
        """認証タイムアウト処理（5秒）"""
        await asyncio.sleep(5)
        if not self.authenticated:
            logger.warning("WebSocket authentication timeout - closing connection")
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": "認証タイムアウト"
            }))
            await self.close()

    async def _handle_auth(self, token):
        """認証処理"""
        if not token:
            logger.warning("Authentication failed - no token provided")
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": "トークンが必要です"
            }))
            await self.close()
            return

        # トークンから認証
        from tasks.middleware import get_user_from_token
        user = await get_user_from_token(token)

        if user.is_anonymous:
            logger.warning("Authentication failed - invalid token")
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": "認証に失敗しました"
            }))
            await self.close()
            return

        # 認証成功
        self.authenticated = True
        self.user = user

        # タイムアウトタスクをキャンセル
        if self.auth_timeout_task:
            self.auth_timeout_task.cancel()

        # グループに追加
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        logger.info(f"WebSocket authenticated - User: {user.username} (ID: {user.id})")

        await self.send(text_data=json.dumps({
            "type": "authenticated",
            "message": f"認証成功: {user.username}"
        }))

    async def disconnect(self, close_code):
        # タイムアウトタスクをキャンセル
        if hasattr(self, 'auth_timeout_task') and self.auth_timeout_task:
            self.auth_timeout_task.cancel()

        # グループから削除（認証済みの場合のみ）
        if self.authenticated and hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
            logger.info(f"WebSocket disconnected - User: {self.user.username if self.user else 'Unknown'}")

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
