from rest_framework.permissions import BasePermission

class IsTaskOwnerOnly(BasePermission):
    message = "このタスクを編集できるのは作成者だけです。"

    def has_object_permission(self, request, view, obj):
        return obj.user == request.user
