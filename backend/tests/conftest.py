"""
Pytest configuration — ensures the backend package is importable from the tests/ directory.
"""
import sys
import os

# Add the backend root to the Python path so `from app.xxx import yyy` works
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
