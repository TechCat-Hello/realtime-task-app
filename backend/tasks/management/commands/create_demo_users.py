from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Create app admin and demo users for production'

    def handle(self, *args, **options):
        # アプリ用管理者（Django管理画面にはアクセスできない）
        if not User.objects.filter(username='admin').exists():
            admin = User.objects.create_user(
                username='admin',
                password='demo789!',
                is_staff=True,  # アプリ内管理者
                is_superuser=False  # Django管理画面にはアクセス不可
            )
            self.stdout.write(self.style.SUCCESS(f'✓ App admin user created: {admin.username}'))
        else:
            self.stdout.write(self.style.WARNING('App admin user already exists'))

        # 一般ユーザー
        if not User.objects.filter(username='user1').exists():
            user1 = User.objects.create_user(
                username='user1',
                password='password123!',
                is_staff=False
            )
            self.stdout.write(self.style.SUCCESS(f'✓ Demo user created: {user1.username}'))
        else:
            self.stdout.write(self.style.WARNING('Demo user already exists'))

        self.stdout.write(self.style.SUCCESS('\n=== Demo Users ==='))
        self.stdout.write('App Admin: admin / demo789!')
        self.stdout.write('Regular User: user1 / password123!')
