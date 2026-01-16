import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
import logging

logger = logging.getLogger(__name__)

class TaskConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        #  下位互換性: URL認証（旧方式）とメッセージ認証（新方式）の両方をサポート
        self.authenticated = False
        self.user = None
        self.group_name = "tasks_all"
        self.auth_timeout_task = None
        
        #  旧方式: URLパラメータからのトークン認証（下位互換性のため残す）
        query_string = self.scope.get('query_string', b'').decode()
        from urllib.parse import parse_qs
        query_params = parse_qs(query_string)
        url_token = query_params.get('token', [None])[0]
        
        if url_token:
            # 旧クライアント用: URL認証
            from tasks.middleware import get_user_from_token
            user = await get_user_from_token(url_token)
            if not user.is_anonymous:
                self.authenticated = True
                self.user = user
                await self.channel_layer.group_add(
                    self.group_name,
                    self.channel_name
                )
                await self.accept()
                logger.info(f"WebSocket authenticated (legacy URL auth) - User: {user.username}")
                return
        
        # 🆕 新方式: 接続を許可し、メッセージで認証を待つ
        await self.accept()
        logger.info("WebSocket connection accepted - awaiting authentication message")
        
        # ⏱️ 5秒以内に認証しなければ切断
        self.auth_timeout_task = asyncio.create_task(self._auth_timeout())
    
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
    
    async def receive(self, text_data):
        """クライアントからのメッセージ受信"""
        try:
            data = json.loads(text_data)
            msg_type = data.get('type')
            
            # 📝 認証メッセージの処理
            if msg_type == 'auth':
                await self._handle_auth(data.get('token'))
                return
            
            # 🔒 認証済みでないと他のメッセージは処理しない
            if not self.authenticated:
                logger.warning("Received message before authentication")
                await self.send(text_data=json.dumps({
                    "type": "error",
                    "message": "認証が必要です"
                }))
                return
            
            # ここに他のメッセージタイプの処理を追加可能
            logger.info(f"Received message type: {msg_type}")
            
        except json.JSONDecodeError:
            logger.error("Invalid JSON received")
    
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
        
        # ✅ 認証成功
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

