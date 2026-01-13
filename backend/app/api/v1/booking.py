"""
Booking and Payment API endpoints
"""
from fastapi import APIRouter, HTTPException, status, Depends, Query, Header, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, extract
from typing import Optional, List
from datetime import datetime, timedelta
import uuid

from app.utils.response import success_response, error_response
from app.database import get_db
from app.models.booking import Booking, Payment, BookingStatus, PaymentStatus, TenancyStatus
from app.models.room import Room, RoomStatus
from app.models.user import User
from app.utils.esewa import EsewaPayment
from app.utils.auth import decode_access_token

router = APIRouter()


def get_current_user_from_token(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Extract current user from JWT token in Authorization header
    """
    # Get Authorization header - FastAPI headers are case-insensitive, but let's be explicit
    authorization = request.headers.get("authorization") or request.headers.get("Authorization")
    if not authorization:
        return None
    
    # Remove any whitespace
    authorization = authorization.strip()
    
    try:
        # Extract token from "Bearer <token>"
        parts = authorization.split(maxsplit=1)
        if len(parts) != 2:
            return None
        scheme, token = parts
        if scheme.lower() != "bearer":
            return None
        token = token.strip()
    except (ValueError, IndexError):
        return None
    
    if not token:
        return None
    
    # Decode token
    payload = decode_access_token(token)
    if not payload:
        return None
    
    # Get user ID from token
    user_id = payload.get("sub")
    if not user_id:
        return None
    
    # Get user from database
    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user
    except (ValueError, TypeError):
        return None


class BookingRequest(BaseModel):
    room_id: int
    start_date: str = Field(..., description="Start date in ISO format")
    end_date: Optional[str] = Field(None, description="End date in ISO format (optional for indefinite)")
    tenant_message: Optional[str] = None


class BookingResponse(BaseModel):
    id: int
    tenant_id: int
    landlord_id: int
    room_id: int
    start_date: str
    end_date: Optional[str]
    monthly_rent: float
    security_deposit: Optional[float]
    advance_payment: Optional[float]
    status: str
    tenancy_status: Optional[str]
    tenant_message: Optional[str]
    landlord_response: Optional[str]
    created_at: str


class PaymentRequest(BaseModel):
    booking_id: int
    payment_type: str = Field(..., description="rent, security_deposit, advance")
    payment_month: Optional[str] = Field(None, description="YYYY-MM format for monthly rent")


@router.post("/request")
async def create_booking_request(
    booking_data: BookingRequest,
    db: Session = Depends(get_db),
):
    """
    Create a booking request with payment (Security Deposit + Advance Payment)
    This endpoint initiates payment before creating the booking
    """
    # TODO: Get tenant from JWT token
    tenant = db.query(User).filter(User.user_type.in_(["tenant", "TENANT"])).first()
    if not tenant:
        return error_response(
            message="Tenant not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    room = db.query(Room).filter(Room.id == booking_data.room_id).first()
    if not room:
        return error_response(
            message="Room not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    if room.status != RoomStatus.AVAILABLE:
        return error_response(
            message="Room is not available for booking",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if tenant already has a pending booking for this room
    existing_booking = db.query(Booking).filter(
        and_(
            Booking.tenant_id == tenant.id,
            Booking.room_id == booking_data.room_id,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.APPROVED])
        )
    ).first()
    
    if existing_booking:
        return error_response(
            message="You already have a pending or approved booking request for this room",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Calculate total payment (Security Deposit + Advance Payment)
    security_deposit = room.security_deposit or 0
    advance_payment = room.advance_payment or 0
    total_payment = security_deposit + advance_payment
    
    if total_payment <= 0:
        return error_response(
            message="Security Deposit and Advance Payment are required for booking",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Parse dates
    try:
        start_date = datetime.fromisoformat(booking_data.start_date.replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(booking_data.end_date.replace('Z', '+00:00')) if booking_data.end_date else None
    except ValueError:
        return error_response(
            message="Invalid date format",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Create booking with PENDING status (will be activated after payment)
    new_booking = Booking(
        tenant_id=tenant.id,
        landlord_id=room.owner_id,
        room_id=booking_data.room_id,
        start_date=start_date,
        end_date=end_date,
        monthly_rent=room.price_per_month,
        security_deposit=security_deposit,
        advance_payment=advance_payment,
        status=BookingStatus.PENDING,
        tenancy_status=TenancyStatus.PENDING,
        tenant_message=booking_data.tenant_message
    )
    
    db.add(new_booking)
    db.flush()  # Flush to get the booking ID
    
    # Set room status to RESERVED immediately when booking is created (payment pending)
    # This prevents the room from appearing in search results until landlord approves
    room.status = RoomStatus.RESERVED
    db.flush()
    
    # Generate transaction UUID
    transaction_uuid = str(uuid.uuid4())
    
    # Create payment record for Security Deposit + Advance Payment
    new_payment = Payment(
        booking_id=new_booking.id,
        tenant_id=tenant.id,
        landlord_id=room.owner_id,
        amount=total_payment,
        payment_type="booking_payment",  # Combined payment for security deposit + advance
        transaction_uuid=transaction_uuid,
        status=PaymentStatus.PENDING
    )
    
    db.add(new_payment)
    db.commit()
    db.refresh(new_booking)
    db.refresh(new_payment)
    
    # Generate eSewa payment form
    esewa = EsewaPayment(
        amount=total_payment,
        total_amount=total_payment,
        transaction_uuid=transaction_uuid,
        success_url=f"http://localhost:3000/payment/success?payment_id={new_payment.id}&booking_id={new_booking.id}",
        failure_url=f"http://localhost:3000/payment/failure?payment_id={new_payment.id}&booking_id={new_booking.id}",
    )
    
    form_data = esewa.generate_form_data()
    
    return success_response(
        data={
            "booking_id": new_booking.id,
            "payment_id": new_payment.id,
            "transaction_uuid": transaction_uuid,
            "total_amount": total_payment,
            "security_deposit": security_deposit,
            "advance_payment": advance_payment,
            "form_data": form_data,
            "form_url": esewa.TEST_URL,
        },
        message="Please complete the payment to confirm your booking"
    )


@router.get("/my-bookings")
async def get_my_bookings(
    request: Request,
    db: Session = Depends(get_db),
    user_type: Optional[str] = Query(None, description="tenant or landlord"),
):
    """
    Get bookings for current user (as tenant or landlord)
    """
    # Get user from JWT token
    user = get_current_user_from_token(request, db)
    if not user:
        return error_response(
            message="Authentication required. Please login again.",
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    query = db.query(Booking)
    
    if user.user_type.lower() == "tenant":
        query = query.filter(Booking.tenant_id == user.id)
    elif user.user_type.lower() == "landlord":
        query = query.filter(Booking.landlord_id == user.id)
    
    bookings = query.order_by(Booking.created_at.desc()).all()
    
    result = []
    for booking in bookings:
        room = db.query(Room).filter(Room.id == booking.room_id).first()
        tenant = db.query(User).filter(User.id == booking.tenant_id).first()
        landlord = db.query(User).filter(User.id == booking.landlord_id).first()
        
        # Get payment information for this booking
        payments = db.query(Payment).filter(
            and_(
                Payment.booking_id == booking.id,
                Payment.status == PaymentStatus.COMPLETED
            )
        ).all()
        
        total_paid = sum(p.amount for p in payments)
        payment_details = []
        for payment in payments:
            payment_details.append({
                "amount": payment.amount,
                "type": payment.payment_type,
                "completed_at": payment.completed_at.isoformat() if payment.completed_at else None,
            })
        
        result.append({
            "id": booking.id,
            "tenant_id": booking.tenant_id,
            "tenant_name": tenant.full_name or tenant.email if tenant else "Unknown",
            "landlord_id": booking.landlord_id,
            "landlord_name": landlord.full_name or landlord.email if landlord else "Unknown",
            "room_id": booking.room_id,
            "room_title": room.title if room else "Unknown",
            "start_date": booking.start_date.isoformat() if booking.start_date else None,
            "end_date": booking.end_date.isoformat() if booking.end_date else None,
            "monthly_rent": booking.monthly_rent,
            "security_deposit": booking.security_deposit,
            "advance_payment": booking.advance_payment,
            "status": booking.status.value,
            "tenancy_status": booking.tenancy_status.value if booking.tenancy_status else None,
            "tenant_message": booking.tenant_message,
            "landlord_response": booking.landlord_response,
            "created_at": booking.created_at.isoformat() if booking.created_at else None,
            "total_paid": total_paid,
            "payments": payment_details,
        })
    
    return success_response(data=result, message="Bookings retrieved successfully")


@router.patch("/{booking_id}/approve")
async def approve_booking(
    booking_id: int,
    db: Session = Depends(get_db),
):
    """
    Approve a booking request (landlord only)
    """
    # TODO: Get landlord from JWT token
    landlord = db.query(User).filter(User.user_type.in_(["landlord", "LANDLORD"])).first()
    if not landlord:
        return error_response(
            message="Landlord not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        return error_response(
            message="Booking not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    if booking.landlord_id != landlord.id:
        return error_response(
            message="Unauthorized",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    if booking.status != BookingStatus.PENDING:
        return error_response(
            message=f"Booking is already {booking.status.value}",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Update booking status
    booking.status = BookingStatus.APPROVED
    booking.tenancy_status = TenancyStatus.PENDING
    booking.approved_at = datetime.utcnow()
    
    # Update room status to RESERVED
    room = db.query(Room).filter(Room.id == booking.room_id).first()
    if room:
        room.status = RoomStatus.RESERVED
    
    db.commit()
    
    return success_response(
        data={"booking_id": booking.id, "status": booking.status.value},
        message="Booking approved successfully"
    )


class RejectRequest(BaseModel):
    landlord_response: Optional[str] = None


@router.patch("/{booking_id}/reject")
async def reject_booking(
    booking_id: int,
    reject_data: Optional[RejectRequest] = None,
    db: Session = Depends(get_db),
):
    """
    Reject a booking request (landlord only)
    """
    # TODO: Get landlord from JWT token
    landlord = db.query(User).filter(User.user_type.in_(["landlord", "LANDLORD"])).first()
    if not landlord:
        return error_response(
            message="Landlord not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        return error_response(
            message="Booking not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    if booking.landlord_id != landlord.id:
        return error_response(
            message="Unauthorized",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    booking.status = BookingStatus.REJECTED
    if reject_data and reject_data.landlord_response:
        booking.landlord_response = reject_data.landlord_response
    else:
        booking.landlord_response = "Booking rejected"
    
    # Set room back to AVAILABLE when booking is rejected
    room = db.query(Room).filter(Room.id == booking.room_id).first()
    if room:
        room.status = RoomStatus.AVAILABLE
    
    db.commit()
    
    return success_response(
        data={"booking_id": booking.id, "status": booking.status.value},
        message="Booking rejected"
    )


@router.post("/{booking_id}/payment/initiate")
async def initiate_payment(
    booking_id: int,
    payment_data: PaymentRequest,
    db: Session = Depends(get_db),
):
    """
    Initiate payment for a booking
    """
    # TODO: Get tenant from JWT token
    tenant = db.query(User).filter(User.user_type.in_(["tenant", "TENANT"])).first()
    if not tenant:
        return error_response(
            message="Tenant not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        return error_response(
            message="Booking not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    if booking.tenant_id != tenant.id:
        return error_response(
            message="Unauthorized",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    if booking.status != BookingStatus.APPROVED:
        return error_response(
            message="Booking must be approved before payment",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Calculate amount based on payment type
    amount = 0
    if payment_data.payment_type == "rent":
        amount = booking.monthly_rent
    elif payment_data.payment_type == "security_deposit":
        amount = booking.security_deposit or 0
    elif payment_data.payment_type == "advance":
        amount = booking.advance_payment or 0
    else:
        return error_response(
            message="Invalid payment type",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    if amount <= 0:
        return error_response(
            message="Invalid payment amount",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Generate transaction UUID
    transaction_uuid = str(uuid.uuid4())
    
    # Create payment record
    new_payment = Payment(
        booking_id=booking_id,
        tenant_id=tenant.id,
        landlord_id=booking.landlord_id,
        amount=amount,
        payment_type=payment_data.payment_type,
        payment_month=payment_data.payment_month,
        transaction_uuid=transaction_uuid,
        status=PaymentStatus.PENDING
    )
    
    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)
    
    # Generate eSewa payment form
    esewa = EsewaPayment(
        amount=amount,
        total_amount=amount,
        transaction_uuid=transaction_uuid,
        success_url=f"http://localhost:3000/payment/success?payment_id={new_payment.id}",
        failure_url=f"http://localhost:3000/payment/failure?payment_id={new_payment.id}",
    )
    
    form_data = esewa.generate_form_data()
    
    return success_response(
        data={
            "payment_id": new_payment.id,
            "transaction_uuid": transaction_uuid,
            "amount": amount,
            "form_data": form_data,
            "form_url": esewa.TEST_URL,
        },
        message="Payment initiated successfully"
    )


@router.post("/payment/verify")
async def verify_payment(
    transaction_uuid: str = Query(...),
    ref_id: str = Query(...),
    signature: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Verify eSewa payment callback
    After successful payment, activate the booking
    """
    payment = db.query(Payment).filter(Payment.transaction_uuid == transaction_uuid).first()
    if not payment:
        return error_response(
            message="Payment not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    # Verify signature
    esewa = EsewaPayment(
        amount=payment.amount,
        total_amount=payment.amount,
        transaction_uuid=transaction_uuid,
    )
    
    verify_data = {
        "total_amount": str(payment.amount),
        "transaction_uuid": transaction_uuid,
        "product_code": esewa.TEST_PRODUCT_CODE,
    }
    
    if not esewa.verify_signature(signature, verify_data):
        return error_response(
            message="Invalid signature",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Update payment status
    payment.status = PaymentStatus.COMPLETED
    payment.esewa_ref_id = ref_id
    payment.esewa_signature = signature
    payment.completed_at = datetime.utcnow()
    
    # Update booking and room status
    booking = db.query(Booking).filter(Booking.id == payment.booking_id).first()
    if booking:
        # If this is the booking payment (security deposit + advance)
        if payment.payment_type == "booking_payment":
            # Payment is completed, but booking remains PENDING until landlord approves
            # Don't auto-approve - landlord must approve manually
            # Update room status to RESERVED so it's not available in marketplace
            room = db.query(Room).filter(Room.id == booking.room_id).first()
            if room:
                room.status = RoomStatus.RESERVED  # Not available in search until landlord approves
        # For other payment types (monthly rent, etc.)
        elif payment.payment_type in ["security_deposit", "advance"]:
            # Only activate tenancy if booking is already approved by landlord
            if booking.status == BookingStatus.APPROVED:
                booking.tenancy_status = TenancyStatus.ACTIVE
                room = db.query(Room).filter(Room.id == booking.room_id).first()
                if room:
                    room.status = RoomStatus.OCCUPIED
    
    db.commit()
    
    return success_response(
        data={
            "payment_id": payment.id,
            "booking_id": booking.id if booking else None,
            "status": payment.status.value,
            "booking_status": booking.status.value if booking else None,
        },
        message="Payment verified successfully"
    )


@router.get("/landlord/income")
async def get_landlord_income(
    db: Session = Depends(get_db),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    """
    Get income summary for landlord
    """
    # TODO: Get landlord from JWT token
    landlord = db.query(User).filter(User.user_type.in_(["landlord", "LANDLORD"])).first()
    if not landlord:
        return success_response(
            data={"total_income": 0, "payments": []},
            message="No income data found"
        )
    
    query = db.query(Payment).filter(
        and_(
            Payment.landlord_id == landlord.id,
            Payment.status == PaymentStatus.COMPLETED
        )
    )
    
    if start_date:
        try:
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(Payment.completed_at >= start)
        except ValueError:
            pass
    
    if end_date:
        try:
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(Payment.completed_at <= end)
        except ValueError:
            pass
    
    payments = query.order_by(Payment.completed_at.desc()).all()
    
    total_income = sum(p.amount for p in payments)
    
    result = []
    for payment in payments:
        booking = db.query(Booking).filter(Booking.id == payment.booking_id).first()
        tenant = db.query(User).filter(User.id == payment.tenant_id).first()
        room = db.query(Room).filter(Room.id == booking.room_id).first() if booking else None
        
        result.append({
            "id": payment.id,
            "booking_id": payment.booking_id,
            "tenant_name": tenant.full_name or tenant.email if tenant else "Unknown",
            "room_title": room.title if room else "Unknown",
            "amount": payment.amount,
            "payment_type": payment.payment_type,
            "payment_month": payment.payment_month,
            "completed_at": payment.completed_at.isoformat() if payment.completed_at else None,
        })
    
    return success_response(
        data={
            "total_income": total_income,
            "payment_count": len(payments),
            "payments": result,
        },
        message="Income data retrieved successfully"
    )


@router.get("/tenant/transactions")
async def get_tenant_transactions(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Get all payment transactions for tenant
    """
    # Get tenant from JWT token
    tenant = get_current_user_from_token(request, db)
    if not tenant:
        return error_response(
            message="Authentication required",
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    # Verify user is a tenant
    user_type_lower = tenant.user_type.lower() if tenant.user_type else ""
    if user_type_lower not in ["tenant", "tenants"]:
        return error_response(
            message="Access denied. This endpoint is for tenants only.",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    # Get all completed payments for tenant
    payments = db.query(Payment).filter(
        and_(
            Payment.tenant_id == tenant.id,
            Payment.status == PaymentStatus.COMPLETED
        )
    ).order_by(Payment.completed_at.desc()).all()
    
    result = []
    for payment in payments:
        booking = db.query(Booking).filter(Booking.id == payment.booking_id).first()
        room = db.query(Room).filter(Room.id == booking.room_id).first() if booking else None
        landlord = db.query(User).filter(User.id == payment.landlord_id).first() if payment.landlord_id else None
        
        result.append({
            "id": payment.id,
            "booking_id": payment.booking_id,
            "room_title": room.title if room else "Unknown",
            "landlord_name": landlord.full_name or landlord.email if landlord else "Unknown",
            "amount": payment.amount,
            "payment_type": payment.payment_type,
            "payment_month": payment.payment_month,
            "transaction_uuid": payment.transaction_uuid,
            "esewa_ref_id": payment.esewa_ref_id,
            "status": payment.status.value,
            "created_at": payment.created_at.isoformat() if payment.created_at else None,
            "completed_at": payment.completed_at.isoformat() if payment.completed_at else None,
        })
    
    total_paid = sum(p.amount for p in payments)
    
    return success_response(
        data={
            "transactions": result,
            "total_paid": total_paid,
            "transaction_count": len(payments),
        },
        message="Transactions retrieved successfully"
    )


@router.get("/tenant/upcoming-payments")
async def get_upcoming_payments(
    db: Session = Depends(get_db),
):
    """
    Get upcoming monthly payments for tenant
    """
    # TODO: Get tenant from JWT token
    tenant = db.query(User).filter(User.user_type.in_(["tenant", "TENANT"])).first()
    if not tenant:
        return success_response(data=[], message="No upcoming payments")
    
    # Get active bookings
    active_bookings = db.query(Booking).filter(
        and_(
            Booking.tenant_id == tenant.id,
            Booking.status == BookingStatus.APPROVED,
            Booking.tenancy_status == TenancyStatus.ACTIVE
        )
    ).all()
    
    upcoming_payments = []
    current_month = datetime.utcnow().strftime("%Y-%m")
    
    for booking in active_bookings:
        # Check if payment for current month exists
        existing_payment = db.query(Payment).filter(
            and_(
                Payment.booking_id == booking.id,
                Payment.payment_type == "rent",
                Payment.payment_month == current_month,
                Payment.status == PaymentStatus.COMPLETED
            )
        ).first()
        
        if not existing_payment:
            room = db.query(Room).filter(Room.id == booking.room_id).first()
            upcoming_payments.append({
                "booking_id": booking.id,
                "room_title": room.title if room else "Unknown",
                "amount": booking.monthly_rent,
                "payment_month": current_month,
                "due_date": (datetime.utcnow().replace(day=1) + timedelta(days=32)).isoformat(),
            })
    
    return success_response(
        data=upcoming_payments,
        message="Upcoming payments retrieved successfully"
    )

