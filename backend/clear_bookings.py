"""
Script to clear all bookings and payments from the database
"""
from app.database import SessionLocal
from app.models.booking import Booking, Payment
from app.models.room import Room, RoomStatus

def clear_all_bookings():
    """Delete all bookings and payments"""
    db = SessionLocal()
    try:
        # Delete all payments first (due to foreign key constraint)
        payments_count = db.query(Payment).count()
        db.query(Payment).delete()
        print(f"Deleted {payments_count} payment(s)")
        
        # Delete all bookings
        bookings_count = db.query(Booking).count()
        db.query(Booking).delete()
        print(f"Deleted {bookings_count} booking(s)")
        
        # Reset room statuses to AVAILABLE
        rooms_updated = db.query(Room).filter(
            Room.status.in_([RoomStatus.RESERVED, RoomStatus.OCCUPIED])
        ).update({Room.status: RoomStatus.AVAILABLE}, synchronize_session=False)
        print(f"Reset {rooms_updated} room(s) status to AVAILABLE")
        
        db.commit()
        print("\n✅ All bookings and payments cleared successfully!")
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error clearing bookings: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Clearing all bookings and payments...")
    clear_all_bookings()

