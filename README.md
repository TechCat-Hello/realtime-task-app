# Real-Time Task Management Application

A full-stack web application for collaborative task management with real-time updates using WebSockets. Built as a portfolio project demonstrating modern full-stack development practices.

## Features

- **User Authentication**: Register, login, and password reset with JWT tokens
- **Real-Time Task Updates**: WebSocket integration for instant task synchronization across clients
- **Task Management**: Create, read, update, delete, and reorder tasks
- **Kanban Board**: Organize tasks in To Do, In Progress, and Done columns
- **Drag & Drop**: Intuitive interface for moving tasks between columns
- **Role-Based Permissions**: Owner can delete, assignee can edit, admin has elevated privileges
- **Responsive Design**: Mobile-first approach with Material-UI for all screen sizes
- **Status Overview**: Visual progress bar showing task distribution by status

## Technology Stack

### Backend
- **Framework**: Django 5.2
- **REST API**: Django Rest Framework
- **WebSocket**: Django Channels with Daphne
- **Authentication**: SimpleJWT (JSON Web Tokens)
- **Database**: PostgreSQL
- **Testing**: pytest, pytest-django, pytest-asyncio

### Frontend
- **Framework**: React 19
- **UI Components**: Material-UI v5
- **State Management**: React Hooks (useState, useEffect)
- **Drag & Drop**: @hello-pangea/dnd
- **HTTP Client**: Axios

## Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- Docker & Docker Compose (optional)

### Backend Setup

1. **Create and activate virtual environment**
   ```bash
   cd backend
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run migrations**
   ```bash
   python manage.py migrate
   ```

5. **Create superuser (optional)**
   ```bash
   python manage.py createsuperuser
   ```

6. **Start development server**
   ```bash
   daphne -b 0.0.0.0 -p 8000 core.asgi:application
   ```

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server**
   ```bash
   npm start
   ```

The app will be available at `http://localhost:3000`

## Running with Docker

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

## Testing

### Running Backend Tests

```bash
cd backend
pytest
```

Run with coverage:
```bash
pytest --cov=tasks --cov=core
```

### Running Frontend Tests

```bash
cd frontend
npm test
```

## Project Structure

```
.
├── backend/
│   ├── core/              # Django settings and configuration
│   │   ├── settings.py    # Django configuration
│   │   ├── asgi.py        # ASGI configuration for WebSockets
│   │   └── urls.py        # URL routing
│   ├── tasks/             # Task app
│   │   ├── models.py      # Task data model
│   │   ├── views.py       # API endpoints and WebSocket handlers
│   │   ├── serializers.py # DRF serializers
│   │   ├── routing.py     # WebSocket routing
│   │   └── consumers.py   # WebSocket consumer
│   ├── manage.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   ├── Login.js       # Authentication forms
│   │   ├── TaskList.js    # Task board component
│   │   ├── api.js         # Axios instance with JWT interceptors
│   │   └── index.js
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/register/` - Register new user
- `POST /api/token/` - Login and get JWT tokens
- `POST /api/token/refresh/` - Refresh access token
- `POST /api/forgot-password/` - Initiate password reset
- `POST /api/reset-password/` - Complete password reset
- `GET /api/me/` - Get current user info

### Tasks
- `GET /api/tasks/` - List all tasks
- `POST /api/tasks/` - Create new task
- `PUT /api/tasks/{id}/` - Update task
- `DELETE /api/tasks/{id}/` - Delete task
- `POST /api/tasks/reorder/` - Reorder tasks

### WebSocket
- `ws://localhost:8000/ws/tasks/` - WebSocket connection for real-time updates

## Permission Model

| Action | Owner | Assignee | Admin | Other |
|--------|-------|----------|-------|-------|
| Delete | ✅ | ❌ | ✅ | ❌ |
| Edit | ✅ | ✅ | ✅ | ❌ |
| Move | ✅ | ❌ | Limited* | ❌ |
| View | ✅ | ✅ | ✅ | ✅ |

*Admin can move tasks within same status but not across statuses for other users' tasks

## Development Notes

### Adding New Features
1. Create model in `backend/tasks/models.py`
2. Create serializer in `backend/tasks/serializers.py`
3. Add viewset method in `backend/tasks/views.py`
4. Update WebSocket broadcasting in `tasks/consumers.py`
5. Create React component in `frontend/src/`
6. Update API calls in `frontend/src/api.js`

### Testing Guidelines
- Write tests in `backend/tests/` for each new feature
- Run `pytest` before committing
- Aim for >80% coverage on new code

### Code Style
- Backend: Follow PEP 8 standards
- Frontend: Use modern React patterns (hooks, functional components)
- No console.log, TODO, or FIXME comments in production code

## Troubleshooting

### WebSocket Connection Issues
- Ensure backend is running with Daphne (`daphne -b 0.0.0.0 -p 8000`)
- Check CORS settings in `backend/core/settings.py`
- Verify WebSocket URL in `frontend/src/TaskList.js`

### Database Connection Error
- Check `.env` file has correct database credentials
- Ensure PostgreSQL is running (if using production DB)
- For local testing, SQLite is used automatically

### Authentication Token Issues
- Clear browser localStorage and refresh
- Check JWT_ALGORITHM and SECRET_KEY in settings
- Verify token expiration settings

## Contributing

When making changes:
1. Run tests: `pytest` (backend) and `npm test` (frontend)
2. Remove any debug code, console.log, or comments
3. Follow existing code style and naming conventions
4. Update this README if adding new features

## License

This project is created for educational and portfolio purposes.
