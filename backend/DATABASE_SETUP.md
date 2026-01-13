# PostgreSQL Database Setup Guide

## Prerequisites

1. **Install PostgreSQL**
   - macOS: `brew install postgresql@15` or download from [PostgreSQL website](https://www.postgresql.org/download/)
   - Linux: `sudo apt-get install postgresql postgresql-contrib`
   - Windows: Download installer from PostgreSQL website

2. **Start PostgreSQL service**
   ```bash
   # macOS (with Homebrew)
   brew services start postgresql@15
   
   # Linux
   sudo systemctl start postgresql
   
   # Windows
   # Start from Services or use pgAdmin
   ```

## Database Setup Steps

### 1. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE roombox;

# Create user (optional, or use default postgres user)
CREATE USER roombox_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE roombox TO roombox_user;

# Exit psql
\q
```

### 2. Configure Environment Variables

Create a `.env` file in the backend directory:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/roombox
# Format: postgresql://username:password@host:port/database

# For custom user:
# DATABASE_URL=postgresql://roombox_user:your_password@localhost:5432/roombox
```

### 3. Install Dependencies

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Initialize Database

**Option A: Using the initialization script (creates tables directly)**
```bash
python app/db_init.py
```

**Option B: Using Alembic migrations (recommended for production)**
```bash
# Initialize Alembic (first time only)
alembic init alembic

# Create initial migration
alembic revision --autogenerate -m "Initial migration"

# Apply migrations
alembic upgrade head
```

### 5. Verify Database

```bash
# Connect to database
psql -d roombox

# List tables
\dt

# Check users table structure
\d users

# Exit
\q
```

## Database Models

The following models are created:

### User Model
- Stores user information (tenants and landlords)
- Fields: id, full_name, email, phone, hashed_password, user_type, etc.
- Relationships: rooms, roommate_matches, match_preferences

### Room Model
- Stores property/room listings
- Fields: id, owner_id, title, description, address, city, price, amenities, etc.
- Relationships: owner (User), images

### RoomImage Model
- Stores images for rooms
- Fields: id, room_id, image_url, image_order, is_primary

### MatchPreference Model
- Stores user preferences for roommate matching
- Fields: smoking_preference, study_habits, working_hours, cleanliness_level, etc.

### RoommateMatch Model
- Tracks matches between users
- Fields: user_id, matched_user_id, room_id, match_score, status

## Troubleshooting

### Connection Error
```
psycopg2.OperationalError: could not connect to server
```
- Check if PostgreSQL is running: `pg_isready`
- Verify connection string in `.env`
- Check firewall settings

### Permission Denied
```
permission denied for database roombox
```
- Grant privileges: `GRANT ALL PRIVILEGES ON DATABASE roombox TO your_user;`
- Or use the postgres superuser

### Table Already Exists
```
relation "users" already exists
```
- Drop tables: `python -c "from app.database import drop_db; drop_db()"`
- Or use Alembic migrations for better control

## Migration Commands

```bash
# Create a new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# Show current revision
alembic current

# Show migration history
alembic history
```

