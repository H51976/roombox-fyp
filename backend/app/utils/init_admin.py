"""
Initialize default admin user on first application start
"""
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import SessionLocal, engine
from app.models.user import User
from app.utils.auth import hash_password
from app.utils.logger import logger


def init_admin_user():
    """
    Create default admin user if it doesn't exist
    """
    db: Session = SessionLocal()
    try:
        # Check if admin already exists
        admin = db.query(User).filter(User.email == "admin@roombox.com").first()
        
        if admin:
            logger.info("Admin user already exists")
            return
        
        # Hash password
        hashed_pwd = hash_password("roombox123")
        
        # Insert admin user using raw SQL to avoid enum case issues
        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO users (full_name, email, phone, hashed_password, user_type, is_verified, is_active, created_at, updated_at)
                VALUES (:full_name, :email, :phone, :hashed_password, 'ADMIN'::usertype, :is_verified, :is_active, NOW(), NOW())
            """), {
                "full_name": "RoomBox Administrator",
                "email": "admin@roombox.com",
                "phone": "9800000000",
                "hashed_password": hashed_pwd,
                "is_verified": True,
                "is_active": True
            })
            conn.commit()
        
        logger.info("✅ Default admin user created successfully!")
        logger.info("   Email: admin@roombox.com")
        logger.info("   Password: roombox123")
    except Exception as e:
        logger.error(f"Error creating admin user: {str(e)}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    init_admin_user()

