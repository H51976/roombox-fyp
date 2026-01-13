from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from app.utils.response import success_response, error_response
from app.utils.validators import validate_email, validate_phone, validate_password
from app.utils.auth import verify_password, create_access_token
from app.database import get_db
from app.models.user import User, UserType

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, description="Full name must be at least 2 characters")
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    confirm_password: str = Field(..., min_length=6)
    phone: str = Field(..., description="10-digit Nepali phone number")
    user_type: str = Field(..., pattern="^(tenant|landlord)$", description="User type: tenant or landlord")


@router.post("/login")
async def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """
    User login endpoint
    
    - **email**: User's email address
    - **password**: User's password (min 6 characters)
    """
    # Validate email format
    if not validate_email(credentials.email):
        return error_response(
            message="Invalid email format",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate password
    is_valid, error_msg = validate_password(credentials.password)
    if not is_valid:
        return error_response(
            message=error_msg or "Invalid password",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Find user (exclude admin users)
    # Note: user_type enum values in DB are uppercase (TENANT, LANDLORD, ADMIN)
    user = db.query(User).filter(
        User.email == credentials.email
    ).first()
    
    # Exclude admin users - check both lowercase and uppercase
    if user and (user.user_type == "admin" or user.user_type == "ADMIN"):
        return error_response(
            message="Invalid email or password",
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    if not user:
        return error_response(
            message="Invalid email or password",
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    # Verify password
    if not verify_password(credentials.password, user.hashed_password):
        return error_response(
            message="Invalid email or password",
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    # Check if user is active
    if not user.is_active:
        return error_response(
            message="Account is deactivated",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email, "user_type": user.user_type})
    
    # Update last login
    from datetime import datetime
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
                "user_type": user.user_type
            }
        },
        message="Login successful"
    )


@router.post("/register")
async def register(user_data: RegisterRequest, db: Session = Depends(get_db)):
    """
    User registration endpoint
    
    - **full_name**: User's full name
    - **email**: User's email address
    - **password**: User's password (min 6 characters)
    - **confirm_password**: Password confirmation
    - **phone**: 10-digit Nepali phone number
    - **user_type**: Either "tenant" or "landlord"
    """
    # Validate email format
    if not validate_email(user_data.email):
        return error_response(
            message="Invalid email format",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate phone number
    if not validate_phone(user_data.phone):
        return error_response(
            message="Invalid phone number. Please provide a valid 10-digit Nepali phone number",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate password
    is_valid, error_msg = validate_password(user_data.password)
    if not is_valid:
        return error_response(
            message=error_msg or "Invalid password",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Check password match
    if user_data.password != user_data.confirm_password:
        return error_response(
            message="Passwords do not match",
            status_code=status.HTTP_400_BAD_REQUEST,
            errors={"confirm_password": "Passwords do not match"}
        )
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        return error_response(
            message="Email already registered",
            status_code=status.HTTP_400_BAD_REQUEST,
            errors={"email": "This email is already registered"}
        )
    
    # Check if phone already exists
    existing_phone = db.query(User).filter(User.phone == user_data.phone).first()
    if existing_phone:
        return error_response(
            message="Phone number already registered",
            status_code=status.HTTP_400_BAD_REQUEST,
            errors={"phone": "This phone number is already registered"}
        )
    
    # Hash password
    from app.utils.auth import hash_password
    hashed_pwd = hash_password(user_data.password)
    
    # Determine user type enum
    user_type_enum = UserType.TENANT if user_data.user_type == "tenant" else UserType.LANDLORD
    
    # Create new user
    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        phone=user_data.phone,
        hashed_password=hashed_pwd,
        user_type=user_type_enum.value,  # Use string value for enum
        is_verified=False,
        is_active=True
    )
    
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        return success_response(
            data={
                "user": {
                    "id": str(new_user.id),
                    "full_name": new_user.full_name,
                    "email": new_user.email,
                    "phone": new_user.phone,
                    "user_type": new_user.user_type
                }
            },
            message="Registration successful",
            status_code=status.HTTP_201_CREATED
        )
    except Exception as e:
        db.rollback()
        return error_response(
            message="Registration failed. Please try again.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.post("/admin/login")
async def admin_login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """
    Admin login endpoint
    
    - **email**: Admin email address (admin@roombox.com)
    - **password**: Admin password (roombox123)
    """
    # Validate email format
    if not validate_email(credentials.email):
        return error_response(
            message="Invalid email format",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Find admin user - check both lowercase and uppercase enum values
    admin_user = db.query(User).filter(
        User.email == credentials.email
    ).first()
    
    # Check if user is admin (handle both case variations)
    if not admin_user or (admin_user.user_type != "admin" and admin_user.user_type != "ADMIN"):
        return error_response(
            message="Invalid email or password",
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    if not admin_user:
        return error_response(
            message="Invalid email or password",
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    # Verify password
    if not verify_password(credentials.password, admin_user.hashed_password):
        return error_response(
            message="Invalid email or password",
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    # Check if user is active
    if not admin_user.is_active:
        return error_response(
            message="Account is deactivated",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(admin_user.id), "email": admin_user.email, "user_type": "admin"})
    
    # Update last login
    from datetime import datetime
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
                "user_type": admin_user.user_type.value
            }
        },
        message="Admin login successful"
    )


@router.get("/me")
async def get_current_user():
    """
    Get current authenticated user information
    """
    # TODO: Implement actual authentication check
    return success_response(
        data={
            "id": "1",
            "email": "user@example.com",
            "full_name": "John Doe"
        },
        message="User information retrieved"
    )

