#!/bin/bash

# RoomBox Backend Startup Script

echo "🚀 Starting RoomBox Backend API..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip3 install -r requirements.txt

# Create logs directory
mkdir -p logs

# Run the server
echo "✅ Starting server on http://localhost:8000"
echo "📚 Swagger UI available at http://localhost:8000/docs"
echo "📖 ReDoc available at http://localhost:8000/redoc"
echo ""
python3 main.py

