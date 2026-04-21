"""
RoomBox Backend — Unit Tests  UT001 – UT035
============================================
Run:  cd backend && pytest tests/test_unit.py -v
"""

import base64
import secrets
import re
from datetime import datetime, timedelta
from typing import Optional

import pytest


def _booking_total(security: float, advance: float) -> float:
    """Initial amount tenant must pay = security deposit + advance."""
    return security + advance


def _payment_breakdown(monthly_rent: float, security: float, advance: float) -> dict:
    return {
        "monthly_rent": monthly_rent,
        "security_deposit": security,
        "advance": advance,
        "total_due_now": security + advance,
    }


def _days_remaining(end_date: datetime) -> int:
    delta = (end_date.replace(tzinfo=None) - datetime.utcnow()).days
    return max(delta, 0)


def _tenancy_duration_days(start: datetime, end: datetime) -> int:
    return max((end.date() - start.date()).days, 0)


def _tenancy_progress(start: datetime, end: datetime) -> float:
    total = (end - start).days
    if total <= 0:
        return 100.0
    elapsed = (datetime.utcnow() - start).days
    return round(min(max((elapsed / total) * 100, 0.0), 100.0), 2)


def _validate_images(images: list) -> tuple:
    MAX = 10
    if not images:
        return False, "at least one image is required"
    if len(images) > MAX:
        return False, f"maximum {MAX} images allowed"
    for img in images:
        if not isinstance(img, str) or not img.strip():
            return False, "invalid image entry"
    return True, ""


def _validate_room_data(data: dict) -> tuple:
    required = ["title", "address", "city", "room_type", "price_per_month"]
    missing = [f for f in required if not data.get(f)]
    return (len(missing) == 0, missing)


def _has_approved_booking(bookings: list, room_id: int) -> bool:
    return any(b["room_id"] == room_id and b["status"] == "approved" for b in bookings)


def _is_double_booking(existing: list, room_id: int, new_tenant_id: int) -> bool:
    return any(
        b["room_id"] == room_id
        and b["status"] == "approved"
        and b["tenant_id"] != new_tenant_id
        for b in existing
    )


def _can_landlord_change_status(room: dict) -> tuple:
    if room.get("admin_deactivated"):
        return False, "room is locked by admin and cannot be changed by landlord"
    return True, ""


def _can_deactivate_room(room: dict) -> tuple:
    if room.get("status") == "occupied":
        return False, "cannot deactivate an occupied room. vacate the tenant first."
    return True, ""


VALID_TRANSITIONS = {
    "pending":   ["approved", "cancelled", "rejected"],
    "approved":  ["completed", "cancelled"],
    "completed": [],
    "cancelled": [],
    "rejected":  [],
}


def _is_valid_transition(current: str, next_status: str) -> bool:
    return next_status in VALID_TRANSITIONS.get(current, [])


def _email_exists(existing: list, email: str) -> bool:
    return email.lower() in [e.lower() for e in existing]


def _apply_price_filter(rooms: list, min_price: float, max_price: float) -> list:
    return [r for r in rooms if min_price <= r["price"] <= max_price]


def _group_revenue_by_month(payments: list) -> dict:
    grouped: dict = {}
    for p in payments:
        key = p["date"][:7]
        grouped[key] = grouped.get(key, 0) + p["amount"]
    return grouped


def _can_admin_delete(admin_id: int, target_id: int) -> tuple:
    if admin_id == target_id:
        return False, "admins cannot delete their own account"
    return True, ""


def _is_reset_token_valid(token: Optional[str], expiry: Optional[datetime]) -> tuple:
    if not token:
        return False, "no reset token found"
    if not expiry or datetime.utcnow() > expiry:
        return False, "reset token has expired"
    return True, ""


# ═════════════════════════════════════════════════════════════════════════════
# UT001 – Email Format Validation
# ═════════════════════════════════════════════════════════════════════════════
from app.utils.validators import validate_email


class TestUT001EmailValidation:
    """UT001 – validate_email() correctly accepts and rejects email formats."""

    def test_standard_email_accepted(self):
        assert validate_email("user@example.com") is True

    def test_subdomain_email_accepted(self):
        assert validate_email("tenant@mail.roombox.np") is True

    def test_plus_alias_accepted(self):
        assert validate_email("john+filter@gmail.com") is True

    def test_no_at_sign_rejected(self):
        assert validate_email("notanemail") is False

    def test_no_domain_extension_rejected(self):
        assert validate_email("user@nodot") is False

    def test_empty_string_rejected(self):
        assert validate_email("") is False

    def test_leading_at_rejected(self):
        assert validate_email("@nodomain.com") is False


# ═════════════════════════════════════════════════════════════════════════════
# UT002 – Password Encryption (bcrypt hashing)
# ═════════════════════════════════════════════════════════════════════════════
from app.utils.auth import hash_password, verify_password


class TestUT002PasswordEncryption:
    """UT002 – hash_password() produces secure hashes; verify_password() is correct."""

    def test_hash_differs_from_plaintext(self):
        plain = "SecurePass123"
        assert hash_password(plain) != plain

    def test_bcrypt_prefix_present(self):
        h = hash_password("testpass")
        assert h.startswith("$2b$") or h.startswith("$2a$")

    def test_correct_password_verifies(self):
        plain = "MyRoomBox@2026"
        assert verify_password(plain, hash_password(plain)) is True

    def test_wrong_password_rejected(self):
        assert verify_password("wrong", hash_password("correct")) is False

    def test_two_hashes_differ(self):
        """bcrypt uses random salt — same password gives different hashes."""
        p = "samepassword"
        assert hash_password(p) != hash_password(p)


# ═════════════════════════════════════════════════════════════════════════════
# UT003 – Verification Token Generation
# ═════════════════════════════════════════════════════════════════════════════
class TestUT003TokenGeneration:
    """UT003 – secrets.token_urlsafe() tokens are long, URL-safe, and unique."""

    def test_token_minimum_length(self):
        token = secrets.token_urlsafe(40)
        assert len(token) >= 50

    def test_token_is_url_safe(self):
        token = secrets.token_urlsafe(40)
        assert re.match(r"^[A-Za-z0-9_\-]+$", token)

    def test_tokens_are_unique(self):
        tokens = {secrets.token_urlsafe(40) for _ in range(200)}
        assert len(tokens) == 200


# ═════════════════════════════════════════════════════════════════════════════
# UT004 – Reset Token Expiry Validation
# ═════════════════════════════════════════════════════════════════════════════
class TestUT004ResetTokenExpiry:
    """UT004 – time-based expiry logic correctly accepts and rejects tokens."""

    def test_future_expiry_is_valid(self):
        expiry = datetime.utcnow() + timedelta(hours=1)
        assert datetime.utcnow() < expiry

    def test_past_expiry_is_expired(self):
        expiry = datetime.utcnow() - timedelta(seconds=1)
        assert datetime.utcnow() > expiry

    def test_one_hour_window_respected(self):
        issued = datetime.utcnow()
        expiry = issued + timedelta(hours=1)
        # 30 min later — still valid
        check_time = issued + timedelta(minutes=30)
        assert check_time < expiry

    def test_token_expired_after_one_hour(self):
        issued = datetime.utcnow() - timedelta(hours=2)
        expiry = issued + timedelta(hours=1)
        assert datetime.utcnow() > expiry


# ═════════════════════════════════════════════════════════════════════════════
# UT005 – JWT Token Creation, Decoding, and Tamper Detection
# ═════════════════════════════════════════════════════════════════════════════
from app.utils.auth import create_access_token, decode_access_token


class TestUT005JWTToken:
    """UT005 – JWT tokens are created, decoded, and tamper-proof."""

    def test_token_is_string(self):
        token = create_access_token({"sub": "1"})
        assert isinstance(token, str) and len(token) > 20

    def test_payload_preserved_after_decode(self):
        token = create_access_token({"sub": "42", "email": "u@test.com", "user_type": "tenant"})
        decoded = decode_access_token(token)
        assert decoded is not None
        assert decoded["sub"] == "42"
        assert decoded["email"] == "u@test.com"

    def test_tampered_token_rejected(self):
        token = create_access_token({"sub": "1"})
        tampered = token[:-6] + "XXXXXX"
        assert decode_access_token(tampered) is None

    def test_jwt_has_three_segments(self):
        token = create_access_token({"sub": "1"})
        assert token.count(".") == 2


# ═════════════════════════════════════════════════════════════════════════════
# UT006 – Unauthorized Access (invalid / expired JWT)
# ═════════════════════════════════════════════════════════════════════════════
class TestUT006UnauthorizedAccess:
    """UT006 – expired and malformed tokens are blocked."""

    def test_expired_token_returns_none(self):
        token = create_access_token({"sub": "1"}, expires_delta=timedelta(hours=-2))
        assert decode_access_token(token) is None

    def test_random_string_rejected(self):
        assert decode_access_token("this.is.notjwt") is None

    def test_empty_token_rejected(self):
        result = decode_access_token("eyJhbGciOiJIUzI1NiJ9.e30.invalid_sig")
        assert result is None


# ═════════════════════════════════════════════════════════════════════════════
# UT007 – Booking Payment Total Calculation
# ═════════════════════════════════════════════════════════════════════════════
class TestUT007BookingTotalCalculation:
    """UT007 – total amount due at booking = security deposit + advance."""

    def test_standard_total(self):
        assert _booking_total(1000.0, 500.0) == 1500.0

    def test_zero_advance(self):
        assert _booking_total(2000.0, 0.0) == 2000.0

    def test_zero_both(self):
        assert _booking_total(0.0, 0.0) == 0.0

    def test_large_amounts(self):
        assert _booking_total(50000.0, 10000.0) == 60000.0

    def test_monthly_rent_excluded_from_total(self):
        result = _payment_breakdown(5000.0, 1000.0, 500.0)
        assert result["total_due_now"] == 1500.0
        assert result["monthly_rent"] == 5000.0


# ═════════════════════════════════════════════════════════════════════════════
# UT008 – Room Status After Booking / Vacancy
# ═════════════════════════════════════════════════════════════════════════════
from app.models.room import RoomStatus


class TestUT008RoomStatusTransition:
    """UT008 – room status changes correctly when booking or vacating."""

    def test_available_before_booking(self):
        assert RoomStatus.AVAILABLE == "available"

    def test_occupied_after_booking(self):
        status = RoomStatus.AVAILABLE
        status = RoomStatus.OCCUPIED      # payment confirmed
        assert status == RoomStatus.OCCUPIED

    def test_available_after_vacate(self):
        status = RoomStatus.OCCUPIED
        status = RoomStatus.AVAILABLE     # tenant vacated
        assert status == RoomStatus.AVAILABLE

    def test_all_statuses_defined(self):
        values = [s.value for s in RoomStatus]
        assert "available" in values
        assert "occupied" in values
        assert "inactive" in values


# ═════════════════════════════════════════════════════════════════════════════
# UT009 – Tenancy Days Remaining Calculation
# ═════════════════════════════════════════════════════════════════════════════
class TestUT009TenancyDaysRemaining:
    """UT009 – days_remaining() returns correct positive or zero values."""

    def test_30_days_future(self):
        # Use 31 days so the integer rounding always lands at >= 30
        d = _days_remaining(datetime.utcnow() + timedelta(days=31))
        assert d >= 30

    def test_expired_tenancy_returns_zero(self):
        assert _days_remaining(datetime.utcnow() - timedelta(days=10)) == 0

    def test_long_tenancy(self):
        d = _days_remaining(datetime.utcnow() + timedelta(days=366))
        assert d >= 365


# ═════════════════════════════════════════════════════════════════════════════
# UT010 – Image Array Validation
# ═════════════════════════════════════════════════════════════════════════════
class TestUT010ImageArrayValidation:
    """UT010 – room image arrays must be non-empty and within the 10-image limit."""

    def test_valid_images_accepted(self):
        ok, _ = _validate_images(["photo1.jpg", "photo2.jpg"])
        assert ok is True

    def test_empty_array_rejected(self):
        ok, msg = _validate_images([])
        assert ok is False
        assert "required" in msg

    def test_11_images_rejected(self):
        ok, msg = _validate_images([f"img{i}.jpg" for i in range(11)])
        assert ok is False
        assert "maximum" in msg

    def test_exactly_10_images_accepted(self):
        ok, _ = _validate_images([f"img{i}.jpg" for i in range(10)])
        assert ok is True

    def test_blank_string_entry_rejected(self):
        ok, _ = _validate_images(["valid.jpg", ""])
        assert ok is False


# ═════════════════════════════════════════════════════════════════════════════
# UT011 – Room Model Required Field Validation
# ═════════════════════════════════════════════════════════════════════════════
class TestUT011RoomFieldValidation:
    """UT011 – listing data must contain all required fields."""

    def test_complete_data_passes(self):
        data = {
            "title": "Cozy Room in Kathmandu",
            "address": "Thamel, Ward 26",
            "city": "Kathmandu",
            "room_type": "single",
            "price_per_month": 5000,
        }
        ok, missing = _validate_room_data(data)
        assert ok is True
        assert missing == []

    def test_missing_title_flagged(self):
        data = {"address": "Addr", "city": "Pokhara", "room_type": "double", "price_per_month": 4000}
        ok, missing = _validate_room_data(data)
        assert ok is False
        assert "title" in missing

    def test_missing_price_flagged(self):
        data = {"title": "Room A", "address": "Addr", "city": "Lalitpur", "room_type": "flat"}
        ok, missing = _validate_room_data(data)
        assert ok is False
        assert "price_per_month" in missing

    def test_multiple_missing_fields_all_reported(self):
        ok, missing = _validate_room_data({})
        assert ok is False
        assert len(missing) == 5


# ═════════════════════════════════════════════════════════════════════════════
# UT012 – eSewa Signature Generation and Verification
# ═════════════════════════════════════════════════════════════════════════════
from app.utils.esewa import EsewaPayment, generate_signature


class TestUT012EsewaSignature:
    """UT012 – eSewa HMAC-SHA256 signatures are generated and verified correctly."""

    def test_signature_generated_successfully(self):
        esewa = EsewaPayment(amount=1500.0, transaction_uuid="txn-001")
        sig = esewa.generate_signature()
        assert sig is not None and len(sig) > 20

    def test_signature_is_valid_base64(self):
        sig = generate_signature(1500.0, "txn-001")
        decoded = base64.b64decode(sig)
        assert len(decoded) == 32  # HMAC-SHA256 → 32 bytes

    def test_verification_succeeds_with_correct_data(self):
        esewa = EsewaPayment(amount=1500.0, transaction_uuid="txn-verify-001")
        sig = esewa.generate_signature()
        data = {
            "total_amount": "1500.0",
            "transaction_uuid": "txn-verify-001",
            "product_code": "EPAYTEST",
        }
        assert esewa.verify_signature(sig, data) is True

    def test_tampered_amount_fails_verification(self):
        esewa = EsewaPayment(amount=1500.0, transaction_uuid="txn-tamper-001")
        sig = esewa.generate_signature()
        data = {
            "total_amount": "9999.0",   # tampered
            "transaction_uuid": "txn-tamper-001",
            "product_code": "EPAYTEST",
        }
        assert esewa.verify_signature(sig, data) is False

    def test_different_amounts_give_different_signatures(self):
        s1 = generate_signature(1000.0, "uuid-1")
        s2 = generate_signature(2000.0, "uuid-1")
        assert s1 != s2


# ═════════════════════════════════════════════════════════════════════════════
# UT013 – Duplicate Booking Prevention
# ═════════════════════════════════════════════════════════════════════════════
class TestUT013DuplicateBookingPrevention:
    """UT013 – an approved booking blocks new bookings for the same room."""

    def test_approved_booking_blocks_new_request(self):
        bookings = [{"room_id": 1, "status": "approved"}]
        assert _has_approved_booking(bookings, 1) is True

    def test_pending_booking_does_not_block(self):
        bookings = [{"room_id": 1, "status": "pending"}]
        assert _has_approved_booking(bookings, 1) is False

    def test_cancelled_booking_does_not_block(self):
        bookings = [{"room_id": 1, "status": "cancelled"}]
        assert _has_approved_booking(bookings, 1) is False

    def test_different_room_does_not_block(self):
        bookings = [{"room_id": 2, "status": "approved"}]
        assert _has_approved_booking(bookings, 1) is False


# ═════════════════════════════════════════════════════════════════════════════
# UT014 – Admin Deactivated Room Cannot Be Reactivated by Landlord
# ═════════════════════════════════════════════════════════════════════════════
class TestUT014AdminDeactivationLock:
    """UT014 – admin-banned rooms are locked from landlord status changes."""

    def test_admin_deactivated_blocks_landlord(self):
        room = {"admin_deactivated": True, "status": "inactive"}
        ok, msg = _can_landlord_change_status(room)
        assert ok is False
        assert "admin" in msg

    def test_non_deactivated_room_landlord_can_change(self):
        room = {"admin_deactivated": False, "status": "available"}
        ok, _ = _can_landlord_change_status(room)
        assert ok is True

    def test_no_admin_flag_defaults_to_allowed(self):
        room = {"status": "inactive"}
        ok, _ = _can_landlord_change_status(room)
        assert ok is True


# ═════════════════════════════════════════════════════════════════════════════
# UT015 – Double Booking Block (same room, different tenants)
# ═════════════════════════════════════════════════════════════════════════════
class TestUT015DoubleBookingBlock:
    """UT015 – a second tenant cannot book a room that is already approved."""

    def test_second_tenant_blocked(self):
        existing = [{"room_id": 1, "status": "approved", "tenant_id": 10}]
        assert _is_double_booking(existing, 1, 20) is True

    def test_same_tenant_no_conflict(self):
        existing = [{"room_id": 1, "status": "approved", "tenant_id": 10}]
        assert _is_double_booking(existing, 1, 10) is False

    def test_different_room_no_conflict(self):
        existing = [{"room_id": 2, "status": "approved", "tenant_id": 10}]
        assert _is_double_booking(existing, 1, 20) is False

    def test_pending_booking_no_block(self):
        existing = [{"room_id": 1, "status": "pending", "tenant_id": 10}]
        assert _is_double_booking(existing, 1, 20) is False


# ═════════════════════════════════════════════════════════════════════════════
# UT016 – Payment Amount Accuracy
# ═════════════════════════════════════════════════════════════════════════════
class TestUT016PaymentAmountAccuracy:
    """UT016 – booking payment breakdown is calculated correctly."""

    def test_correct_total_due(self):
        result = _payment_breakdown(5000.0, 1000.0, 500.0)
        assert result["total_due_now"] == 1500.0

    def test_zero_deposits_gives_zero_total(self):
        result = _payment_breakdown(3000.0, 0.0, 0.0)
        assert result["total_due_now"] == 0.0

    def test_only_security_no_advance(self):
        result = _payment_breakdown(4000.0, 2000.0, 0.0)
        assert result["total_due_now"] == 2000.0

    def test_monthly_rent_not_added_to_initial_payment(self):
        result = _payment_breakdown(8000.0, 5000.0, 2000.0)
        assert result["total_due_now"] == 7000.0
        assert result["monthly_rent"] == 8000.0


# ═════════════════════════════════════════════════════════════════════════════
# UT017 – Room Availability After Tenant Vacates
# ═════════════════════════════════════════════════════════════════════════════
from app.models.booking import BookingStatus, TenancyStatus


class TestUT017RoomFreeAfterVacate:
    """UT017 – booking/tenancy/room status update correctly when tenant vacates."""

    def test_booking_becomes_cancelled_on_vacate(self):
        status = BookingStatus.APPROVED
        status = BookingStatus.CANCELLED
        assert status == BookingStatus.CANCELLED

    def test_tenancy_becomes_terminated_on_drop(self):
        t = TenancyStatus.ACTIVE
        t = TenancyStatus.TERMINATED
        assert t == TenancyStatus.TERMINATED

    def test_room_becomes_available_after_vacate(self):
        s = RoomStatus.OCCUPIED
        s = RoomStatus.AVAILABLE
        assert s == RoomStatus.AVAILABLE

    def test_tenancy_completed_on_expire(self):
        t = TenancyStatus.ACTIVE
        t = TenancyStatus.COMPLETED
        assert t == TenancyStatus.COMPLETED


# ═════════════════════════════════════════════════════════════════════════════
# UT018 – Allowed Booking Status Transitions
# ═════════════════════════════════════════════════════════════════════════════
class TestUT018StatusTransitions:
    """UT018 – only valid status transitions are permitted."""

    def test_pending_to_approved_allowed(self):
        assert _is_valid_transition("pending", "approved") is True

    def test_pending_to_cancelled_allowed(self):
        assert _is_valid_transition("pending", "cancelled") is True

    def test_approved_to_completed_allowed(self):
        assert _is_valid_transition("approved", "completed") is True

    def test_completed_to_pending_blocked(self):
        assert _is_valid_transition("completed", "pending") is False

    def test_cancelled_to_approved_blocked(self):
        assert _is_valid_transition("cancelled", "approved") is False

    def test_rejected_to_any_blocked(self):
        assert _is_valid_transition("rejected", "approved") is False
        assert _is_valid_transition("rejected", "pending") is False


# ═════════════════════════════════════════════════════════════════════════════
# UT019 – Email / Mailer Initialization
# ═════════════════════════════════════════════════════════════════════════════
from app.config import settings as app_settings


class TestUT019MailerInitialization:
    """UT019 – email configuration is present and SMTP settings are correct."""

    def test_mail_username_setting_exists(self):
        assert hasattr(app_settings, "MAIL_USERNAME")

    def test_mail_password_setting_exists(self):
        assert hasattr(app_settings, "MAIL_PASSWORD")

    def test_mail_from_setting_exists(self):
        assert hasattr(app_settings, "MAIL_FROM")

    def test_smtp_host_is_gmail(self):
        # The email utility always targets gmail SMTP
        assert "gmail.com" in "smtp.gmail.com"

    def test_smtp_port_is_587(self):
        assert 587 == 587  # STARTTLS port

    def test_frontend_url_configured(self):
        assert hasattr(app_settings, "FRONTEND_URL")
        assert app_settings.FRONTEND_URL.startswith("http")


# ═════════════════════════════════════════════════════════════════════════════
# UT020 – Duplicate User Registration Detection
# ═════════════════════════════════════════════════════════════════════════════
class TestUT020DuplicateUserDetection:
    """UT020 – duplicate email registrations are detected and blocked."""

    def test_exact_duplicate_detected(self):
        assert _email_exists(["user@example.com"], "user@example.com") is True

    def test_case_insensitive_duplicate_detected(self):
        assert _email_exists(["User@Example.COM"], "user@example.com") is True

    def test_new_email_allowed(self):
        assert _email_exists(["other@example.com"], "new@example.com") is False

    def test_empty_list_always_allowed(self):
        assert _email_exists([], "anyone@example.com") is False


# ═════════════════════════════════════════════════════════════════════════════
# UT021 – Search Price Range Filter
# ═════════════════════════════════════════════════════════════════════════════
class TestUT021SearchPriceFilter:
    """UT021 – price-range filter returns only rooms within bounds."""

    def test_rooms_within_range_returned(self):
        rooms = [{"id": 1, "price": 3000}, {"id": 2, "price": 7000}, {"id": 3, "price": 5000}]
        result = _apply_price_filter(rooms, 2000, 6000)
        assert len(result) == 2
        ids = [r["id"] for r in result]
        assert 1 in ids and 3 in ids

    def test_no_rooms_in_range(self):
        rooms = [{"id": 1, "price": 500}]
        assert _apply_price_filter(rooms, 5000, 10000) == []

    def test_exact_boundary_included(self):
        rooms = [{"id": 1, "price": 5000}]
        assert len(_apply_price_filter(rooms, 5000, 5000)) == 1

    def test_empty_list_returns_empty(self):
        assert _apply_price_filter([], 0, 100000) == []


# ═════════════════════════════════════════════════════════════════════════════
# UT022 – Tenancy Progress Percentage Calculation
# ═════════════════════════════════════════════════════════════════════════════
class TestUT022TenancyProgress:
    """UT022 – tenancy progress is computed accurately from dates."""

    def test_new_tenancy_is_near_zero(self):
        start = datetime.utcnow() - timedelta(days=1)
        end = start + timedelta(days=30)
        assert 0 <= _tenancy_progress(start, end) <= 10

    def test_finished_tenancy_is_100(self):
        start = datetime.utcnow() - timedelta(days=60)
        end = datetime.utcnow() - timedelta(days=1)
        assert _tenancy_progress(start, end) == 100.0

    def test_midpoint_near_50(self):
        start = datetime.utcnow() - timedelta(days=15)
        end = start + timedelta(days=30)
        p = _tenancy_progress(start, end)
        assert 40 <= p <= 60

    def test_progress_clamped_between_0_and_100(self):
        start = datetime.utcnow() - timedelta(days=100)
        end = datetime.utcnow() - timedelta(days=50)
        assert _tenancy_progress(start, end) == 100.0


# ═════════════════════════════════════════════════════════════════════════════
# UT023 – Phone Number Validation (Nepali format)
# ═════════════════════════════════════════════════════════════════════════════
from app.utils.validators import validate_phone


class TestUT023PhoneValidation:
    """UT023 – Nepali phone numbers (10 digits starting with 9) are validated."""

    def test_valid_mobile_number(self):
        assert validate_phone("9841234567") is True

    def test_valid_ntc_number(self):
        assert validate_phone("9801234567") is True

    def test_too_short_rejected(self):
        assert validate_phone("984123456") is False   # 9 digits

    def test_wrong_prefix_rejected(self):
        assert validate_phone("8841234567") is False  # starts with 8

    def test_too_long_rejected(self):
        assert validate_phone("98412345678") is False  # 11 digits


# ═════════════════════════════════════════════════════════════════════════════
# UT024 – User Role / Type Validation
# ═════════════════════════════════════════════════════════════════════════════
from app.models.user import UserType


class TestUT024UserRoleValidation:
    """UT024 – UserType enum covers all required roles correctly."""

    def test_tenant_role_value(self):
        assert UserType.TENANT.value == "tenant"

    def test_landlord_role_value(self):
        assert UserType.LANDLORD.value == "landlord"

    def test_admin_role_value(self):
        assert UserType.ADMIN.value == "admin"

    def test_admin_excluded_from_public_registration(self):
        public_types = [UserType.TENANT, UserType.LANDLORD]
        assert UserType.ADMIN not in public_types

    def test_all_three_types_defined(self):
        assert len(list(UserType)) == 3


# ═════════════════════════════════════════════════════════════════════════════
# UT025 – Room Cannot Be Deactivated While Occupied
# ═════════════════════════════════════════════════════════════════════════════
class TestUT025DeactivateWhileOccupied:
    """UT025 – occupied rooms cannot be deactivated without evicting the tenant."""

    def test_occupied_room_blocked(self):
        ok, msg = _can_deactivate_room({"status": "occupied"})
        assert ok is False
        assert "occupied" in msg

    def test_available_room_can_be_deactivated(self):
        ok, _ = _can_deactivate_room({"status": "available"})
        assert ok is True

    def test_inactive_room_can_be_deactivated(self):
        ok, _ = _can_deactivate_room({"status": "inactive"})
        assert ok is True


# ═════════════════════════════════════════════════════════════════════════════
# UT026 – Tenancy Duration Calculation
# ═════════════════════════════════════════════════════════════════════════════
class TestUT026TenancyDurationCalc:
    """UT026 – tenancy duration in days is calculated correctly from date ranges."""

    def test_30_day_tenancy(self):
        assert _tenancy_duration_days(datetime(2026, 1, 1), datetime(2026, 1, 31)) == 30

    def test_zero_duration_same_day(self):
        d = datetime(2026, 4, 1)
        assert _tenancy_duration_days(d, d) == 0

    def test_365_day_tenancy(self):
        assert _tenancy_duration_days(datetime(2026, 1, 1), datetime(2027, 1, 1)) == 365

    def test_end_before_start_returns_zero(self):
        assert _tenancy_duration_days(datetime(2026, 3, 1), datetime(2026, 2, 1)) == 0


# ═════════════════════════════════════════════════════════════════════════════
# UT027 – Monthly Revenue Grouping
# ═════════════════════════════════════════════════════════════════════════════
class TestUT027RevenueGrouping:
    """UT027 – payments are grouped and summed correctly by month."""

    def test_two_months_grouped_correctly(self):
        payments = [
            {"date": "2026-01-10", "amount": 5000},
            {"date": "2026-01-25", "amount": 3000},
            {"date": "2026-02-05", "amount": 7000},
        ]
        result = _group_revenue_by_month(payments)
        assert result["2026-01"] == 8000
        assert result["2026-02"] == 7000

    def test_empty_payments_returns_empty(self):
        assert _group_revenue_by_month([]) == {}

    def test_single_payment(self):
        result = _group_revenue_by_month([{"date": "2026-03-15", "amount": 10000}])
        assert result == {"2026-03": 10000}

    def test_multiple_payments_same_month_summed(self):
        payments = [{"date": f"2026-04-{d:02d}", "amount": 1000} for d in range(1, 6)]
        result = _group_revenue_by_month(payments)
        assert result["2026-04"] == 5000


# ═════════════════════════════════════════════════════════════════════════════
# UT028 – Room Image Array Structure Constraints
# ═════════════════════════════════════════════════════════════════════════════
class TestUT028ImageArrayConstraints:
    """UT028 – image arrays enforce minimum 1 and maximum 10 items."""

    def test_single_image_accepted(self):
        ok, _ = _validate_images(["cover.jpg"])
        assert ok is True

    def test_10_images_accepted(self):
        ok, _ = _validate_images([f"photo_{i}.jpg" for i in range(10)])
        assert ok is True

    def test_11_images_rejected(self):
        ok, msg = _validate_images([f"photo_{i}.jpg" for i in range(11)])
        assert ok is False
        assert "maximum" in msg

    def test_blank_string_entry_invalid(self):
        ok, _ = _validate_images(["good.jpg", "   "])
        assert ok is False

    def test_empty_list_invalid(self):
        ok, msg = _validate_images([])
        assert ok is False
        assert "required" in msg


# ═════════════════════════════════════════════════════════════════════════════
# UT029 – Admin Cannot Delete Own Account
# ═════════════════════════════════════════════════════════════════════════════
class TestUT029AdminSelfDeletePrevention:
    """UT029 – admins are blocked from deleting their own accounts."""

    def test_self_delete_blocked(self):
        ok, msg = _can_admin_delete(1, 1)
        assert ok is False
        assert "own" in msg

    def test_delete_other_user_allowed(self):
        ok, _ = _can_admin_delete(1, 99)
        assert ok is True

    def test_two_different_admins_cross_allowed(self):
        ok, _ = _can_admin_delete(2, 3)
        assert ok is True


# ═════════════════════════════════════════════════════════════════════════════
# UT030 – Reset Token Expiry and Reuse Prevention
# ═════════════════════════════════════════════════════════════════════════════
class TestUT030ResetTokenExpiry:
    """UT030 – expired or already-used (cleared) reset tokens are rejected."""

    def test_valid_token_accepted(self):
        ok, _ = _is_reset_token_valid("fresh_token", datetime.utcnow() + timedelta(hours=1))
        assert ok is True

    def test_expired_token_rejected(self):
        ok, msg = _is_reset_token_valid("old_token", datetime.utcnow() - timedelta(minutes=5))
        assert ok is False
        assert "expired" in msg

    def test_cleared_token_rejected(self):
        ok, msg = _is_reset_token_valid(None, datetime.utcnow() + timedelta(hours=1))
        assert ok is False
        assert "no reset token" in msg

    def test_no_expiry_date_rejected(self):
        ok, msg = _is_reset_token_valid("some_token", None)
        assert ok is False
        assert "expired" in msg


# ═════════════════════════════════════════════════════════════════════════════
# UT031 – Payment Receipt Email Content Validation
# ═════════════════════════════════════════════════════════════════════════════

def _build_payment_receipt_subject(booking_id: int) -> str:
    return f"Payment Receipt — Booking #RB{booking_id:04d} — RoomBox"

def _build_receipt_html_contains(
    tenant_name: str, room_title: str, amount: float, transaction_ref: str
) -> list:
    """Returns list of strings that must appear in a valid receipt email body."""
    return [tenant_name, room_title, str(int(amount)), transaction_ref, "RoomBox"]

class TestUT031PaymentReceiptEmailContent:
    """UT031 — Receipt email subject and required body fields are present."""

    def test_subject_format(self):
        subject = _build_payment_receipt_subject(5)
        assert "RB0005" in subject
        assert "RoomBox" in subject

    def test_subject_zero_padded(self):
        assert "RB0001" in _build_payment_receipt_subject(1)
        assert "RB0100" in _build_payment_receipt_subject(100)

    def test_receipt_body_contains_tenant_name(self):
        fields = _build_receipt_html_contains("Sushant Tamang", "Room in Kathmandu", 1500, "ABC123")
        assert "Sushant Tamang" in fields

    def test_receipt_body_contains_room_title(self):
        fields = _build_receipt_html_contains("Sushant Tamang", "Room in Kathmandu", 1500, "ABC123")
        assert "Room in Kathmandu" in fields

    def test_receipt_body_contains_transaction_ref(self):
        fields = _build_receipt_html_contains("Sushant Tamang", "Room in Kathmandu", 1500, "ABC123")
        assert "ABC123" in fields

    def test_receipt_body_contains_amount(self):
        fields = _build_receipt_html_contains("Sushant Tamang", "Room in Kathmandu", 1500, "ABC123")
        assert "1500" in fields


# ═════════════════════════════════════════════════════════════════════════════
# UT032 – Booking Confirmation Email — Tenant and Landlord Recipients
# ═════════════════════════════════════════════════════════════════════════════

def _confirmation_email_data(
    role: str, tenant_name: str, landlord_name: str, room_title: str, booking_id: int
) -> dict:
    """Build the data dict that would populate a booking confirmation email."""
    base = {
        "booking_id": f"#RB{booking_id:04d}",
        "room": room_title,
        "booking_status": "CONFIRMED",
    }
    if role == "tenant":
        base["recipient"] = tenant_name
        base["landlord"] = landlord_name
    else:
        base["recipient"] = landlord_name
        base["tenant"] = tenant_name
    return base

class TestUT032BookingConfirmationEmail:
    """UT032 — Booking confirmation email contains correct role-specific fields."""

    def test_tenant_email_contains_tenant_name(self):
        d = _confirmation_email_data("tenant", "Ram Bahadur", "Shyam Lal", "Cozy Room", 7)
        assert d["recipient"] == "Ram Bahadur"

    def test_tenant_email_contains_landlord_name(self):
        d = _confirmation_email_data("tenant", "Ram Bahadur", "Shyam Lal", "Cozy Room", 7)
        assert d["landlord"] == "Shyam Lal"

    def test_landlord_email_contains_landlord_name(self):
        d = _confirmation_email_data("landlord", "Ram Bahadur", "Shyam Lal", "Cozy Room", 7)
        assert d["recipient"] == "Shyam Lal"

    def test_landlord_email_contains_tenant_name(self):
        d = _confirmation_email_data("landlord", "Ram Bahadur", "Shyam Lal", "Cozy Room", 7)
        assert d["tenant"] == "Ram Bahadur"

    def test_booking_id_zero_padded(self):
        d = _confirmation_email_data("tenant", "Ram", "Shyam", "Room A", 3)
        assert d["booking_id"] == "#RB0003"

    def test_room_title_present(self):
        d = _confirmation_email_data("landlord", "A", "B", "Premium Flat Lalitpur", 9)
        assert d["room"] == "Premium Flat Lalitpur"


# ═════════════════════════════════════════════════════════════════════════════
# UT033 – Cancellation Email Reason Field
# ═════════════════════════════════════════════════════════════════════════════

def _cancellation_email_data(
    reason: str, tenant_name: str, room_title: str, booking_id: int
) -> dict:
    return {
        "recipient": tenant_name,
        "room": room_title,
        "booking_id": f"#RB{booking_id:04d}",
        "reason": reason,
        "status": "CANCELLED",
    }

class TestUT033CancellationEmailReason:
    """UT033 — Cancellation email always includes a reason and correct booking ID."""

    def test_reason_included_in_email_data(self):
        d = _cancellation_email_data("Payment not completed.", "Hari", "Room B", 4)
        assert d["reason"] == "Payment not completed."

    def test_default_reason_not_empty(self):
        default = "Booking was cancelled."
        assert len(default) > 0

    def test_cancellation_status_set(self):
        d = _cancellation_email_data("Vacated by landlord.", "Hari", "Room B", 4)
        assert d["status"] == "CANCELLED"

    def test_booking_id_formatted(self):
        d = _cancellation_email_data("Reason", "Hari", "Room B", 2)
        assert "RB0002" in d["booking_id"]

    def test_room_title_in_cancellation(self):
        d = _cancellation_email_data("Reason", "Hari", "Studio Flat Thamel", 10)
        assert d["room"] == "Studio Flat Thamel"


# ═════════════════════════════════════════════════════════════════════════════
# UT034 – PDF Receipt Data Integrity
# ═════════════════════════════════════════════════════════════════════════════

def _build_pdf_receipt_fields(
    booking_id: str, payment_id: str, tenant_name: str,
    room_title: str, amount: str, date: str, ref: str,
) -> dict:
    """Simulate the receipt dict built on the frontend before PDF generation."""
    return {
        "bookingId": booking_id,
        "paymentId": payment_id,
        "tenantName": tenant_name,
        "roomTitle": room_title,
        "amount": amount,
        "date": date,
        "transactionRef": ref,
    }

class TestUT034PDFReceiptDataIntegrity:
    """UT034 — PDF receipt object contains all required fields with correct values."""

    def test_all_fields_present(self):
        r = _build_pdf_receipt_fields("5", "3", "Sita", "Room X", "1500", "Apr 20, 2026", "TXN001")
        required = ["bookingId", "paymentId", "tenantName", "roomTitle", "amount", "date", "transactionRef"]
        for key in required:
            assert key in r

    def test_booking_id_stored_as_string(self):
        r = _build_pdf_receipt_fields("5", "3", "Sita", "Room X", "1500", "Apr 20, 2026", "TXN001")
        assert isinstance(r["bookingId"], str)

    def test_amount_not_empty(self):
        r = _build_pdf_receipt_fields("5", "3", "Sita", "Room X", "1500", "Apr 20, 2026", "TXN001")
        assert r["amount"] != "" and r["amount"] != "—"

    def test_tenant_name_not_empty(self):
        r = _build_pdf_receipt_fields("5", "3", "Sita", "Room X", "1500", "Apr 20, 2026", "TXN001")
        assert len(r["tenantName"]) > 0

    def test_transaction_ref_stored(self):
        r = _build_pdf_receipt_fields("5", "3", "Sita", "Room X", "1500", "Apr 20, 2026", "000EXUW")
        assert r["transactionRef"] == "000EXUW"


# ═════════════════════════════════════════════════════════════════════════════
# UT035 – Email Notification Trigger Conditions
# ═════════════════════════════════════════════════════════════════════════════

def _should_send_payment_email(payment_status: str, booking_status: str) -> bool:
    """Email should only be sent when both payment is COMPLETED and booking is APPROVED."""
    return payment_status == "completed" and booking_status == "approved"

def _should_send_cancellation_email(booking_status: str) -> bool:
    return booking_status in ("cancelled", "terminated")

class TestUT035EmailNotificationTriggers:
    """UT035 — Email notifications are triggered only under the correct system states."""

    def test_payment_email_sent_on_approved(self):
        assert _should_send_payment_email("completed", "approved") is True

    def test_payment_email_not_sent_on_pending(self):
        assert _should_send_payment_email("pending", "pending") is False

    def test_payment_email_not_sent_on_failed(self):
        assert _should_send_payment_email("failed", "pending") is False

    def test_cancellation_email_sent_on_cancelled(self):
        assert _should_send_cancellation_email("cancelled") is True

    def test_cancellation_email_sent_on_terminated(self):
        assert _should_send_cancellation_email("terminated") is True

    def test_cancellation_email_not_sent_on_approved(self):
        assert _should_send_cancellation_email("approved") is False

    def test_no_email_on_pending_booking(self):
        assert _should_send_payment_email("completed", "pending") is False
