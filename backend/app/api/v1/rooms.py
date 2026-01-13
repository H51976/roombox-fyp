from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import Optional, List
import math
from app.utils.response import success_response, error_response
from app.database import get_db
from app.models.room import Room, RoomType, RoomStatus, FurnishingStatus, RoomImage
from app.models.user import User

router = APIRouter()


class RoomCreateRequest(BaseModel):
    title: str = Field(..., min_length=5, max_length=255)
    description: Optional[str] = None
    room_type: str = Field(..., description="Room type: single, double, shared, apartment, flat, house")
    address: str = Field(..., min_length=5, max_length=500)
    city: str = Field(..., min_length=2, max_length=100)
    ward_number: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    price_per_month: float = Field(..., gt=0)
    security_deposit: Optional[float] = Field(None, ge=0)
    advance_payment: Optional[float] = Field(None, ge=0)
    total_rooms: int = Field(1, ge=1)
    available_rooms: int = Field(1, ge=1)
    bathrooms: int = Field(1, ge=1)
    floor_number: Optional[int] = None
    total_floors: Optional[int] = None
    area_sqft: Optional[float] = Field(None, gt=0)
    furnishing_status: Optional[str] = Field(None, description="furnished, semi_furnished, unfurnished")
    has_kitchen: bool = False
    has_parking: bool = False
    has_wifi: bool = False
    has_water_supply: bool = True
    has_electricity: bool = True
    has_security: bool = False
    has_elevator: bool = False
    has_balcony: bool = False
    images: Optional[List[str]] = Field(None, description="List of base64 encoded images")


class StatusUpdateRequest(BaseModel):
    new_status: Optional[str] = None


class RoomResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    room_type: str
    address: str
    city: str
    ward_number: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    price_per_month: float
    security_deposit: Optional[float]
    advance_payment: Optional[float]
    total_rooms: int
    available_rooms: int
    bathrooms: int
    floor_number: Optional[int]
    total_floors: Optional[int]
    area_sqft: Optional[float]
    furnishing_status: Optional[str]
    has_kitchen: bool
    has_parking: bool
    has_wifi: bool
    has_water_supply: bool
    has_electricity: bool
    has_security: bool
    has_elevator: bool
    has_balcony: bool
    status: str
    is_verified: bool
    created_at: str

    class Config:
        from_attributes = True


def get_current_user(db: Session = Depends(get_db), token: str = None):
    """Get current user from token - simplified for now"""
    # TODO: Implement proper JWT token verification
    # For now, we'll get user from a simple header or session
    # This is a placeholder - should use proper auth middleware
    return None


@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_room(
    room_data: RoomCreateRequest,
    db: Session = Depends(get_db),
    # TODO: Add proper authentication
    # current_user: User = Depends(get_current_user)
):
    """
    Create a new room listing
    
    **Note**: This endpoint requires authentication. The owner_id will be set from the authenticated user.
    """
    # TODO: Get user from JWT token
    # For now, we'll use a temporary approach - get first landlord user
    # In production, this should come from the authenticated user's token
    landlord = db.query(User).filter(
        User.user_type.in_(["landlord", "LANDLORD"])
    ).first()
    
    if not landlord:
        return error_response(
            message="No landlord user found. Please register as a landlord first.",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate room type
    try:
        room_type_enum = RoomType(room_data.room_type.lower())
    except ValueError:
        return error_response(
            message=f"Invalid room type. Must be one of: {[e.value for e in RoomType]}",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate furnishing status if provided
    furnishing_status_enum = None
    if room_data.furnishing_status:
        try:
            furnishing_status_enum = FurnishingStatus(room_data.furnishing_status.lower())
        except ValueError:
            return error_response(
                message=f"Invalid furnishing status. Must be one of: {[e.value for e in FurnishingStatus]}",
                status_code=status.HTTP_400_BAD_REQUEST
            )
    
    # Create room
    new_room = Room(
        owner_id=landlord.id,
        title=room_data.title,
        description=room_data.description,
        room_type=room_type_enum,
        address=room_data.address,
        city=room_data.city,
        ward_number=room_data.ward_number,
        latitude=room_data.latitude,
        longitude=room_data.longitude,
        price_per_month=room_data.price_per_month,
        security_deposit=room_data.security_deposit,
        advance_payment=room_data.advance_payment,
        total_rooms=room_data.total_rooms,
        available_rooms=room_data.available_rooms,
        bathrooms=room_data.bathrooms,
        floor_number=room_data.floor_number,
        total_floors=room_data.total_floors,
        area_sqft=room_data.area_sqft,
        furnishing_status=furnishing_status_enum,
        has_kitchen=room_data.has_kitchen,
        has_parking=room_data.has_parking,
        has_wifi=room_data.has_wifi,
        has_water_supply=room_data.has_water_supply,
        has_electricity=room_data.has_electricity,
        has_security=room_data.has_security,
        has_elevator=room_data.has_elevator,
        has_balcony=room_data.has_balcony,
        status=RoomStatus.AVAILABLE,
        is_verified=False,
    )
    
    try:
        db.add(new_room)
        db.commit()
        db.refresh(new_room)
        
        # Add images if provided
        if room_data.images:
            for index, image_data in enumerate(room_data.images):
                # Store base64 image data in database
                # In production, you should upload to cloud storage (S3, Cloudinary, etc.)
                # and store the URL instead
                room_image = RoomImage(
                    room_id=new_room.id,
                    image_url=image_data,  # Storing base64 for now
                    image_order=index,
                    is_primary=(index == 0)  # First image is primary
                )
                db.add(room_image)
            
            db.commit()
        
        return success_response(
            data={
                "id": new_room.id,
                "title": new_room.title,
                "room_type": new_room.room_type.value,
                "city": new_room.city,
                "price_per_month": new_room.price_per_month,
                "status": new_room.status.value,
                "image_count": len(room_data.images) if room_data.images else 0,
            },
            message="Room listing created successfully",
            status_code=status.HTTP_201_CREATED
        )
    except Exception as e:
        db.rollback()
        return error_response(
            message=f"Failed to create room listing: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.get("/my-listings")
async def get_my_listings(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(12, ge=1, le=100, description="Items per page"),
    # TODO: Add proper authentication
):
    """
    Get all room listings for the current landlord
    """
    # TODO: Get user from JWT token
    landlord = db.query(User).filter(
        User.user_type.in_(["landlord", "LANDLORD"])
    ).first()
    
    if not landlord:
        return success_response(
            data={
                "listings": [],
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": 0,
                    "total_pages": 1,
                    "has_next": False,
                    "has_prev": False,
                }
            },
            message="No listings found"
        )
    
    # Get total count
    total_count = db.query(Room).filter(Room.owner_id == landlord.id).count()
    
    # Apply pagination
    offset = (page - 1) * limit
    rooms = db.query(Room).filter(Room.owner_id == landlord.id).order_by(Room.created_at.desc()).offset(offset).limit(limit).all()
    
    total_pages = math.ceil(total_count / limit) if limit > 0 else 1
    
    return success_response(
        data={
            "listings": [
                {
                    "id": room.id,
                    "title": room.title,
                    "description": room.description,
                    "room_type": room.room_type.value,
                    "city": room.city,
                    "address": room.address,
                    "price_per_month": room.price_per_month,
                    "total_rooms": room.total_rooms,
                    "available_rooms": room.available_rooms,
                    "bathrooms": room.bathrooms,
                    "status": room.status.value,
                    "is_verified": room.is_verified,
                    "created_at": room.created_at.isoformat() if room.created_at else None,
                }
                for room in rooms
            ],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
            }
        },
        message="Listings retrieved successfully"
    )


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates in kilometers using Haversine formula"""
    R = 6371  # Earth's radius in kilometers
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c


@router.get("/search")
async def search_rooms(
    db: Session = Depends(get_db),
    city: Optional[str] = Query(None, description="Filter by city"),
    room_type: Optional[str] = Query(None, description="Filter by room type"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price per month"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price per month"),
    latitude: Optional[float] = Query(None, ge=-90, le=90, description="User's latitude"),
    longitude: Optional[float] = Query(None, ge=-180, le=180, description="User's longitude"),
    radius_km: Optional[float] = Query(10, ge=0, le=100, description="Search radius in kilometers"),
    search_query: Optional[str] = Query(None, description="Search in title and description"),
    has_kitchen: Optional[bool] = Query(None),
    has_parking: Optional[bool] = Query(None),
    has_wifi: Optional[bool] = Query(None),
    furnishing_status: Optional[str] = Query(None),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(12, ge=1, le=100, description="Items per page"),
):
    """
    Search and filter rooms - MUST be before /{room_id} route
    """
    # Only show AVAILABLE rooms in search (exclude RESERVED, OCCUPIED, etc.)
    query = db.query(Room).filter(Room.status == RoomStatus.AVAILABLE)
    
    # Filter by city
    if city:
        query = query.filter(Room.city.ilike(f"%{city}%"))
    
    # Filter by room type
    if room_type:
        try:
            room_type_enum = RoomType(room_type.lower())
            query = query.filter(Room.room_type == room_type_enum)
        except ValueError:
            pass
    
    # Filter by price range
    if min_price is not None:
        query = query.filter(Room.price_per_month >= min_price)
    if max_price is not None:
        query = query.filter(Room.price_per_month <= max_price)
    
    # Filter by amenities
    if has_kitchen is not None:
        query = query.filter(Room.has_kitchen == has_kitchen)
    if has_parking is not None:
        query = query.filter(Room.has_parking == has_parking)
    if has_wifi is not None:
        query = query.filter(Room.has_wifi == has_wifi)
    
    # Filter by furnishing status
    if furnishing_status:
        try:
            furnishing_enum = FurnishingStatus(furnishing_status.lower())
            query = query.filter(Room.furnishing_status == furnishing_enum)
        except ValueError:
            pass
    
    # Search in title and description
    if search_query:
        query = query.filter(
            or_(
                Room.title.ilike(f"%{search_query}%"),
                Room.description.ilike(f"%{search_query}%")
            )
        )
    
    # Order by created_at DESC to show latest rooms first
    query = query.order_by(Room.created_at.desc())
    
    # Get total count before pagination
    total_count = query.count()
    
    # Get all matching rooms (before location filtering)
    rooms = query.all()
    
    # Filter by location if coordinates provided
    if latitude is not None and longitude is not None:
        filtered_rooms = []
        for room in rooms:
            if room.latitude and room.longitude:
                distance = calculate_distance(latitude, longitude, room.latitude, room.longitude)
                if distance <= radius_km:
                    filtered_rooms.append((room, distance))
        
        # Sort by distance
        filtered_rooms.sort(key=lambda x: x[1])
        rooms_with_distance = filtered_rooms
        total_count = len(filtered_rooms)
    else:
        # If no location, show all rooms ordered by latest (already ordered above)
        rooms_with_distance = [(room, None) for room in rooms]
    
    # Apply pagination
    offset = (page - 1) * limit
    paginated_rooms = rooms_with_distance[offset:offset + limit]
    
    # Get images for each room
    result = []
    for room, distance in paginated_rooms:
        images = db.query(RoomImage).filter(RoomImage.room_id == room.id).order_by(RoomImage.image_order).limit(1).all()
        primary_image = images[0].image_url if images else None
        
        result.append({
            "id": room.id,
            "title": room.title,
            "description": room.description,
            "room_type": room.room_type.value,
            "address": room.address,
            "city": room.city,
            "latitude": room.latitude,
            "longitude": room.longitude,
            "price_per_month": room.price_per_month,
            "security_deposit": room.security_deposit,
            "total_rooms": room.total_rooms,
            "available_rooms": room.available_rooms,
            "bathrooms": room.bathrooms,
            "area_sqft": room.area_sqft,
            "has_kitchen": room.has_kitchen,
            "has_parking": room.has_parking,
            "has_wifi": room.has_wifi,
            "has_water_supply": room.has_water_supply,
            "has_electricity": room.has_electricity,
            "has_security": room.has_security,
            "has_elevator": room.has_elevator,
            "has_balcony": room.has_balcony,
            "furnishing_status": room.furnishing_status.value if room.furnishing_status else None,
            "distance_km": round(distance, 2) if distance is not None else None,
            "primary_image": primary_image,
            "created_at": room.created_at.isoformat() if room.created_at else None,
        })
    
    total_pages = math.ceil(total_count / limit) if limit > 0 else 1
    
    return success_response(
        data={
            "rooms": result,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
            }
        },
        message=f"Found {total_count} rooms"
    )


@router.get("/{room_id}")
async def get_room(
    room_id: int,
    db: Session = Depends(get_db),
):
    """
    Get a single room listing by ID
    """
    room = db.query(Room).filter(Room.id == room_id).first()
    
    if not room:
        return error_response(
            message="Room listing not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    # Get images
    images = db.query(RoomImage).filter(RoomImage.room_id == room_id).order_by(RoomImage.image_order).all()
    
    # Get owner info
    owner = db.query(User).filter(User.id == room.owner_id).first()
    
    return success_response(
        data={
            "id": room.id,
            "title": room.title,
            "description": room.description,
            "room_type": room.room_type.value,
            "address": room.address,
            "city": room.city,
            "ward_number": room.ward_number,
            "latitude": room.latitude,
            "longitude": room.longitude,
            "price_per_month": room.price_per_month,
            "security_deposit": room.security_deposit,
            "advance_payment": room.advance_payment,
            "total_rooms": room.total_rooms,
            "available_rooms": room.available_rooms,
            "bathrooms": room.bathrooms,
            "floor_number": room.floor_number,
            "total_floors": room.total_floors,
            "area_sqft": room.area_sqft,
            "furnishing_status": room.furnishing_status.value if room.furnishing_status else None,
            "has_kitchen": room.has_kitchen,
            "has_parking": room.has_parking,
            "has_wifi": room.has_wifi,
            "has_water_supply": room.has_water_supply,
            "has_electricity": room.has_electricity,
            "has_security": room.has_security,
            "has_elevator": room.has_elevator,
            "has_balcony": room.has_balcony,
            "status": room.status.value,
            "images": [img.image_url for img in images],
            "owner": {
                "id": owner.id if owner else None,
                "full_name": owner.full_name if owner else None,
                "email": owner.email if owner else None,
                "phone": owner.phone if owner else None,
            } if owner else None,
        },
        message="Room listing retrieved successfully"
    )


@router.put("/{room_id}")
async def update_room(
    room_id: int,
    room_data: RoomCreateRequest,
    db: Session = Depends(get_db),
):
    """
    Update a room listing
    """
    # Find the room
    room = db.query(Room).filter(Room.id == room_id).first()
    
    if not room:
        return error_response(
            message="Room listing not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    # Validate room type
    try:
        room_type_enum = RoomType(room_data.room_type.lower())
    except ValueError:
        return error_response(
            message=f"Invalid room type. Must be one of: {[e.value for e in RoomType]}",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate furnishing status if provided
    furnishing_status_enum = None
    if room_data.furnishing_status:
        try:
            furnishing_status_enum = FurnishingStatus(room_data.furnishing_status.lower())
        except ValueError:
            return error_response(
                message=f"Invalid furnishing status. Must be one of: {[e.value for e in FurnishingStatus]}",
                status_code=status.HTTP_400_BAD_REQUEST
            )
    
    # Update room fields
    room.title = room_data.title
    room.description = room_data.description
    room.room_type = room_type_enum
    room.address = room_data.address
    room.city = room_data.city
    room.ward_number = room_data.ward_number
    room.latitude = room_data.latitude
    room.longitude = room_data.longitude
    room.price_per_month = room_data.price_per_month
    room.security_deposit = room_data.security_deposit
    room.advance_payment = room_data.advance_payment
    room.total_rooms = room_data.total_rooms
    room.available_rooms = room_data.available_rooms
    room.bathrooms = room_data.bathrooms
    room.floor_number = room_data.floor_number
    room.total_floors = room_data.total_floors
    room.area_sqft = room_data.area_sqft
    room.furnishing_status = furnishing_status_enum
    room.has_kitchen = room_data.has_kitchen
    room.has_parking = room_data.has_parking
    room.has_wifi = room_data.has_wifi
    room.has_water_supply = room_data.has_water_supply
    room.has_electricity = room_data.has_electricity
    room.has_security = room_data.has_security
    room.has_elevator = room_data.has_elevator
    room.has_balcony = room_data.has_balcony
    
    try:
        db.commit()
        
        # Update images if provided
        if room_data.images is not None:
            # Delete existing images
            db.query(RoomImage).filter(RoomImage.room_id == room_id).delete()
            
            # Add new images
            for index, image_data in enumerate(room_data.images):
                room_image = RoomImage(
                    room_id=room_id,
                    image_url=image_data,
                    image_order=index,
                    is_primary=(index == 0)
                )
                db.add(room_image)
            
            db.commit()
        
        return success_response(
            data={
                "id": room.id,
                "title": room.title,
                "room_type": room.room_type.value,
                "city": room.city,
                "price_per_month": room.price_per_month,
            },
            message="Room listing updated successfully"
        )
    except Exception as e:
        db.rollback()
        return error_response(
            message=f"Failed to update room listing: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@router.delete("/{room_id}")
async def delete_room(
    room_id: int,
    db: Session = Depends(get_db),
):
    """
    Delete a room listing
    """
    room = db.query(Room).filter(Room.id == room_id).first()
    
    if not room:
        return error_response(
            message="Room listing not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    try:
        # Delete images first (cascade should handle this, but being explicit)
        db.query(RoomImage).filter(RoomImage.room_id == room_id).delete()
        
        # Delete the room
        db.delete(room)
        db.commit()
        
        return success_response(
            data={"id": room_id},
            message="Room listing deleted successfully"
        )
    except Exception as e:
        db.rollback()
        return error_response(
            message=f"Failed to delete room listing: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class StatusUpdateRequest(BaseModel):
    new_status: Optional[str] = None


@router.patch("/{room_id}/status")
async def update_room_status(
    room_id: int,
    status_data: StatusUpdateRequest,
    db: Session = Depends(get_db),
):
    """
    Update room status (available, occupied, reserved)
    """
    room = db.query(Room).filter(Room.id == room_id).first()
    
    if not room:
        return error_response(
            message="Room listing not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    # If no status provided, toggle between available and occupied
    new_status = status_data.new_status
    if not new_status:
        if room.status == RoomStatus.AVAILABLE:
            new_status = "occupied"
        else:
            new_status = "available"
    
    # Validate status
    try:
        status_enum = RoomStatus(new_status.lower())
    except ValueError:
        return error_response(
            message=f"Invalid status. Must be one of: {[e.value for e in RoomStatus]}",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        room.status = status_enum
        db.commit()
        
        return success_response(
            data={
                "id": room.id,
                "status": room.status.value,
            },
            message=f"Room status updated to {room.status.value}"
        )
    except Exception as e:
        db.rollback()
        return error_response(
            message=f"Failed to update room status: {str(e)}",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

