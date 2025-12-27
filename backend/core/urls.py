# core/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from . import views

urlpatterns = [
    path("admin/", admin.site.urls),

    # ✅ JWT（必ず api/ include より前）
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # API
    path("api/", include("tasks.urls")),

    # Current user info (authenticated)
    path("api/me/", views.current_user),
    # User registration
    path("api/register/", views.register),
    # Password reset
    path("api/forgot-password/", views.forgot_password),
    path("api/reset-password/", views.reset_password),

    # フロント用
    path("", views.home),
]


