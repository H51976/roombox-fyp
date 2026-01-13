"""
Database initialization script
Run this to create all database tables
"""
from app.database import init_db, engine
from app.models import *  # Import all models
from app.utils.logger import logger

if __name__ == "__main__":
    logger.info("Initializing database...")
    try:
        init_db()
        logger.info("✅ Database initialized successfully!")
        logger.info(f"Database URL: {engine.url}")
    except Exception as e:
        logger.error(f"❌ Error initializing database: {str(e)}")
        raise

