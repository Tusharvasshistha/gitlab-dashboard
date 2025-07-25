"""
Migration Script for GitLab Dashboard Refactoring
This script helps transition from monolithic app.py to modular structure
"""
import os
import shutil
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class MigrationHelper:
    """Helper class for migrating to the new modular structure"""
    
    def __init__(self, project_root):
        self.project_root = project_root
        self.backup_dir = os.path.join(project_root, 'backup')
    
    def create_backup(self):
        """Create backup of existing files"""
        try:
            if not os.path.exists(self.backup_dir):
                os.makedirs(self.backup_dir)
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_subdir = os.path.join(self.backup_dir, f'migration_backup_{timestamp}')
            os.makedirs(backup_subdir)
            
            # Backup original app.py
            if os.path.exists(os.path.join(self.project_root, 'app.py')):
                shutil.copy2(
                    os.path.join(self.project_root, 'app.py'),
                    os.path.join(backup_subdir, 'app.py.backup')
                )
                logger.info(f"Backed up app.py to {backup_subdir}")
            
            return backup_subdir
            
        except Exception as e:
            logger.error(f"Failed to create backup: {str(e)}")
            raise
    
    def migrate_to_modular_structure(self):
        """Migrate from monolithic to modular structure"""
        try:
            # Create backup first
            backup_location = self.create_backup()
            logger.info(f"Backup created at: {backup_location}")
            
            # Rename old app.py to app_old.py
            old_app_path = os.path.join(self.project_root, 'app.py')
            old_app_backup_path = os.path.join(self.project_root, 'app_old.py')
            
            if os.path.exists(old_app_path):
                shutil.move(old_app_path, old_app_backup_path)
                logger.info("Renamed app.py to app_old.py")
            
            # Rename new app to app.py
            new_app_path = os.path.join(self.project_root, 'app_refactored.py')
            final_app_path = os.path.join(self.project_root, 'app.py')
            
            if os.path.exists(new_app_path):
                shutil.move(new_app_path, final_app_path)
                logger.info("Renamed app_refactored.py to app.py")
            
            # Create requirements.txt update
            self.update_requirements()
            
            logger.info("Migration completed successfully!")
            logger.info("New modular structure:")
            logger.info("  - app.py (clean, modular main application)")
            logger.info("  - utils/ (utility modules)")
            logger.info("    - gitlab_api.py")
            logger.info("    - config.py")
            logger.info("    - data_transformer.py")
            logger.info("    - error_handler.py")
            logger.info("    - response_helper.py")
            logger.info("    - initialization.py")
            logger.info("  - app_old.py (backup of original monolithic app)")
            
            return True
            
        except Exception as e:
            logger.error(f"Migration failed: {str(e)}")
            return False
    
    def update_requirements(self):
        """Update requirements.txt with any new dependencies"""
        requirements_path = os.path.join(self.project_root, 'requirements.txt')
        
        # Additional requirements for the new structure
        new_requirements = [
            "# Added for modular structure improvements",
            "marshmallow>=3.19.0  # For configuration validation",
            "typing_extensions>=4.5.0  # For enhanced type hints"
        ]
        
        try:
            if os.path.exists(requirements_path):
                with open(requirements_path, 'r') as f:
                    existing_content = f.read()
                
                # Check if marshmallow is already included
                if 'marshmallow' not in existing_content:
                    with open(requirements_path, 'a') as f:
                        f.write('\n' + '\n'.join(new_requirements) + '\n')
                    logger.info("Updated requirements.txt with new dependencies")
            
        except Exception as e:
            logger.warning(f"Could not update requirements.txt: {str(e)}")
    
    def validate_migration(self):
        """Validate that the migration was successful"""
        validation_results = {
            'success': True,
            'issues': []
        }
        
        # Check if new app.py exists
        if not os.path.exists(os.path.join(self.project_root, 'app.py')):
            validation_results['success'] = False
            validation_results['issues'].append("app.py not found")
        
        # Check if utils directory exists
        utils_dir = os.path.join(self.project_root, 'utils')
        if not os.path.exists(utils_dir):
            validation_results['success'] = False
            validation_results['issues'].append("utils directory not found")
        
        # Check if all utility modules exist
        required_utils = [
            'gitlab_api.py',
            'config.py',
            'data_transformer.py',
            'error_handler.py',
            'response_helper.py',
            'initialization.py'
        ]
        
        for util_file in required_utils:
            util_path = os.path.join(utils_dir, util_file)
            if not os.path.exists(util_path):
                validation_results['success'] = False
                validation_results['issues'].append(f"Missing utility: {util_file}")
        
        # Check if backup was created
        if not os.path.exists(os.path.join(self.project_root, 'app_old.py')):
            validation_results['issues'].append("Original app.py backup not found")
        
        return validation_results

def main():
    """Main migration function"""
    # Setup logging
    logging.basicConfig(level=logging.INFO)
    
    # Get project root (current directory)
    project_root = os.getcwd()
    
    print("GitLab Dashboard Migration Tool")
    print("="*50)
    print("This tool will migrate your monolithic app.py to a modular structure.")
    print(f"Project directory: {project_root}")
    print()
    
    # Confirm migration
    response = input("Do you want to proceed with the migration? (y/N): ")
    if response.lower() != 'y':
        print("Migration cancelled.")
        return
    
    # Create migration helper
    migration_helper = MigrationHelper(project_root)
    
    # Perform migration
    print("Starting migration...")
    success = migration_helper.migrate_to_modular_structure()
    
    if success:
        print("\nValidating migration...")
        validation = migration_helper.validate_migration()
        
        if validation['success']:
            print("✅ Migration completed successfully!")
            print("\nNext steps:")
            print("1. Test the new application: python app.py")
            print("2. Install any new dependencies: pip install -r requirements.txt")
            print("3. If everything works, you can delete app_old.py")
        else:
            print("⚠️  Migration completed with issues:")
            for issue in validation['issues']:
                print(f"   - {issue}")
    else:
        print("❌ Migration failed. Check the logs for details.")

if __name__ == "__main__":
    main()
