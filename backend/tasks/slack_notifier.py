import os
import requests
from django.conf import settings


def send_slack_notification(message: str, title: str = None, color: str = "#36a64f"):
    """
    Slack webhook を通じてメッセージを送信します。
    
    Args:
        message: 通知の本文テキスト
        title: 通知のタイトル（オプション）
        color: メッセージの色コード（デフォルト: 緑 #36a64f）
    """
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    
    # webhook URL が設定されていない場合はスキップ
    if not webhook_url:
        return
    
    payload = {
        "attachments": [
            {
                "color": color,
                "title": title or "Task Notification",
                "text": message,
                "footer": "Task Board",
            }
        ]
    }
    
    try:
        response = requests.post(webhook_url, json=payload, timeout=5)
        response.raise_for_status()
    except requests.RequestException as e:
        # ログに記録してサイレント失敗（API エラーは返さない）
        print(f"Slack notification failed: {e}")


def notify_task_created(task):
    """タスク作成時の通知"""
    message = f"新しいタスク「{task.title}」が作成されました。\n作成者: @{task.user.username}"
    send_slack_notification(message, title="📝 新しいタスク", color="#2196f3")


def notify_task_done(task):
    """タスク完了時の通知"""
    message = f"タスク「{task.title}」が完了しました。\n担当者: @{task.user.username}"
    send_slack_notification(message, title="✅ タスク完了", color="#2e7d32")


def notify_task_title_updated(old_title: str, new_title: str, username: str):
    """タスクタイトル編集時の通知"""
    message = f"タスク「{old_title}」が「{new_title}」に変更されました。\n編集者: @{username}"
    send_slack_notification(message, title="✏️ タスク名が変更されました", color="#f9a825")
