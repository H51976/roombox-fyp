# RoomBox Backend API

FastAPI backend for RoomBox - Digital room-finder and roommate-matching platform for Nepal's urban rental market.

## Features

- 🚀 FastAPI framework with automatic API documentation
- 🔒 CORS middleware for cross-origin requests
- 📝 Request logging middleware
- ✅ Comprehensive error handling
- 🔧 Configuration management with environment variables
- 🛠️ Utility functions for validation and responses
- 📊 Swagger UI documentation at `/docs`
- 📖 ReDoc documentation at `/redoc`

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── auth.py          # Authentication endpoints
│   │       └── health.py         # Health check endpoints
│   ├── models/                   # Database models
│   │   ├── __init__.py
│   │   ├── user.py              # User model
│   │   ├── room.py              # Room/Property models
│   │   └── roommate_match.py    # Roommate matching models
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── error_handler.py      # Global error handlers
│   │   └── request_logger.py     # Request logging middleware
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── logger.py             # Logging utilities
│   │   ├── response.py           # Standardized response helpers
│   │   └── validators.py         # Input validation functions
│   ├── config.py                 # Application configuration
│   ├── database.py              # Database connection and session
│   ├── db_init.py               # Database initialization script
│   └── __init__.py
├── alembic/                      # Database migrations
│   ├── versions/                # Migration files
│   └── env.py                   # Alembic environment
├── logs/                          # Application logs (auto-created)
├── main.py                        # FastAPI application entry point
├── requirements.txt               # Python dependencies
├── alembic.ini                   # Alembic configuration
├── DATABASE_SETUP.md             # Database setup guide
├── .env.example                   # Environment variables template
└── README.md
```

## Installation

1. **Create a virtual environment** (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

3. **Set up PostgreSQL database**:
   - See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed instructions
   - Create database: `CREATE DATABASE roombox;`
   - Update `.env` with your database URL

4. **Set up environment variables**:
```bash
cp .env.example .env
# Edit .env with your configuration, especially DATABASE_URL
```

5. **Initialize database**:
```bash
# Install dependencies first
pip install -r requirements.txt

# Initialize database tables
python app/db_init.py
```

## Running the Server

### Development Mode (with auto-reload):
```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production Mode:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## API Endpoints

### Health Check
- `GET /health` - Basic health check
- `GET /api/v1/health` - Detailed health check

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user (requires authentication)

## Configuration

Edit `.env` file or set environment variables:

- `DEBUG`: Enable/disable debug mode (default: True)
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8000)
- `CORS_ORIGINS`: Comma-separated list of allowed origins
- `SECRET_KEY`: Secret key for JWT tokens (change in production!)
- `DATABASE_URL`: PostgreSQL connection string (format: `postgresql://user:password@host:port/database`)

## Database Models

The application uses PostgreSQL with SQLAlchemy ORM. Key models include:

- **User**: Stores user information (tenants and landlords)
- **Room**: Property/room listings with details, location, pricing, and amenities
- **RoomImage**: Images associated with room listings
- **MatchPreference**: User preferences for roommate matching (lifestyle, habits, etc.)
- **RoommateMatch**: Tracks matches between users with compatibility scores

See `app/models/` for detailed model definitions.

## Middleware

### CORS Middleware
Handles cross-origin requests. Configure allowed origins in settings.

### Request Logger Middleware
Logs all incoming requests with method, path, status code, and processing time.

### Error Handler Middleware
Provides standardized error responses for:
- Validation errors (422)
- HTTP exceptions (4xx, 5xx)
- General exceptions (500)

## Utils

### Response Helpers
- `success_response()` - Create standardized success responses
- `error_response()` - Create standardized error responses

### Validators
- `validate_email()` - Email format validation
- `validate_phone()` - Nepali phone number validation (10 digits)
- `validate_password()` - Password strength validation
- `sanitize_input()` - Input sanitization for XSS prevention

### Logger
- Automatic file and console logging
- Logs saved to `logs/roombox.log`

## Development

### Adding New Endpoints

1. Create a new router file in `app/api/v1/`
2. Import and include it in `app/api/v1/__init__.py`

Example:
```python
# app/api/v1/rooms.py
from fastapi import APIRouter
router = APIRouter()

@router.get("/rooms")
async def get_rooms():
    return {"rooms": []}
```

```python
# app/api/v1/__init__.py
from app.api.v1 import rooms
router.include_router(rooms.router, prefix="/rooms", tags=["Rooms"])
```

## Testing

Test endpoints using Swagger UI at http://localhost:8000/docs or use curl:

```bash
# Health check
curl http://localhost:8000/health

# Register user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "confirm_password": "password123",
    "phone": "9841234567",
    "user_type": "tenant"
  }'
```

## License

MIT

