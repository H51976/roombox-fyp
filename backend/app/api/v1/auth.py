import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, status, Depends
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.utils.response import success_response, error_response
from app.utils.validators import validate_email, validate_phone, validate_password
from app.utils.auth import verify_password, create_access_token
from app.utils.email import send_verification_email, send_password_reset_email
from app.database import get_db
from app.models.user import User, UserType

router = APIRouter()


# ── Request / Response schemas ─────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)
    phone: str
    user_type: str = Field(..., pattern="^(tenant|landlord)$")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _gen_token() -> str:
    return secrets.token_urlsafe(40)


# ── Auth endpoints ─────────────────────────────────────────────────────────────

@router.post("/login")
async def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    if not validate_email(credentials.email):
        return error_response(message="Invalid email format", status_code=status.HTTP_400_BAD_REQUEST)

    user = db.query(User).filter(User.email == credentials.email).first()

    if user and (user.user_type == "admin" or user.user_type == "ADMIN"):
        return error_response(message="Invalid email or password", status_code=status.HTTP_401_UNAUTHORIZED)

    if not user or not verify_password(credentials.password, user.hashed_password):
        return error_response(message="Invalid email or password", status_code=status.HTTP_401_UNAUTHORIZED)

    if not user.is_active:
        return error_response(message="Account is deactivated", status_code=status.HTTP_403_FORBIDDEN)

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "user_type": user.user_type}
    )
    user.last_login = datetime.utcnow()
    db.commit()

    return success_response(
        data={
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "user_type": user.user_type,
                "is_verified": user.is_verified,
            },
        },
        message="Login successful",
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: RegisterRequest, db: Session = Depends(get_db)):
    if not validate_email(user_data.email):
        return error_response(message="Invalid email format", status_code=status.HTTP_400_BAD_REQUEST)

    if not validate_phone(user_data.phone):
        return error_response(
            message="Invalid phone number. Please provide a valid 10-digit Nepali phone number",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    is_valid, err = validate_password(user_data.password)
    if not is_valid:
        return error_response(message=err or "Invalid password", status_code=status.HTTP_400_BAD_REQUEST)

    if user_data.password != user_data.confirm_password:
        return error_response(
            message="Passwords do not match",
            status_code=status.HTTP_400_BAD_REQUEST,
            errors={"confirm_password": "Passwords do not match"},
        )

    if db.query(User).filter(User.email == user_data.email).first():
        return error_response(
            message="Email already registered",
            status_code=status.HTTP_400_BAD_REQUEST,
            errors={"email": "This email is already registered"},
        )

    if db.query(User).filter(User.phone == user_data.phone).first():
        return error_response(
            message="Phone number already registered",
            status_code=status.HTTP_400_BAD_REQUEST,
            errors={"phone": "This phone number is already registered"},
        )

    from app.utils.auth import hash_password
    user_type_enum = UserType.TENANT if user_data.user_type == "tenant" else UserType.LANDLORD
    verification_token = _gen_token()

    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        phone=user_data.phone,
        hashed_password=hash_password(user_data.password),
        user_type=user_type_enum.value,
        is_verified=False,
        is_active=True,
        email_verification_token=verification_token,
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Send verification email (non-blocking — log failure but don't fail registration)
        send_verification_email(new_user.email, new_user.full_name, verification_token)

        return success_response(
            data={
                "user": {
                    "id": str(new_user.id),
                    "full_name": new_user.full_name,
                    "email": new_user.email,
                    "phone": new_user.phone,
                    "user_type": new_user.user_type,
                    "is_verified": new_user.is_verified,
                }
            },
            message="Registration successful! Please check your email to verify your account.",
            status_code=status.HTTP_201_CREATED,
        )
    except Exception:
        db.rollback()
        return error_response(
            message="Registration failed. Please try again.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@router.get("/verify-email")
async def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email_verification_token == token).first()
    if not user:
        return error_response(
            message="Invalid or expired verification link.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    if user.is_verified:
        return success_response(data={}, message="Email already verified.")

    user.is_verified = True
    user.email_verification_token = None
    db.commit()
    return success_response(data={"email": user.email}, message="Email verified successfully!")


@router.post("/resend-verification")
async def resend_verification(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    # Always return success to prevent email enumeration
    if user and not user.is_verified:
        token = _gen_token()
        user.email_verification_token = token
        db.commit()
        send_verification_email(user.email, user.full_name, token)
    return success_response(
        data={},
        message="If that email is registered and unverified, a new verification link has been sent.",
    )


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if user and user.is_active:
        token = _gen_token()
        user.password_reset_token = token
        user.password_reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
        db.commit()
        send_password_reset_email(user.email, user.full_name, token)
    # Always return success to prevent email enumeration
    return success_response(
        data={},
        message="If that email is registered, a password reset link has been sent.",
    )


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.password_reset_token == body.token).first()

    if not user or not user.password_reset_token_expiry:
        return error_response(
            message="Invalid or expired reset link. Please request a new one.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    if datetime.utcnow() > user.password_reset_token_expiry:
        user.password_reset_token = None
        user.password_reset_token_expiry = None
        db.commit()
        return error_response(
            message="Reset link has expired. Please request a new one.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    if body.new_password != body.confirm_password:
        return error_response(
            message="Passwords do not match.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    is_valid, err = validate_password(body.new_password)
    if not is_valid:
        return error_response(message=err or "Password too weak.", status_code=status.HTTP_400_BAD_REQUEST)

    from app.utils.auth import hash_password
    user.hashed_password = hash_password(body.new_password)
    user.password_reset_token = None
    user.password_reset_token_expiry = None
    db.commit()

    return success_response(data={}, message="Password reset successfully! You can now log in.")


# ── Admin login ────────────────────────────────────────────────────────────────

@router.post("/admin/login")
async def admin_login(credentials: LoginRequest, db: Session = Depends(get_db)):
    if not validate_email(credentials.email):
        return error_response(message="Invalid email format", status_code=status.HTTP_400_BAD_REQUEST)

    admin_user = db.query(User).filter(User.email == credentials.email).first()

    if not admin_user or (admin_user.user_type != "admin" and admin_user.user_type != "ADMIN"):
        return error_response(message="Invalid email or password", status_code=status.HTTP_401_UNAUTHORIZED)

    if not verify_password(credentials.password, admin_user.hashed_password):
        return error_response(message="Invalid email or password", status_code=status.HTTP_401_UNAUTHORIZED)

    if not admin_user.is_active:
        return error_response(message="Account is deactivated", status_code=status.HTTP_403_FORBIDDEN)

    access_token = create_access_token(
        data={"sub": str(admin_user.id), "email": admin_user.email, "user_type": "admin"}
    )
    admin_user.last_login = datetime.utcnow()
    db.commit()

    return success_response(
        data={
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(admin_user.id),
                "email": admin_user.email,
                "full_name": admin_user.full_name,
                "user_type": admin_user.user_type.value,
            },
        },
        message="Admin login successful",
    )


@router.get("/me")
async def get_current_user_info():
    return success_response(
        data={"id": "1", "email": "user@example.com", "full_name": "John Doe"},
        message="User information retrieved",
    )
