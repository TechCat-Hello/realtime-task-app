from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.http import HttpResponse
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.contrib.auth.tokens import default_token_generator
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework import status
from django.contrib.auth.models import User
from rest_framework_simplejwt.views import TokenObtainPairView
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator


class ClientIPRateThrottle(SimpleRateThrottle):
    """Rate limit by client IP, whether or not the caller is authenticated.

    DRF's built-in AnonRateThrottle stops applying once a request carries
    credentials, which is the wrong behaviour for endpoints that are meant to
    be reachable without logging in. get_ident() honours REST_FRAMEWORK's
    NUM_PROXIES, so the IP is the real client rather than the load balancer.
    """

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class LoginRateThrottle(ClientIPRateThrottle):
    scope = "login"


class RegisterRateThrottle(ClientIPRateThrottle):
    scope = "register"


class PasswordResetRateThrottle(ClientIPRateThrottle):
    """Guards the endpoints that send mail.

    Without this, anyone can make the app send unlimited reset mail to an
    address they don't own: that floods the victim's inbox, burns the SES
    daily quota, and pushes the bounce/complaint rate towards a sending
    suspension.
    """

    scope = "password_reset"


@method_decorator(csrf_exempt, name='dispatch')
class CustomTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [LoginRateThrottle]

def home(request):
    return HttpResponse("Task Management API - Backend is running")

def health(request):
    """ALB health check endpoint. No authentication required."""
    return HttpResponse("ok", status=200)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Return basic info about the currently authenticated user."""
    user = request.user
    return Response({
        "username": user.username,
        "is_staff": user.is_staff,
    })


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([RegisterRateThrottle])
def register(request):
    """Create a new user. Expects JSON: {username, email, password}."""
    username = request.data.get("username")
    email = request.data.get("email")
    password = request.data.get("password")

    if not username or not email or not password:
        return Response({"error": "username, email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({"error": "username already exists"}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email=email).exists():
        return Response({"error": "email already exists"}, status=status.HTTP_400_BAD_REQUEST)

    # AUTH_PASSWORD_VALIDATORS only runs through Django's forms, so an API that
    # calls create_user() directly would otherwise accept any password at all.
    try:
        validate_password(password, user=User(username=username, email=email))
    except ValidationError as exc:
        return Response({"error": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, email=email, password=password)
    return Response({"id": user.id, "username": user.username, "email": user.email}, status=status.HTTP_201_CREATED)

RESET_SENT_MESSAGE = "登録されているメールアドレスの場合、パスワード再設定用のメールを送信しました。"


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def forgot_password(request):
    """Request password reset. Expects JSON: {email}.

    Always responds with the same message regardless of whether the email is
    registered, so a caller can't use this endpoint to discover which emails
    have accounts.
    """
    email = request.data.get("email")

    if not email:
        return Response({"error": "email is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_link = f"{settings.FRONTEND_URL}/?reset_uid={uid}&reset_token={token}"
        send_mail(
            subject="【TaskSync】パスワード再設定のご案内",
            message=(
                "パスワード再設定のリクエストを受け付けました。\n"
                "以下のリンクから新しいパスワードを設定してください。\n\n"
                f"{reset_link}\n\n"
                "このリクエストに心当たりがない場合は、このメールを無視してください。"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
        )
    except User.DoesNotExist:
        pass

    return Response({"message": RESET_SENT_MESSAGE}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def reset_password(request):
    """Reset a password using the uid/token issued by forgot_password.

    The token is tied to the user's current password hash (via Django's
    default_token_generator), so it stops working as soon as it's used once
    or the password otherwise changes, and it expires automatically after
    PASSWORD_RESET_TIMEOUT (1 hour, see settings).
    """
    uid = request.data.get("uid")
    token = request.data.get("token")
    new_password = request.data.get("new_password")

    if not uid or not token or not new_password:
        return Response(
            {"error": "uid, token and new_password are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({"error": "無効なリンクです"}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response(
            {"error": "リンクの有効期限が切れているか、無効です"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Checked after the token so an invalid link never reveals anything about
    # the account, and so a valid link can't be used to set a trivial password.
    try:
        validate_password(new_password, user=user)
    except ValidationError as exc:
        return Response({"error": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()
    return Response({"message": "パスワードを再設定しました"}, status=status.HTTP_200_OK)
