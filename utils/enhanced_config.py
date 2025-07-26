"""
Enhanced Configuration Management with Multiple Sources
Priority: Environment Variables > .env file > Config File > Database > .env.template > UI
"""
import os
import json
from typing import Dict, Optional, Any
from flask import session
import logging

# Try to import python-dotenv for .env file support
try:
    from dotenv import load_dotenv
    DOTENV_AVAILABLE = True
except ImportError:
    DOTENV_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("python-dotenv not available. .env file support disabled.")

logger = logging.getLogger(__name__)

class EnhancedConfigManager:
    """Enhanced configuration management with multiple sources"""
    
    def __init__(self, database):
        self.database = database
        self.config_file_path = 'config.json'
        self.env_file_path = '.env'
        self.env_template_path = '.env.template'
        
        # Load .env file if available
        if DOTENV_AVAILABLE and os.path.exists(self.env_file_path):
            load_dotenv(self.env_file_path)
            logger.info(f"Loaded environment variables from {self.env_file_path}")
        elif DOTENV_AVAILABLE and os.path.exists(self.env_template_path):
            # Load .env.template as fallback
            load_dotenv(self.env_template_path)
            logger.info(f"Loaded environment variables from {self.env_template_path} (fallback)")
    
    def get_gitlab_config(self) -> Optional[Dict[str, str]]:
        """Get GitLab configuration with priority order"""
        
        # Priority 1: Environment Variables (Production)
        env_config = self._get_env_config()
        if env_config:
            logger.info("Using GitLab config from environment variables")
            return env_config
        
        # Priority 2: .env file (Development)
        dotenv_config = self._get_dotenv_config()
        if dotenv_config:
            logger.info("Using GitLab config from .env file")
            return dotenv_config
        
        # Priority 3: Config File (Development/Docker)
        file_config = self._get_file_config()
        if file_config:
            logger.info("Using GitLab config from config file")
            return file_config
        
        # Priority 4: Database (Previous UI configuration)
        db_config = self._get_database_config()
        if db_config:
            logger.info("Using GitLab config from database")
            return db_config
        
        # Priority 5: .env.template (Fallback defaults)
        template_config = self._get_template_config()
        if template_config:
            logger.info("Using GitLab config from .env.template (fallback)")
            return template_config
        
        # Priority 6: Session (Current session only)
        session_config = self._get_session_config()
        if session_config:
            logger.info("Using GitLab config from session")
            return session_config
        
        logger.warning("No GitLab configuration found in any source")
        return None
    
    def _get_env_config(self) -> Optional[Dict[str, str]]:
        """Get configuration from environment variables"""
        gitlab_url = os.environ.get('GITLAB_URL')
        access_token = os.environ.get('GITLAB_ACCESS_TOKEN')
        
        if gitlab_url and access_token and not self._is_template_value(gitlab_url, access_token):
            return {
                'gitlab_url': gitlab_url,
                'access_token': access_token,
                'source': 'environment'
            }
        return None
    
    def _get_dotenv_config(self) -> Optional[Dict[str, str]]:
        """Get configuration from .env file"""
        if not DOTENV_AVAILABLE or not os.path.exists(self.env_file_path):
            return None
            
        try:
            # Temporarily load .env file to check values
            env_vars = {}
            with open(self.env_file_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        env_vars[key.strip()] = value.strip()
            
            gitlab_url = env_vars.get('GITLAB_URL')
            access_token = env_vars.get('GITLAB_ACCESS_TOKEN')
            
            if gitlab_url and access_token and not self._is_template_value(gitlab_url, access_token):
                return {
                    'gitlab_url': gitlab_url,
                    'access_token': access_token,
                    'source': 'dotenv'
                }
        except Exception as e:
            logger.warning(f"Failed to read .env file: {e}")
        
        return None
    
    def _get_template_config(self) -> Optional[Dict[str, str]]:
        """Get configuration from .env.template as fallback defaults"""
        if not os.path.exists(self.env_template_path):
            return None
            
        try:
            env_vars = {}
            with open(self.env_template_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        env_vars[key.strip()] = value.strip()
            
            gitlab_url = env_vars.get('GITLAB_URL')
            access_token = env_vars.get('GITLAB_ACCESS_TOKEN')
            
            # Only use template values if they're not placeholder values
            if gitlab_url and access_token and not self._is_template_value(gitlab_url, access_token):
                return {
                    'gitlab_url': gitlab_url,
                    'access_token': access_token,
                    'source': 'template'
                }
        except Exception as e:
            logger.warning(f"Failed to read .env.template file: {e}")
        
        return None
    
    def _is_template_value(self, gitlab_url: str, access_token: str) -> bool:
        """Check if values are template placeholders"""
        template_indicators = [
            'your-gitlab-access-token-here',
            'your-token-here',
            'placeholder',
            'example',
            'demo-token',
            'test-token'
        ]
        
        return (
            any(indicator in access_token.lower() for indicator in template_indicators) or
            len(access_token) < 20  # GitLab tokens are typically longer
        )
    
    def _get_file_config(self) -> Optional[Dict[str, str]]:
        """Get configuration from config file"""
        try:
            if os.path.exists(self.config_file_path):
                with open(self.config_file_path, 'r') as f:
                    config = json.load(f)
                    
                gitlab_config = config.get('gitlab', {})
                gitlab_url = gitlab_config.get('url')
                access_token = gitlab_config.get('access_token')
                
                if gitlab_url and access_token:
                    return {
                        'gitlab_url': gitlab_url,
                        'access_token': access_token,
                        'source': 'file'
                    }
        except Exception as e:
            logger.warning(f"Failed to read config file: {e}")
        
        return None
    
    def _get_database_config(self) -> Optional[Dict[str, str]]:
        """Get configuration from database"""
        try:
            config = self.database.get_config()
            if config:
                return {
                    'gitlab_url': config['gitlab_url'],
                    'access_token': config['access_token'],
                    'source': 'database'
                }
        except Exception as e:
            logger.warning(f"Failed to read database config: {e}")
        
        return None
    
    def _get_session_config(self) -> Optional[Dict[str, str]]:
        """Get configuration from session"""
        gitlab_url = session.get('gitlab_url')
        access_token = session.get('gitlab_access_token')
        
        if gitlab_url and access_token:
            return {
                'gitlab_url': gitlab_url,
                'access_token': access_token,
                'source': 'session'
            }
        return None
    
    def save_config_to_file(self, gitlab_url: str, access_token: str) -> Dict[str, Any]:
        """Save configuration to file for development use"""
        try:
            config = {
                'gitlab': {
                    'url': gitlab_url,
                    'access_token': access_token
                },
                'app': {
                    'debug': True,
                    'host': '127.0.0.1',
                    'port': 5000
                }
            }
            
            with open(self.config_file_path, 'w') as f:
                json.dump(config, f, indent=2)
            
            logger.info(f"Configuration saved to {self.config_file_path}")
            return {'success': True, 'message': 'Configuration saved to file'}
            
        except Exception as e:
            logger.error(f"Failed to save config file: {e}")
            return {'success': False, 'error': str(e)}
    
    def create_env_template(self) -> str:
        """Create .env template file for users"""
        env_content = """# GitLab Dashboard Configuration
# Copy this file to .env and fill in your values

# GitLab Configuration (Required)
GITLAB_URL=https://gitlab.com
GITLAB_ACCESS_TOKEN=your-gitlab-access-token-here

# Application Configuration (Optional)
SECRET_KEY=your-secret-key-for-sessions
FLASK_DEBUG=false
FLASK_HOST=0.0.0.0
FLASK_PORT=5000

# Database Configuration (Optional)
DATABASE_URL=gitlab_dashboard.db

# Logging Configuration (Optional)
LOG_LEVEL=INFO
"""
        
        try:
            with open('.env.template', 'w') as f:
                f.write(env_content)
            return f"Template created: .env.template"
        except Exception as e:
            return f"Failed to create template: {e}"
    
    def get_config_status(self) -> Dict[str, Any]:
        """Get status of all configuration sources"""
        current_config = self.get_gitlab_config()
        return {
            'environment': self._get_env_config() is not None,
            'dotenv_file': self._get_dotenv_config() is not None,
            'config_file': self._get_file_config() is not None,
            'database': self._get_database_config() is not None,
            'template_fallback': self._get_template_config() is not None,
            'session': self._get_session_config() is not None,
            'current_source': current_config.get('source') if current_config else None,
            'is_configured': self.is_configured(),
            'files_exist': {
                'env': os.path.exists(self.env_file_path),
                'env_template': os.path.exists(self.env_template_path),
                'config_json': os.path.exists(self.config_file_path)
            }
        }
    
    def is_configured(self) -> bool:
        """Check if GitLab is properly configured from any source"""
        return self.get_gitlab_config() is not None
    
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
    
    def save_gitlab_config(self, gitlab_url: str, access_token: str) -> Dict[str, Any]:
        """Save GitLab configuration to session and database"""
        try:
            # Save to session
            from flask import session
            session['gitlab_url'] = gitlab_url
            session['gitlab_access_token'] = access_token
            
            # Save to database
            self.database.save_config(gitlab_url, access_token)
            
            logger.info(f"Configuration saved for GitLab URL: {gitlab_url}")
            return {'success': True, 'message': 'Configuration saved successfully'}
            
        except Exception as e:
            logger.error(f"Failed to save configuration: {str(e)}")
            return {'success': False, 'error': str(e)}
    
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
