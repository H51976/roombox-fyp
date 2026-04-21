"""
Admin API endpoints - requires admin JWT token
"""
import math
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, status, Depends, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.utils.response import success_response, error_response
from app.database import get_db
from app.models.user import User
from app.models.room import Room, RoomStatus, RoomImage
from app.models.booking import Booking, Payment, BookingStatus, PaymentStatus
from app.utils.auth import decode_access_token

router = APIRouter()


def get_admin_user(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """Verify request carries a valid admin JWT token"""
    authorization = request.headers.get("authorization") or request.headers.get("Authorization")
    if not authorization:
        return None
    try:
        parts = authorization.strip().split(maxsplit=1)
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return None
        token = parts[1].strip()
    except (ValueError, IndexError):
        return None

    payload = decode_access_token(token)
    if not payload:
        return None

    user_type = payload.get("user_type", "")
    if user_type not in ("admin", "ADMIN"):
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    try:
        return db.query(User).filter(User.id == int(user_id)).first()
    except (ValueError, TypeError):
        return None


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

@router.get("/stats")
async def get_stats(request: Request, db: Session = Depends(get_db)):
    """Overall platform statistics"""
    admin = get_admin_user(request, db)
    if not admin:
        return error_response(message="Unauthorized", status_code=status.HTTP_401_UNAUTHORIZED)

    total_users = db.query(User).filter(User.user_type.notin_(["admin", "ADMIN"])).count()
    total_tenants = db.query(User).filter(User.user_type.in_(["tenant", "TENANT"])).count()
    total_landlords = db.query(User).filter(User.user_type.in_(["landlord", "LANDLORD"])).count()
    total_rooms = db.query(Room).count()
    available_rooms = db.query(Room).filter(Room.status == RoomStatus.AVAILABLE).count()
    occupied_rooms = db.query(Room).filter(Room.status == RoomStatus.OCCUPIED).count()
    total_bookings = db.query(Booking).count()
    pending_bookings = db.query(Booking).filter(Booking.status == BookingStatus.PENDING).count()
    approved_bookings = db.query(Booking).filter(Booking.status == BookingStatus.APPROVED).count()

    total_revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.COMPLETED
    ).scalar() or 0

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    active_users = db.query(User).filter(User.last_login >= thirty_days_ago).count()

    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_users_this_month = db.query(User).filter(User.created_at >= start_of_month).count()
    new_rooms_this_month = db.query(Room).filter(Room.created_at >= start_of_month).count()

    return success_response(
        data={
            "users": {
                "total": total_users,
                "tenants": total_tenants,
                "landlords": total_landlords,
                "active": active_users,
                "new_this_month": new_users_this_month,
            },
            "rooms": {
                "total": total_rooms,
                "available": available_rooms,
                "occupied": occupied_rooms,
                "new_this_month": new_rooms_this_month,
            },
            "bookings": {
                "total": total_bookings,
                "pending": pending_bookings,
                "approved": approved_bookings,
            },
            "revenue": {
                "total": round(total_revenue, 2),
            },
        },
        message="Stats retrieved",
    )


@router.get("/monthly-stats")
async def get_monthly_stats(request: Request, db: Session = Depends(get_db)):
    """Last 6 months of user registrations and bookings for charts"""
    admin = get_admin_user(request, db)
    if not admin:
        return error_response(message="Unauthorized", status_code=status.HTTP_401_UNAUTHORIZED)

    now = datetime.utcnow()
    months = []
    for i in range(5, -1, -1):
        month_date = now - timedelta(days=30 * i)
        month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month = (month_start + timedelta(days=32)).replace(day=1)
        month_end = now if i == 0 else next_month

        user_count = db.query(User).filter(
            and_(User.created_at >= month_start, User.created_at < month_end)
        ).count()

        booking_count = db.query(Booking).filter(
            and_(Booking.created_at >= month_start, Booking.created_at < month_end)
        ).count()

        months.append({
            "month": month_date.strftime("%b %Y"),
            "short": month_date.strftime("%b"),
            "users": user_count,
            "bookings": booking_count,
        })

    return success_response(data={"monthly": months}, message="Monthly stats retrieved")


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

@router.get("/users")
async def get_all_users(
    request: Request,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    user_type: Optional[str] = Query(None),
):
    admin = get_admin_user(request, db)
    if not admin:
        return error_response(message="Unauthorized", status_code=status.HTTP_401_UNAUTHORIZED)

    query = db.query(User).filter(User.user_type.notin_(["admin", "ADMIN"]))

    if search:
        query = query.filter(
            User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )

    if user_type:
        query = query.filter(User.user_type.in_([user_type.lower(), user_type.upper()]))

    total = query.count()
    offset = (page - 1) * limit
    users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

    def _utype(u):
        return u.user_type if isinstance(u.user_type, str) else u.user_type.value

    return success_response(
        data={
            "users": [
                {
                    "id": u.id,
                    "full_name": u.full_name,
                    "email": u.email,
                    "phone": u.phone,
                    "user_type": _utype(u),
                    "is_active": u.is_active,
                    "is_verified": u.is_verified,
                    "created_at": u.created_at.isoformat() if u.created_at else None,
                    "last_login": u.last_login.isoformat() if u.last_login else None,
                }
                for u in users
            ],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": math.ceil(total / limit) if limit > 0 else 1,
            },
        },
        message="Users retrieved",
    )


@router.patch("/users/{user_id}/toggle-active")
async def toggle_user_active(user_id: int, request: Request, db: Session = Depends(get_db)):
    admin = get_admin_user(request, db)
    if not admin:
        return error_response(message="Unauthorized", status_code=status.HTTP_401_UNAUTHORIZED)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return error_response(message="User not found", status_code=status.HTTP_404_NOT_FOUND)

    user.is_active = not user.is_active
    db.commit()

    return success_response(
        data={"id": user.id, "is_active": user.is_active},
        message=f"User {'activated' if user.is_active else 'deactivated'}",
    )


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, request: Request, db: Session = Depends(get_db)):
    admin = get_admin_user(request, db)
    if not admin:
        return error_response(message="Unauthorized", status_code=status.HTTP_401_UNAUTHORIZED)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return error_response(message="User not found", status_code=status.HTTP_404_NOT_FOUND)

    db.delete(user)
    db.commit()

    return success_response(data={"id": user_id}, message="User deleted")


# ---------------------------------------------------------------------------
# Rooms
# ---------------------------------------------------------------------------

@router.get("/rooms")
async def get_all_rooms(
    request: Request,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    room_status: Optional[str] = Query(None),
):
    admin = get_admin_user(request, db)
    if not admin:
        return error_response(message="Unauthorized", status_code=status.HTTP_401_UNAUTHORIZED)

    query = db.query(Room)

    if search:
        query = query.filter(
            Room.title.ilike(f"%{search}%")
            | Room.city.ilike(f"%{search}%")
            | Room.address.ilike(f"%{search}%")
        )

    if room_status:
        try:
            query = query.filter(Room.status == RoomStatus(room_status.lower()))
        except ValueError:
            pass

    total = query.count()
    offset = (page - 1) * limit
    rooms = query.order_by(Room.created_at.desc()).offset(offset).limit(limit).all()

    def _val(v):
        return v.value if hasattr(v, "value") else v

    result = []
    for room in rooms:
        owner = db.query(User).filter(User.id == room.owner_id).first()
        result.append(
            {
                "id": room.id,
                "title": room.title,
                "city": room.city,
                "address": room.address,
                "room_type": _val(room.room_type),
                "price_per_month": room.price_per_month,
                "status": _val(room.status),
                "is_verified": room.is_verified,
                "admin_deactivated": room.admin_deactivated,
                "admin_deactivation_reason": room.admin_deactivation_reason,
                "admin_deactivated_at": room.admin_deactivated_at.isoformat() if room.admin_deactivated_at else None,
                "created_at": room.created_at.isoformat() if room.created_at else None,
                "owner": (
                    {"id": owner.id, "full_name": owner.full_name, "email": owner.email}
                    if owner
                    else None
                ),
            }
        )

    return success_response(
        data={
            "rooms": result,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": math.ceil(total / limit) if limit > 0 else 1,
            },
        },
        message="Rooms retrieved",
    )


@router.patch("/rooms/{room_id}/verify")
async def toggle_room_verified(room_id: int, request: Request, db: Session = Depends(get_db)):
    admin = get_admin_user(request, db)
    if not admin:
        return error_response(message="Unauthorized", status_code=status.HTTP_401_UNAUTHORIZED)

    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        return error_response(message="Room not found", status_code=status.HTTP_404_NOT_FOUND)

    room.is_verified = not room.is_verified
    db.commit()

    return success_response(
        data={"id": room.id, "is_verified": room.is_verified},
        message=f"Room {'verified' if room.is_verified else 'unverified'}",
    )


@router.patch("/rooms/{room_id}/status")
async def update_room_status_admin(
    room_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    """Set room status: available, occupied, reserved, under_maintenance, inactive"""
    admin = get_admin_user(request, db)
    if not admin:
        return error_response(message="Unauthorized", status_code=status.HTTP_401_UNAUTHORIZED)

    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        return error_response(message="Room not found", status_code=status.HTTP_404_NOT_FOUND)

    body = await request.json()
    new_status_str = body.get("status", "")
    try:
        room.status = RoomStatus(new_status_str.lower())
    except ValueError:
        return error_response(
            message=f"Invalid status. Valid: {[s.value for s in RoomStatus]}",
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    db.commit()

    return success_response(
        data={"id": room.id, "status": room.status.value},
        message=f"Room status set to {room.status.value}",
    )


@router.patch("/rooms/{room_id}/admin-deactivate")
async def admin_deactivate_room(
    room_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Admin-deactivate a room with a mandatory reason.
    Once admin-deactivated the landlord cannot reactivate the room.
    """
    admin = get_admin_user(request, db)
    if not admin:
        return error_response(message="Unauthorized", status_code=status.HTTP_401_UNAUTHORIZED)

    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        return error_response(message="Room not found", status_code=status.HTTP_404_NOT_FOUND)

    body = await request.json()
    reason = (body.get("reason") or "").strip()
    if not reason:
        return error_response(
            message="A reason is required when admin-deactivating a room",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    room.admin_deactivated = True
    room.admin_deactivation_reason = reason
    room.admin_deactivated_at = datetime.utcnow()
    room.status = RoomStatus.INACTIVE
    db.commit()

    return success_response(
        data={
            "id": room.id,
            "status": room.status.value,
            "admin_deactivated": room.admin_deactivated,
            "admin_deactivation_reason": room.admin_deactivation_reason,
        },
        message="Room has been admin-deactivated",
    )


@router.patch("/rooms/{room_id}/admin-reactivate")
async def admin_reactivate_room(
    room_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    """Admin can lift an admin-deactivation and restore the room to available."""
    admin = get_admin_user(request, db)
    if not admin:
        return error_response(message="Unauthorized", status_code=status.HTTP_401_UNAUTHORIZED)

    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        return error_response(message="Room not found", status_code=status.HTTP_404_NOT_FOUND)

    room.admin_deactivated = False
    room.admin_deactivation_reason = None
    room.admin_deactivated_at = None
    room.status = RoomStatus.AVAILABLE
    db.commit()

    return success_response(
        data={"id": room.id, "status": room.status.value, "admin_deactivated": False},
        message="Room has been reactivated by admin",
    )


@router.delete("/rooms/{room_id}")
async def delete_room_admin(room_id: int, request: Request, db: Session = Depends(get_db)):
    admin = get_admin_user(request, db)
    if not admin:
        return error_response(message="Unauthorized", status_code=status.HTTP_401_UNAUTHORIZED)

    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        return error_response(message="Room not found", status_code=status.HTTP_404_NOT_FOUND)

    db.query(RoomImage).filter(RoomImage.room_id == room_id).delete()
    db.delete(room)
    db.commit()

    return success_response(data={"id": room_id}, message="Room deleted")


# ---------------------------------------------------------------------------
# Bookings
# ---------------------------------------------------------------------------

@router.get("/bookings")
async def get_all_bookings(
    request: Request,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    booking_status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    admin = get_admin_user(request, db)
    if not admin:
        return error_response(message="Unauthorized", status_code=status.HTTP_401_UNAUTHORIZED)

    query = db.query(Booking)

    if booking_status:
        try:
            query = query.filter(Booking.status == BookingStatus(booking_status.lower()))
        except ValueError:
            pass

    total = query.count()
    offset = (page - 1) * limit
    bookings = query.order_by(Booking.created_at.desc()).offset(offset).limit(limit).all()

    def _val(v):
        return v.value if hasattr(v, "value") else v

    result = []
    for b in bookings:
        tenant = db.query(User).filter(User.id == b.tenant_id).first()
        landlord = db.query(User).filter(User.id == b.landlord_id).first()
        room = db.query(Room).filter(Room.id == b.room_id).first()
        result.append(
            {
                "id": b.id,
                "status": _val(b.status),
                "monthly_rent": b.monthly_rent,
                "start_date": b.start_date.isoformat() if b.start_date else None,
                "created_at": b.created_at.isoformat() if b.created_at else None,
                "tenant": (
                    {"id": tenant.id, "full_name": tenant.full_name, "email": tenant.email}
                    if tenant
                    else None
                ),
                "landlord": (
                    {"id": landlord.id, "full_name": landlord.full_name, "email": landlord.email}
                    if landlord
                    else None
                ),
                "room": (
                    {"id": room.id, "title": room.title, "city": room.city} if room else None
                ),
            }
        )

    return success_response(
        data={
            "bookings": result,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": math.ceil(total / limit) if limit > 0 else 1,
            },
        },
        message="Bookings retrieved",
    )


@router.patch("/bookings/{booking_id}/cancel")
async def cancel_booking_admin(booking_id: int, request: Request, db: Session = Depends(get_db)):
    """Admin force-cancel a booking"""
    admin = get_admin_user(request, db)
    if not admin:
        return error_response(message="Unauthorized", status_code=status.HTTP_401_UNAUTHORIZED)

    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        return error_response(message="Booking not found", status_code=status.HTTP_404_NOT_FOUND)

    if booking.status in (BookingStatus.CANCELLED, BookingStatus.COMPLETED):
        return error_response(
            message=f"Cannot cancel a booking that is already {booking.status.value}",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    booking.status = BookingStatus.CANCELLED
    # If room was occupied/reserved by this booking, free it
    room = db.query(Room).filter(Room.id == booking.room_id).first()
    if room and room.status in (RoomStatus.OCCUPIED, RoomStatus.RESERVED):
        room.status = RoomStatus.AVAILABLE
    db.commit()

    return success_response(
        data={"id": booking.id, "status": booking.status.value},
        message="Booking cancelled by admin",
    )


@router.delete("/bookings/{booking_id}")
async def delete_booking_admin(booking_id: int, request: Request, db: Session = Depends(get_db)):
    """Admin hard-delete a booking"""
    admin = get_admin_user(request, db)
    if not admin:
        return error_response(message="Unauthorized", status_code=status.HTTP_401_UNAUTHORIZED)

    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        return error_response(message="Booking not found", status_code=status.HTTP_404_NOT_FOUND)

    db.delete(booking)
    db.commit()

    return success_response(data={"id": booking_id}, message="Booking deleted")


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

@router.get("/analytics")
async def get_analytics(request: Request, db: Session = Depends(get_db)):
    """Deep analytics for admin dashboard"""
    admin = get_admin_user(request, db)
    if not admin:
        return error_response(message="Unauthorized", status_code=status.HTTP_401_UNAUTHORIZED)

    now = datetime.utcnow()

    # --- Revenue by month (last 6) ---
    revenue_monthly = []
    for i in range(5, -1, -1):
        m_date = now - timedelta(days=30 * i)
        m_start = m_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        m_end = (m_start + timedelta(days=32)).replace(day=1)
        total = db.query(func.sum(Payment.amount)).filter(
            and_(
                Payment.status == PaymentStatus.COMPLETED,
                Payment.completed_at >= m_start,
                Payment.completed_at < m_end,
            )
        ).scalar() or 0
        revenue_monthly.append({
            "month": m_date.strftime("%b %Y"),
            "short": m_date.strftime("%b"),
            "amount": round(float(total), 2),
        })

    # --- Payment type breakdown ---
    payment_types = db.query(
        Payment.payment_type,
        func.count(Payment.id).label("count"),
        func.sum(Payment.amount).label("total"),
    ).filter(Payment.status == PaymentStatus.COMPLETED).group_by(Payment.payment_type).all()

    payment_breakdown = [
        {"type": pt.payment_type, "count": pt.count, "total": round(float(pt.total or 0), 2)}
        for pt in payment_types
    ]

    # --- Top landlords by revenue ---
    from app.models.user import User as UserModel
    top_landlords_q = db.query(
        Payment.landlord_id,
        func.sum(Payment.amount).label("revenue"),
        func.count(Payment.id).label("transactions"),
    ).filter(Payment.status == PaymentStatus.COMPLETED).group_by(Payment.landlord_id).order_by(
        func.sum(Payment.amount).desc()
    ).limit(5).all()

    top_landlords = []
    for row in top_landlords_q:
        u = db.query(User).filter(User.id == row.landlord_id).first()
        top_landlords.append({
            "landlord_id": row.landlord_id,
            "name": u.full_name or u.email if u else "Unknown",
            "revenue": round(float(row.revenue or 0), 2),
            "transactions": row.transactions,
        })

    # --- Recent payments ---
    recent_payments = db.query(Payment).filter(
        Payment.status == PaymentStatus.COMPLETED
    ).order_by(Payment.completed_at.desc()).limit(10).all()

    recent_payments_list = []
    for p in recent_payments:
        booking = db.query(Booking).filter(Booking.id == p.booking_id).first()
        tenant = db.query(User).filter(User.id == p.tenant_id).first()
        room = db.query(Room).filter(Room.id == booking.room_id).first() if booking else None
        recent_payments_list.append({
            "id": p.id,
            "amount": p.amount,
            "type": p.payment_type,
            "tenant_name": tenant.full_name or tenant.email if tenant else "Unknown",
            "room_title": room.title if room else "Unknown",
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
        })

    # --- Booking status breakdown ---
    from app.models.booking import BookingStatus as BS
    booking_statuses = db.query(
        Booking.status,
        func.count(Booking.id).label("count"),
    ).group_by(Booking.status).all()
    booking_breakdown = [{"status": b.status.value, "count": b.count} for b in booking_statuses]

    # --- Room status breakdown ---
    room_statuses = db.query(
        Room.status,
        func.count(Room.id).label("count"),
    ).group_by(Room.status).all()
    room_breakdown = [{"status": r.status.value, "count": r.count} for r in room_statuses]

    # --- Cities with most rooms ---
    city_rooms = db.query(
        Room.city,
        func.count(Room.id).label("count"),
    ).group_by(Room.city).order_by(func.count(Room.id).desc()).limit(5).all()
    city_breakdown = [{"city": c.city, "count": c.count} for c in city_rooms]

    return success_response(
        data={
            "revenue_monthly": revenue_monthly,
            "payment_breakdown": payment_breakdown,
            "top_landlords": top_landlords,
            "recent_payments": recent_payments_list,
            "booking_breakdown": booking_breakdown,
            "room_breakdown": room_breakdown,
            "city_breakdown": city_breakdown,
        },
        message="Analytics retrieved",
    )


# ---------------------------------------------------------------------------
# All Payments
# ---------------------------------------------------------------------------

@router.get("/payments")
async def get_all_payments(
    request: Request,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    payment_status: Optional[str] = Query(None),
):
    """All payments with pagination"""
    admin = get_admin_user(request, db)
    if not admin:
        return error_response(message="Unauthorized", status_code=status.HTTP_401_UNAUTHORIZED)

    query = db.query(Payment)
    if payment_status:
        try:
            query = query.filter(Payment.status == PaymentStatus(payment_status.lower()))
        except ValueError:
            pass

    total = query.count()
    offset = (page - 1) * limit
    payments = query.order_by(Payment.created_at.desc()).offset(offset).limit(limit).all()

    result = []
    for p in payments:
        booking = db.query(Booking).filter(Booking.id == p.booking_id).first()
        tenant = db.query(User).filter(User.id == p.tenant_id).first()
        landlord = db.query(User).filter(User.id == p.landlord_id).first()
        room = db.query(Room).filter(Room.id == booking.room_id).first() if booking else None
        result.append({
            "id": p.id,
            "booking_id": p.booking_id,
            "amount": p.amount,
            "type": p.payment_type,
            "status": p.status.value,
            "transaction_uuid": p.transaction_uuid,
            "esewa_ref_id": p.esewa_ref_id,
            "tenant": {"id": tenant.id, "name": tenant.full_name or tenant.email} if tenant else None,
            "landlord": {"id": landlord.id, "name": landlord.full_name or landlord.email} if landlord else None,
            "room": {"id": room.id, "title": room.title} if room else None,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
        })

    return success_response(
        data={
            "payments": result,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": math.ceil(total / limit) if limit > 0 else 1,
            },
        },
        message="Payments retrieved",
    )
