"""
Configuration Management Utility
Handles configuration loading, validation, and management
"""
import os
from typing import Dict, Optional, Any
from flask import session
import logging

logger = logging.getLogger(__name__)

class ConfigManager:
    """Configuration management utility"""
    
    def __init__(self, database):
        self.database = database
    
    def get_gitlab_config(self) -> Optional[Dict[str, str]]:
        """Get GitLab configuration from session or database"""
        # First try session
        gitlab_url = session.get('gitlab_url')
        access_token = session.get('gitlab_access_token')
        
        # If not in session, try database
        if not gitlab_url or not access_token:
            config = self.database.get_config()
            if config:
                gitlab_url = config['gitlab_url']
                access_token = config['access_token']
                # Update session for future requests
                session['gitlab_url'] = gitlab_url
                session['gitlab_access_token'] = access_token
        
        if gitlab_url and access_token:
            return {
                'gitlab_url': gitlab_url,
                'access_token': access_token
            }
        
        return None
    
    def save_gitlab_config(self, gitlab_url: str, access_token: str) -> Dict[str, Any]:
        """Save GitLab configuration to session and database"""
        try:
            # Save to session
            session['gitlab_url'] = gitlab_url
            session['gitlab_access_token'] = access_token
            
            # Save to database
            self.database.save_config(gitlab_url, access_token)
            
            logger.info(f"Configuration saved for GitLab URL: {gitlab_url}")
            return {'success': True, 'message': 'Configuration saved successfully'}
            
        except Exception as e:
            logger.error(f"Failed to save configuration: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def validate_config(self, config: Dict[str, str]) -> Dict[str, Any]:
        """Validate configuration parameters"""
        errors = []
        
        gitlab_url = config.get('gitlab_url', '').strip()
        access_token = config.get('access_token', '').strip()
        
        if not gitlab_url:
            errors.append('GitLab URL is required')
        elif not gitlab_url.startswith(('http://', 'https://')):
            errors.append('GitLab URL must start with http:// or https://')
        
        if not access_token:
            errors.append('Access Token is required')
        elif len(access_token) < 20:
            errors.append('Access Token appears to be too short (minimum 20 characters)')
        
        if errors:
            return {'valid': False, 'errors': errors}
        
        return {'valid': True, 'errors': []}
    
    def is_configured(self) -> bool:
        """Check if GitLab is properly configured"""
        config = self.get_gitlab_config()
        return config is not None
    
    def get_app_config(self) -> Dict[str, Any]:
        """Get application configuration"""
        return {
            'secret_key': os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production'),
            'debug': os.environ.get('FLASK_DEBUG', 'False').lower() == 'true',
            'host': os.environ.get('FLASK_HOST', '0.0.0.0'),
            'port': int(os.environ.get('FLASK_PORT', '5000')),
            'database_url': os.environ.get('DATABASE_URL', 'gitlab_dashboard.db'),
            'log_level': os.environ.get('LOG_LEVEL', 'INFO')
        }
