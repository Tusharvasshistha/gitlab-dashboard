"""
Error Handling Utilities
Centralized error handling and response formatting
"""
import logging
from typing import Dict, Any, Optional
from flask import jsonify
from functools import wraps

logger = logging.getLogger(__name__)

class ErrorHandler:
    """Centralized error handling utility"""
    
    @staticmethod
    def handle_api_error(func):
        """Decorator for handling API errors consistently"""
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except GitLabAPIError as e:
                logger.error(f"GitLab API error in {func.__name__}: {str(e)}")
                return jsonify({
                    'success': False,
                    'error': f'GitLab API Error: {str(e)}',
                    'error_type': 'gitlab_api_error'
                }), e.status_code or 500
            except DatabaseError as e:
                logger.error(f"Database error in {func.__name__}: {str(e)}")
                return jsonify({
                    'success': False,
                    'error': f'Database Error: {str(e)}',
                    'error_type': 'database_error'
                }), 500
            except ValidationError as e:
                logger.warning(f"Validation error in {func.__name__}: {str(e)}")
                return jsonify({
                    'success': False,
                    'error': f'Validation Error: {str(e)}',
                    'error_type': 'validation_error'
                }), 400
            except Exception as e:
                logger.error(f"Unexpected error in {func.__name__}: {str(e)}")
                return jsonify({
                    'success': False,
                    'error': 'An unexpected error occurred',
                    'error_type': 'internal_error'
                }), 500
        return wrapper
    
    @staticmethod
    def create_error_response(error_message: str, status_code: int = 500, 
                            error_type: str = 'error') -> tuple:
        """Create standardized error response"""
        return jsonify({
            'success': False,
            'error': error_message,
            'error_type': error_type
        }), status_code
    
    @staticmethod
    def create_success_response(data: Any = None, message: str = None, 
                              source: str = 'database', **kwargs) -> Dict[str, Any]:
        """Create standardized success response"""
        response = {
            'success': True,
            'source': source
        }
        
        if message:
            response['message'] = message
        
        if data is not None:
            if isinstance(data, dict):
                response.update(data)
            else:
                response['data'] = data
        
        response.update(kwargs)
        return jsonify(response)

class GitLabAPIError(Exception):
    """Custom exception for GitLab API errors"""
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code

class DatabaseError(Exception):
    """Custom exception for database errors"""
    pass

class ValidationError(Exception):
    """Custom exception for validation errors"""
    pass

class SyncError(Exception):
    """Custom exception for synchronization errors"""
    pass
