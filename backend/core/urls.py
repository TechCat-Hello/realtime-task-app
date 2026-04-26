# core/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from . import views
from .views import CustomTokenObtainPairView


urlpatterns = [
    path("admin/", admin.site.urls),

    # JWT
    path(
        "api/token/",
        CustomTokenObtainPairView.as_view(permission_classes=[AllowAny]),
        name="token_obtain"
    ),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # API
    path("api/", include("tasks.urls")),

    # その他
    path("api/me/", views.current_user),
    path("api/register/", views.register),
    path("api/forgot-password/", views.forgot_password),
    path("api/reset-password/", views.reset_password),

    # ALB health check (no auth required)
    path("api/health/", views.health),

    path("", views.home),
]



