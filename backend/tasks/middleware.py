from urllib.parse import parse_qs
from channels.db import database_sync_to_async


@database_sync_to_async
def get_user_from_token(token_string):
    from django.contrib.auth import get_user_model
    from django.contrib.auth.models import AnonymousUser
    from rest_framework_simplejwt.tokens import AccessToken
    
    User = get_user_model()
    
    try:
        access_token = AccessToken(token_string)
        user_id = access_token['user_id']
        user = User.objects.get(id=user_id)
        return user
    except Exception:
        return AnonymousUser()


class JWTAuthMiddleware:
    """
    WebSocket connections with JWT token authentication
    接続時は認証なし、初回メッセージで認証を行う
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        from django.contrib.auth.models import AnonymousUser
        
        # 初期接続は匿名ユーザーとして許可（認証は接続後のメッセージで実施）
        scope['user'] = AnonymousUser()

        return await self.app(scope, receive, send)
