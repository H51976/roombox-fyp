# RoomBox Admin Panel

Admin dashboard for RoomBox platform management.

## Features

- 🔐 Admin authentication
- 📊 Dashboard with statistics
- 👥 User management (coming soon)
- 🏠 Room listing management (coming soon)
- 📈 Analytics and reports (coming soon)

## Default Admin Credentials

When the application starts for the first time, a default admin user is automatically created:

- **Email**: `admin@roombox.com`
- **Password**: `roombox123`

⚠️ **Important**: Change the default password after first login in production!

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend API running on `http://localhost:8000`

### Installation

```bash
# Install dependencies
npm install
```

### Running the Admin Panel

```bash
# Development mode (runs on port 3002)
npm run dev
```

The admin panel will be available at: **http://localhost:3002**

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Project Structure

```
frontend-admin/
├── app/
│   ├── login/          # Admin login page
│   ├── dashboard/      # Admin dashboard
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Root page (redirects to login/dashboard)
├── public/             # Static assets
└── package.json        # Dependencies and scripts
```

## Authentication

The admin panel uses JWT tokens stored in localStorage for authentication. After successful login, the token is stored and used for subsequent API requests.

## API Endpoints

The admin panel connects to the backend API at `http://localhost:8000`:

- `POST /api/v1/auth/admin/login` - Admin login
- Other endpoints will be added as features are developed

## Development

### Adding New Features

1. Create new pages in the `app/` directory
2. Add API routes in the backend `app/api/v1/` directory
3. Update the dashboard with new navigation items

## License

MIT
