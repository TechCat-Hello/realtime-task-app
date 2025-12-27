from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User


def home(request):
    return HttpResponse("Task Management API - Backend is running")


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

    user = User.objects.create_user(username=username, email=email, password=password)
    return Response({"id": user.id, "username": user.username, "email": user.email}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password(request):
    """Request password reset. Expects JSON: {email}."""
    email = request.data.get("email")

    if not email:
        return Response({"error": "email is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
        return Response({"message": "If email exists, password reset link will be sent"}, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({"message": "If email exists, password reset link will be sent"}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password(request):
    """Reset password. Expects JSON: {email, new_password}."""
    email = request.data.get("email")
    new_password = request.data.get("new_password")
    
    if not email or not new_password:
        return Response({"error": "email and new_password are required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
        user.set_password(new_password)
        user.save()
        return Response({"message": "password reset successfully"}, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({"error": "email not found"}, status=status.HTTP_404_NOT_FOUND)
