from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User


def home(request):
    return HttpResponse("Hello, this is the homepage!")


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
def register(request):
    """Create a new user. Expects JSON: {username, password}."""
    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response({"error": "username and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({"error": "username already exists"}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, password=password)
    return Response({"id": user.id, "username": user.username}, status=status.HTTP_201_CREATED)
