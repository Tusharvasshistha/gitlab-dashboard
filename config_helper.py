#!/usr/bin/env python3
"""
Configuration Helper Script
Helps users set up GitLab Dashboard configuration easily
"""

import os
import sys
import json
from pathlib import Path

class ConfigHelper:
    """Helper for managing GitLab Dashboard configuration"""
    
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.env_file = self.base_dir / '.env'
        self.env_template = self.base_dir / '.env.template'
        self.config_file = self.base_dir / 'config.json'
        
    def check_config_sources(self):
        """Check all configuration sources and their status"""
        print("🔍 GitLab Dashboard Configuration Status")
        print("=" * 50)
        
        # Check environment variables
        env_gitlab_url = os.environ.get('GITLAB_URL')
        env_token = os.environ.get('GITLAB_ACCESS_TOKEN')
        env_configured = bool(env_gitlab_url and env_token and not self._is_template_value(env_token))
        
        print(f"📋 Environment Variables: {'✅ Configured' if env_configured else '❌ Not configured'}")
        if env_configured:
            print(f"   - GITLAB_URL: {env_gitlab_url}")
            print(f"   - GITLAB_ACCESS_TOKEN: {'*' * (len(env_token) - 4) + env_token[-4:]}")
        
        # Check .env file
        env_file_configured = self._check_env_file()
        print(f"📄 .env file: {'✅ Configured' if env_file_configured else '❌ Not found/configured'}")
        
        # Check config.json
        config_file_configured = self._check_config_file()
        print(f"⚙️  config.json: {'✅ Configured' if config_file_configured else '❌ Not found/configured'}")
        
        # Check template
        template_exists = self.env_template.exists()
        print(f"📝 .env.template: {'✅ Available' if template_exists else '❌ Not found'}")
        
        print("\n" + "=" * 50)
        
        # Overall status
        any_configured = env_configured or env_file_configured or config_file_configured
        if any_configured:
            print("🎉 GitLab Dashboard is configured and ready to run!")
            print("\nTo start: python3 app.py")
        else:
            print("⚠️  GitLab Dashboard needs configuration.")
            self._show_setup_options()
        
        return any_configured
    
    def _check_env_file(self):
        """Check if .env file has valid configuration"""
        if not self.env_file.exists():
            return False
            
        try:
            with open(self.env_file, 'r') as f:
                env_vars = {}
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        env_vars[key.strip()] = value.strip()
            
            gitlab_url = env_vars.get('GITLAB_URL')
            access_token = env_vars.get('GITLAB_ACCESS_TOKEN')
            
            if gitlab_url and access_token and not self._is_template_value(access_token):
                print(f"   - File exists: {self.env_file}")
                print(f"   - GITLAB_URL: {gitlab_url}")
                print(f"   - Token: {'*' * (len(access_token) - 4) + access_token[-4:]}")
                return True
        except Exception as e:
            print(f"   - Error reading file: {e}")
        
        return False
    
    def _check_config_file(self):
        """Check if config.json has valid configuration"""
        if not self.config_file.exists():
            return False
            
        try:
            with open(self.config_file, 'r') as f:
                config = json.load(f)
            
            gitlab_config = config.get('gitlab', {})
            gitlab_url = gitlab_config.get('url')
            access_token = gitlab_config.get('access_token')
            
            if gitlab_url and access_token and not self._is_template_value(access_token):
                print(f"   - File exists: {self.config_file}")
                print(f"   - GITLAB_URL: {gitlab_url}")
                print(f"   - Token: {'*' * (len(access_token) - 4) + access_token[-4:]}")
                return True
        except Exception as e:
            print(f"   - Error reading file: {e}")
        
        return False
    
    def _is_template_value(self, access_token):
        """Check if token is a template placeholder"""
        template_indicators = [
            'your-gitlab-access-token-here',
            'your-token-here',
            'placeholder',
            'example',
            'demo-token',
            'test-token',
            'xxxxxxxxxxxxxxxxxxxx'
        ]
        
        return (
            any(indicator in access_token.lower() for indicator in template_indicators) or
            len(access_token) < 20
        )
    
    def _show_setup_options(self):
        """Show setup options to user"""
        print("\n🔧 Setup Options:")
        print("\n1. 📝 Create .env file:")
        print(f"   cp {self.env_template} {self.env_file}")
        print("   # Edit .env with your GitLab URL and token")
        
        print("\n2. 🖥️  Set environment variables:")
        print("   export GITLAB_URL='https://gitlab.com'")
        print("   export GITLAB_ACCESS_TOKEN='your-token-here'")
        
        print("\n3. 🛠️  Run setup script:")
        print("   ./setup.sh")
        
        print("\n4. 🏃‍♂️ Run with demo mode (UI configuration):")
        print("   python3 app.py")
        print("   # Then configure via web interface")
    
    def create_sample_config(self):
        """Create sample configuration files"""
        print("📝 Creating sample configuration files...")
        
        # Create .env from template if it doesn't exist
        if not self.env_file.exists() and self.env_template.exists():
            import shutil
            shutil.copy(self.env_template, self.env_file)
            print(f"✅ Created {self.env_file} from template")
            print("📝 Please edit .env with your GitLab credentials")
        else:
            print(f"ℹ️  {self.env_file} already exists or template not found")
        
        # Create config.json template
        if not self.config_file.exists():
            config_template = {
                "gitlab": {
                    "url": "https://gitlab.com",
                    "access_token": "your-gitlab-access-token-here"
                },
                "app": {
                    "debug": True,
                    "host": "127.0.0.1",
                    "port": 5000
                }
            }
            
            with open(self.config_file, 'w') as f:
                json.dump(config_template, f, indent=2)
            print(f"✅ Created {self.config_file} template")
        else:
            print(f"ℹ️  {self.config_file} already exists")

def main():
    """Main function"""
    helper = ConfigHelper()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        if command == 'status':
            helper.check_config_sources()
        elif command == 'create':
            helper.create_sample_config()
        elif command == 'help':
            print("GitLab Dashboard Configuration Helper")
            print("\nCommands:")
            print("  status  - Check configuration status")
            print("  create  - Create sample configuration files")
            print("  help    - Show this help")
        else:
            print(f"Unknown command: {command}")
            print("Use 'python3 config_helper.py help' for available commands")
    else:
        # Default: check status
        helper.check_config_sources()

if __name__ == '__main__':
    main()
