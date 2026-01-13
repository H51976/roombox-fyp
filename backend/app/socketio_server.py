"""
Socket.IO server for real-time chat
"""
import socketio
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.chat import ChatRoom, ChatMessage
from app.models.user import User
from app.utils.logger import logger

# Create Socket.IO server
sio = socketio.AsyncServer(
    cors_allowed_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"],
    async_mode='asgi'
)

# Create Socket.IO app
socketio_app = socketio.ASGIApp(sio)


@sio.event
async def connect(sid, environ, auth):
    """Handle client connection"""
    try:
        user_id = auth.get('user_id') if auth else None
        if user_id:
            await sio.save_session(sid, {'user_id': user_id})
            logger.info(f"User {user_id} connected with session {sid}")
        else:
            logger.warning(f"Connection attempt without user_id: {sid}")
    except Exception as e:
        logger.error(f"Error in connect: {e}")


@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    try:
        session = await sio.get_session(sid)
        user_id = session.get('user_id')
        logger.info(f"User {user_id} disconnected: {sid}")
    except Exception as e:
        logger.error(f"Error in disconnect: {e}")


@sio.event
async def join_room(sid, data):
    """Join a chat room"""
    try:
        session = await sio.get_session(sid)
        user_id = session.get('user_id')
        chat_room_id = data.get('chat_room_id')
        
        if chat_room_id:
            room_name = f"chat_room_{chat_room_id}"
            await sio.enter_room(sid, room_name)
            logger.info(f"User {user_id} joined room {chat_room_id}")
            await sio.emit('room_joined', {'chat_room_id': chat_room_id}, room=sid)
    except Exception as e:
        logger.error(f"Error in join_room: {e}")


@sio.event
async def leave_room(sid, data):
    """Leave a chat room"""
    try:
        session = await sio.get_session(sid)
        user_id = session.get('user_id')
        chat_room_id = data.get('chat_room_id')
        
        if chat_room_id:
            room_name = f"chat_room_{chat_room_id}"
            await sio.leave_room(sid, room_name)
            logger.info(f"User {user_id} left room {chat_room_id}")
    except Exception as e:
        logger.error(f"Error in leave_room: {e}")


@sio.event
async def send_message(sid, data):
    """Handle sending a message"""
    try:
        session = await sio.get_session(sid)
        user_id = session.get('user_id')
        
        if not user_id:
            await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
            return
        
        chat_room_id = data.get('chat_room_id')
        message_text = data.get('message')
        
        if not chat_room_id or not message_text:
            await sio.emit('error', {'message': 'Missing chat_room_id or message'}, room=sid)
            return
        
        # Save message to database
        db: Session = SessionLocal()
        try:
            chat_room = db.query(ChatRoom).filter(ChatRoom.id == chat_room_id).first()
            if not chat_room:
                await sio.emit('error', {'message': 'Chat room not found'}, room=sid)
                return
            
            # Verify user is part of this chat room
            if user_id != chat_room.tenant_id and user_id != chat_room.landlord_id:
                await sio.emit('error', {'message': 'Unauthorized'}, room=sid)
                return
            
            # Create message
            new_message = ChatMessage(
                chat_room_id=chat_room_id,
                sender_id=user_id,
                message=message_text,
                is_read=False
            )
            
            db.add(new_message)
            
            # Update chat room updated_at
            from sqlalchemy.sql import func
            chat_room.updated_at = func.now()
            
            db.commit()
            db.refresh(new_message)
            
            # Get sender info
            sender = db.query(User).filter(User.id == user_id).first()
            
            # Prepare message data
            message_data = {
                'id': new_message.id,
                'chat_room_id': new_message.chat_room_id,
                'sender_id': new_message.sender_id,
                'sender_name': sender.full_name or sender.email if sender else 'Unknown',
                'message': new_message.message,
                'is_read': new_message.is_read,
                'created_at': new_message.created_at.isoformat() if new_message.created_at else None,
            }
            
            # Broadcast to all users in the chat room
            room_name = f"chat_room_{chat_room_id}"
            await sio.emit('new_message', message_data, room=room_name)
            
            logger.info(f"Message sent by user {user_id} in room {chat_room_id}")
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error in send_message: {e}")
        await sio.emit('error', {'message': 'Failed to send message'}, room=sid)


@sio.event
async def mark_read(sid, data):
    """Mark messages as read"""
    try:
        session = await sio.get_session(sid)
        user_id = session.get('user_id')
        
        if not user_id:
            return
        
        chat_room_id = data.get('chat_room_id')
        
        if not chat_room_id:
            return
        
        # Mark messages as read in database
        db: Session = SessionLocal()
        try:
            chat_room = db.query(ChatRoom).filter(ChatRoom.id == chat_room_id).first()
            if not chat_room:
                return
            
            # Mark all messages from the other user as read
            other_user_id = chat_room.landlord_id if chat_room.tenant_id == user_id else chat_room.tenant_id
            
            db.query(ChatMessage).filter(
                ChatMessage.chat_room_id == chat_room_id,
                ChatMessage.sender_id == other_user_id,
                ChatMessage.is_read == False
            ).update({"is_read": True})
            
            db.commit()
            
            # Notify other user
            room_name = f"chat_room_{chat_room_id}"
            await sio.emit('messages_read', {'chat_room_id': chat_room_id}, room=room_name)
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error in mark_read: {e}")

