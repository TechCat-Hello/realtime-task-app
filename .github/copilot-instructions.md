# TaskSync - AI Coding Agent Instructions

## Architecture Overview

This is a **real-time collaborative task management app** with a Django backend (WebSocket + REST API) and React frontend.

### Tech Stack
- **Backend**: Django 5.x + Django REST Framework + Django Channels (WebSockets)
- **Frontend**: React 19 + Material-UI + @hello-pangea/dnd (drag-and-drop)
- **Database**: PostgreSQL (production on Supabase), SQLite (tests)
- **Auth**: JWT via django-rest-framework-simplejwt
- **Deploy**: Render (frontend static site + backend with Daphne ASGI server)

### Key Components
- **WebSocket**: All users connect to a single `tasks_all` group ([consumers.py](backend/tasks/consumers.py)) - changes broadcast instantly
- **Permission System**: Fine-grained control in [permissions.py](backend/tasks/permissions.py) and [views.py](backend/tasks/views.py#L33-L38)
- **Slack Integration**: Task events trigger Slack webhook notifications ([slack_notifier.py](backend/tasks/slack_notifier.py))

## Critical Patterns & Conventions

### 1. Permission Model (DO NOT BREAK)
The app has **role-based restrictions** enforced server-side:

**Task Owners** (creator): Full control (edit, move, delete)
**Admins** (`is_staff=True`): Can reorder others' tasks within same column, cannot edit/delete
**Regular Users**: Can only view others' tasks

Example enforcement in [views.py](backend/tasks/views.py#L33-L38):
```python
if "title" in validated:
    if task.user != request_user:
        raise PermissionDenied("タスク名を変更できるのは作成者だけです。")
```

Frontend mirrors this in [TaskList.js](frontend/src/TaskList.js) - check `isOwner` before enabling edit/delete buttons.

### 2. WebSocket Communication Flow
1. Frontend connects with JWT token in query params: `wss://.../?token=${accessToken}`
2. Backend validates JWT via [middleware.py](backend/tasks/middleware.py#L21-L30) - rejects anonymous users
3. All authenticated users join `tasks_all` group in [consumers.py](backend/tasks/consumers.py#L17)
4. Three message types:
   - `task_update` - single task created/edited
   - `task_delete` - task removed
   - `task_bulk_update` - batch reorder (sent from `reorder` endpoint)

**When modifying tasks**: Always call `self.broadcast_task_update(task)` in [views.py](backend/tasks/views.py#L27) to sync changes.

### 3. Task Reordering Logic
The `/tasks/reorder/` endpoint ([views.py](backend/tasks/views.py#L74-L170)) handles drag-and-drop:
- Uses `select_for_update()` for atomic operations
- Validates permission based on `is_owner` vs `is_admin` vs column change
- Updates `order` field for affected tasks in the target column
- Broadcasts full task list via `task_bulk_update`

**Frontend DnD**: [TaskList.js](frontend/src/TaskList.js) uses `@hello-pangea/dnd` - `onDragEnd` calls `/reorder/` with `task_id`, `status`, `order`.

### 4. Test Setup
- Tests run with **in-memory SQLite**, not Postgres ([conftest.py](backend/conftest.py#L5-L9))
- Use `@pytest.fixture` `auth_client` for authenticated requests
- Run: `cd backend && pytest` (no Docker needed)
- Settings: [test_settings.py](backend/core/test_settings.py) for isolated test config

## Development Workflows

### Local Development
```bash
# Start backend + database
docker-compose up

# Frontend (separate terminal)
cd frontend && npm install && npm start
```

Backend runs on http://localhost:8000 (Daphne ASGI), frontend on http://localhost:3000.

**Note**: Frontend service commented out in [docker-compose.yml](docker-compose.yml#L28-L39) - run manually for hot reload.

### Running Tests
```bash
cd backend
pytest                    # All tests
pytest tests/test_tasks.py -v  # Specific file
```

### Creating Demo Users
```bash
cd backend
python manage.py create_demo_users
```
Creates `admin` (staff) and `user1` (regular) - see [create_demo_users.py](backend/tasks/management/commands/create_demo_users.py).

## Deployment (Render)

Configured in [render.yaml](render.yaml):
- **Backend**: Runs `daphne -b 0.0.0.0 -p $PORT core.asgi:application` (WebSocket support)
- **Frontend**: Static build (`npm run build`)
- Set `DATABASE_URL`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `SLACK_WEBHOOK_URL` in Render dashboard

**IMPORTANT**: Production uses `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` env vars split by comma - update both when deploying.

## Common Tasks

### Adding a New Task Field
1. Update [models.py](backend/tasks/models.py) - add field
2. Generate migration: `python manage.py makemigrations`
3. Update [serializers.py](backend/tasks/serializers.py) - include field
4. Update [TaskList.js](frontend/src/TaskList.js) - display field
5. Test WebSocket sync - confirm new field broadcasts

### Modifying Permissions
- Server-side: [views.py](backend/tasks/views.py) - check `request.user` vs `task.user`
- Custom DRF permission: [permissions.py](backend/tasks/permissions.py)
- Frontend validation: [TaskList.js](frontend/src/TaskList.js) - use `me === task.username` and `isAdmin`

### Debugging WebSocket Issues
1. Check browser console for WebSocket errors
2. Backend logs show connection attempts ([consumers.py](backend/tasks/consumers.py#L8))
3. Verify JWT token in localStorage: `localStorage.getItem('accessToken')`
4. Test auth middleware: [middleware.py](backend/tasks/middleware.py) logs token validation

## Integration Points

- **Slack**: POST requests to `SLACK_WEBHOOK_URL` - disable by leaving env var empty
- **Auth**: JWT access token (60min), refresh in localStorage
- **CORS**: Backend allows origins in `CORS_ALLOWED_ORIGINS` (comma-separated)
- **Static Files**: Whitenoise serves in production ([settings.py](backend/core/settings.py#L62))

## Japanese Language Notes
User-facing error messages are in Japanese (e.g., `"タスク名を変更できるのは作成者だけです。"`). Maintain this convention for consistency.
