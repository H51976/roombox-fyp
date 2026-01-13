"""
Chat API endpoints
"""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Optional, List
from datetime import datetime

from app.utils.response import success_response, error_response
from app.database import get_db
from app.models.chat import ChatRoom, ChatMessage
from app.models.user import User
from app.models.room import Room

router = APIRouter()


class MessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000, description="Message content")


class ChatRoomResponse(BaseModel):
    id: int
    tenant_id: int
    landlord_id: int
    room_id: Optional[int]
    tenant_name: str
    landlord_name: str
    room_title: Optional[str]
    last_message: Optional[str]
    last_message_time: Optional[str]
    unread_count: int
    created_at: str


class MessageResponse(BaseModel):
    id: int
    chat_room_id: int
    sender_id: int
    sender_name: str
    message: str
    is_read: bool
    created_at: str


def get_current_user_id(db: Session = Depends(get_db), token: str = None):
    """Get current user ID - simplified for now"""
    # TODO: Implement proper JWT token validation
    # For now, return first tenant or landlord
    user = db.query(User).filter(User.user_type.in_(["tenant", "landlord", "TENANT", "LANDLORD"])).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user.id


@router.get("/rooms")
async def get_chat_rooms(
    db: Session = Depends(get_db),
    user_id: Optional[int] = Query(None, description="User ID (for filtering)"),
):
    """
    Get all chat rooms for the current user
    """
    # TODO: Get user from JWT token
    if not user_id:
        user = db.query(User).filter(User.user_type.in_(["tenant", "landlord", "TENANT", "LANDLORD"])).first()
        if not user:
            return success_response(data=[], message="No chat rooms found")
        user_id = user.id
    
    # Get chat rooms where user is either tenant or landlord
    chat_rooms = db.query(ChatRoom).filter(
        or_(ChatRoom.tenant_id == user_id, ChatRoom.landlord_id == user_id)
    ).order_by(ChatRoom.updated_at.desc()).all()
    
    result = []
    for room in chat_rooms:
        # Get last message
        last_message = db.query(ChatMessage).filter(
            ChatMessage.chat_room_id == room.id
        ).order_by(ChatMessage.created_at.desc()).first()
        
        # Get unread count
        other_user_id = room.landlord_id if room.tenant_id == user_id else room.tenant_id
        unread_count = db.query(ChatMessage).filter(
            and_(
                ChatMessage.chat_room_id == room.id,
                ChatMessage.sender_id == other_user_id,
                ChatMessage.is_read == False
            )
        ).count()
        
        result.append({
            "id": room.id,
            "tenant_id": room.tenant_id,
            "landlord_id": room.landlord_id,
            "room_id": room.room_id,
            "tenant_name": room.tenant.full_name or room.tenant.email if room.tenant else "Unknown",
            "landlord_name": room.landlord.full_name or room.landlord.email if room.landlord else "Unknown",
            "room_title": room.room.title if room.room else None,
            "last_message": last_message.message if last_message else None,
            "last_message_time": last_message.created_at.isoformat() if last_message else None,
            "unread_count": unread_count,
            "created_at": room.created_at.isoformat() if room.created_at else None,
        })
    
    return success_response(data=result, message="Chat rooms retrieved successfully")


@router.get("/rooms/{chat_room_id}/messages")
async def get_messages(
    chat_room_id: int,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Messages per page"),
):
    """
    Get messages for a specific chat room
    """
    chat_room = db.query(ChatRoom).filter(ChatRoom.id == chat_room_id).first()
    if not chat_room:
        return error_response(
            message="Chat room not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    # Get messages with pagination
    offset = (page - 1) * limit
    messages = db.query(ChatMessage).filter(
        ChatMessage.chat_room_id == chat_room_id
    ).order_by(ChatMessage.created_at.desc()).offset(offset).limit(limit).all()
    
    # Reverse to show oldest first
    messages = list(reversed(messages))
    
    result = []
    for msg in messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        result.append({
            "id": msg.id,
            "chat_room_id": msg.chat_room_id,
            "sender_id": msg.sender_id,
            "sender_name": sender.full_name or sender.email if sender else "Unknown",
            "message": msg.message,
            "is_read": msg.is_read,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
        })
    
    return success_response(data=result, message="Messages retrieved successfully")


@router.post("/rooms/{chat_room_id}/messages")
async def send_message(
    chat_room_id: int,
    message_data: MessageRequest,
    db: Session = Depends(get_db),
):
    """
    Send a message in a chat room
    """
    chat_room = db.query(ChatRoom).filter(ChatRoom.id == chat_room_id).first()
    if not chat_room:
        return error_response(
            message="Chat room not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    # TODO: Get user from JWT token
    user = db.query(User).filter(User.user_type.in_(["tenant", "landlord", "TENANT", "LANDLORD"])).first()
    if not user:
        return error_response(
            message="User not found",
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    # Verify user is part of this chat room
    if user.id != chat_room.tenant_id and user.id != chat_room.landlord_id:
        return error_response(
            message="Unauthorized",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    # Create message
    new_message = ChatMessage(
        chat_room_id=chat_room_id,
        sender_id=user.id,
        message=message_data.message,
        is_read=False
    )
    
    db.add(new_message)
    
    # Update chat room updated_at
    from sqlalchemy.sql import func
    chat_room.updated_at = func.now()
    
    db.commit()
    db.refresh(new_message)
    
    sender = db.query(User).filter(User.id == new_message.sender_id).first()
    
    return success_response(
        data={
            "id": new_message.id,
            "chat_room_id": new_message.chat_room_id,
            "sender_id": new_message.sender_id,
            "sender_name": sender.full_name or sender.email if sender else "Unknown",
            "message": new_message.message,
            "is_read": new_message.is_read,
            "created_at": new_message.created_at.isoformat() if new_message.created_at else None,
        },
        message="Message sent successfully"
    )


@router.post("/rooms/create")
async def create_chat_room(
    landlord_id: int = Query(..., description="Landlord ID"),
    room_id: Optional[int] = Query(None, description="Room ID (optional)"),
    db: Session = Depends(get_db),
):
    """
    Create a new chat room between tenant and landlord
    """
    # TODO: Get tenant from JWT token
    tenant = db.query(User).filter(User.user_type.in_(["tenant", "TENANT"])).first()
    if not tenant:
        return error_response(
            message="Tenant not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    landlord = db.query(User).filter(User.id == landlord_id).first()
    if not landlord:
        return error_response(
            message="Landlord not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    # Check if chat room already exists
    existing_room = db.query(ChatRoom).filter(
        and_(
            ChatRoom.tenant_id == tenant.id,
            ChatRoom.landlord_id == landlord_id,
            ChatRoom.room_id == room_id if room_id else ChatRoom.room_id.is_(None)
        )
    ).first()
    
    if existing_room:
        return success_response(
            data={
                "id": existing_room.id,
                "tenant_id": existing_room.tenant_id,
                "landlord_id": existing_room.landlord_id,
                "room_id": existing_room.room_id,
            },
            message="Chat room already exists"
        )
    
    # Create new chat room
    new_room = ChatRoom(
        tenant_id=tenant.id,
        landlord_id=landlord_id,
        room_id=room_id
    )
    
    db.add(new_room)
    db.commit()
    db.refresh(new_room)
    
    return success_response(
        data={
            "id": new_room.id,
            "tenant_id": new_room.tenant_id,
            "landlord_id": new_room.landlord_id,
            "room_id": new_room.room_id,
        },
        message="Chat room created successfully"
    )


@router.patch("/messages/{message_id}/read")
async def mark_message_read(
    message_id: int,
    db: Session = Depends(get_db),
):
    """
    Mark a message as read
    """
    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not message:
        return error_response(
            message="Message not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    message.is_read = True
    db.commit()
    
    return success_response(data=None, message="Message marked as read")


@router.patch("/rooms/{chat_room_id}/read")
async def mark_room_read(
    chat_room_id: int,
    db: Session = Depends(get_db),
):
    """
    Mark all messages in a chat room as read
    """
    # TODO: Get user from JWT token
    user = db.query(User).filter(User.user_type.in_(["tenant", "landlord", "TENANT", "LANDLORD"])).first()
    if not user:
        return error_response(
            message="User not found",
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    chat_room = db.query(ChatRoom).filter(ChatRoom.id == chat_room_id).first()
    if not chat_room:
        return error_response(
            message="Chat room not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    # Mark all messages from the other user as read
    other_user_id = chat_room.landlord_id if chat_room.tenant_id == user.id else chat_room.tenant_id
    
    db.query(ChatMessage).filter(
        and_(
            ChatMessage.chat_room_id == chat_room_id,
            ChatMessage.sender_id == other_user_id,
            ChatMessage.is_read == False
        )
    ).update({"is_read": True})
    
    db.commit()
    
    return success_response(data=None, message="Messages marked as read")

