import re
from typing import Optional, Tuple


def validate_email(email: str) -> bool:
    """
    Validate email address format
    
    Args:
        email: Email address to validate
    
    Returns:
        True if valid, False otherwise
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_phone(phone: str) -> bool:
    """
    Validate Nepali phone number format (10 digits)
    
    Args:
        phone: Phone number to validate
    
    Returns:
        True if valid, False otherwise
    """
    # Remove spaces, dashes, and plus signs
    cleaned = re.sub(r'[\s\-+]', '', phone)
    # Check if it's 10 digits and starts with 9 or 98
    return bool(re.match(r'^9\d{9}$', cleaned))


def validate_password(password: str) -> Tuple[bool, Optional[str]]:
    """
    Validate password strength
    
    Args:
        password: Password to validate
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < 6:
        return False, "Password must be at least 6 characters long"
    
    if len(password) > 128:
        return False, "Password must be less than 128 characters"
    
    return True, None


def sanitize_input(input_string: str) -> str:
    """
    Sanitize user input to prevent XSS attacks
    
    Args:
        input_string: Input string to sanitize
    
    Returns:
        Sanitized string
    """
    # Remove potentially dangerous characters
    dangerous_chars = ['<', '>', '"', "'", '&', '\x00']
    sanitized = input_string
    for char in dangerous_chars:
        sanitized = sanitized.replace(char, '')
    return sanitized.strip()

