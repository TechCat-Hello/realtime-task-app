from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


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
