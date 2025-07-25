"""
Initialization Utility
Handles application startup and initial data synchronization
"""
import logging
import asyncio
from typing import Dict, Any
from utils.gitlab_api import GitLabAPI

logger = logging.getLogger(__name__)

class InitializationHelper:
    """Utility for handling application initialization and setup"""
    
    def __init__(self, database, sync_service):
        self.database = database
        self.sync_service = sync_service
    
    def perform_initial_sync(self, gitlab_api: GitLabAPI) -> Dict[str, Any]:
        """
        Perform initial synchronization when database is empty
        
        Args:
            gitlab_api: GitLab API instance
            
        Returns:
            Dict containing sync results and status
        """
        try:
            # Check if database is empty
            stats = self.database.get_dashboard_stats()
            if stats['total_groups'] > 0 or stats['total_projects'] > 0:
                return {
                    'initial_sync': False,
                    'message': 'Database already contains data'
                }
            
            logger.info("Database is empty, triggering initial sync...")
            
            # Set up sync service
            self.sync_service.set_gitlab_api(gitlab_api)
            
            # Perform limited initial sync for faster setup
            sync_results = self._perform_limited_sync(gitlab_api)
            
            return {
                'initial_sync': True,
                'message': 'Initial data synchronized successfully',
                'results': sync_results
            }
            
        except Exception as e:
            logger.warning(f"Initial sync failed: {str(e)}")
            return {
                'initial_sync': False,
                'message': 'Configuration saved successfully. Use Sync button to load data.',
                'sync_error': str(e)
            }
    
    def _perform_limited_sync(self, gitlab_api: GitLabAPI) -> Dict[str, Any]:
        """
        Perform a limited sync for initial setup (faster than full sync)
        
        Args:
            gitlab_api: GitLab API instance
            
        Returns:
            Dict containing sync statistics
        """
        sync_stats = {
            'groups_synced': 0,
            'projects_synced': 0,
            'pipelines_synced': 0,
            'branches_synced': 0,
            'errors': []
        }
        
        try:
            # Sync groups first
            groups_result = gitlab_api.get_groups()
            if groups_result['success']:
                self.database.save_groups(groups_result['groups'])
                sync_stats['groups_synced'] = len(groups_result['groups'])
                logger.info(f"Saved {len(groups_result['groups'])} groups to database")
                
                # Sync projects for first 3 groups (limit for speed)
                for group in groups_result['groups'][:3]:
                    try:
                        projects_result = gitlab_api.get_group_projects(group['id'])
                        if projects_result['success']:
                            self.database.save_projects(projects_result['projects'], group['id'])
                            projects_count = len(projects_result['projects'])
                            sync_stats['projects_synced'] += projects_count
                            logger.info(f"Saved {projects_count} projects for group {group['name']}")
                            
                            # Sync pipelines and branches for first 2 projects per group
                            for project in projects_result['projects'][:2]:
                                try:
                                    self._sync_project_data(gitlab_api, project, sync_stats)
                                except Exception as e:
                                    error_msg = f"Failed to sync data for project {project['id']}: {str(e)}"
                                    logger.warning(error_msg)
                                    sync_stats['errors'].append(error_msg)
                                    
                    except Exception as e:
                        error_msg = f"Failed to sync projects for group {group['id']}: {str(e)}"
                        logger.warning(error_msg)
                        sync_stats['errors'].append(error_msg)
                        
        except Exception as e:
            error_msg = f"Failed to sync groups: {str(e)}"
            logger.error(error_msg)
            sync_stats['errors'].append(error_msg)
        
        return sync_stats
    
    def _sync_project_data(self, gitlab_api: GitLabAPI, project: Dict[str, Any], 
                          sync_stats: Dict[str, Any]):
        """
        Sync pipelines and branches for a single project
        
        Args:
            gitlab_api: GitLab API instance
            project: Project data
            sync_stats: Statistics dictionary to update
        """
        project_id = project['id']
        
        # Sync pipelines
        try:
            pipelines_result = gitlab_api.get_project_pipelines(project_id)
            if pipelines_result['success'] and pipelines_result['pipelines']:
                self.database.save_pipelines(pipelines_result['pipelines'], project_id)
                pipelines_count = len(pipelines_result['pipelines'])
                sync_stats['pipelines_synced'] += pipelines_count
                logger.info(f"Saved {pipelines_count} pipelines for project {project['name']}")
        except Exception as e:
            logger.warning(f"Failed to sync pipelines for project {project_id}: {str(e)}")
        
        # Sync branches
        try:
            branches_result = gitlab_api.get_project_branches(project_id)
            if branches_result['success'] and branches_result['branches']:
                self.database.save_branches(branches_result['branches'], project_id)
                branches_count = len(branches_result['branches'])
                sync_stats['branches_synced'] += branches_count
                logger.info(f"Saved {branches_count} branches for project {project['name']}")
        except Exception as e:
            logger.warning(f"Failed to sync branches for project {project_id}: {str(e)}")
    
    def setup_logging(self, log_level: str = 'INFO'):
        """Setup application logging"""
        logging.basicConfig(
            level=getattr(logging, log_level.upper(), logging.INFO),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        logger.info(f"Logging configured with level: {log_level}")
    
    def validate_dependencies(self) -> Dict[str, Any]:
        """Validate that all required dependencies are available"""
        validation_results = {
            'valid': True,
            'missing_dependencies': [],
            'warnings': []
        }
        
        try:
            import requests
        except ImportError:
            validation_results['valid'] = False
            validation_results['missing_dependencies'].append('requests')
        
        try:
            import flask
        except ImportError:
            validation_results['valid'] = False
            validation_results['missing_dependencies'].append('flask')
        
        try:
            import sqlite3
        except ImportError:
            validation_results['valid'] = False
            validation_results['missing_dependencies'].append('sqlite3')
        
        # Check database connection
        try:
            self.database.get_dashboard_stats()
        except Exception as e:
            validation_results['warnings'].append(f"Database connection issue: {str(e)}")
        
        return validation_results
