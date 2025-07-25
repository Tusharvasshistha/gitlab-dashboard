import asyncio
import logging
from typing import Optional, Dict, List
from database import GitLabDatabase
import requests

class GitLabSyncService:
    def __init__(self, db: GitLabDatabase):
        self.db = db
        self.logger = logging.getLogger(__name__)
        self.gitlab_api = None
        
    def set_gitlab_api(self, gitlab_api):
        """Set the GitLab API instance"""
        self.gitlab_api = gitlab_api
    
    async def full_sync(self) -> Dict:
        """Perform a full synchronization of all GitLab data"""
        if not self.gitlab_api:
            raise Exception("GitLab API not configured")
        
        sync_results = {
            'groups': {'success': 0, 'failed': 0, 'errors': []},
            'projects': {'success': 0, 'failed': 0, 'errors': []},
            'pipelines': {'success': 0, 'failed': 0, 'errors': []},
            'branches': {'success': 0, 'failed': 0, 'errors': []}
        }
        
        try:
            # Step 1: Sync groups and subgroups
            self.logger.info("Starting groups synchronization...")
            await self.sync_groups(sync_results)
            
            # Step 2: Sync projects
            self.logger.info("Starting projects synchronization...")
            await self.sync_projects(sync_results)
            
            # Step 3: Sync pipelines for each project
            self.logger.info("Starting pipelines synchronization...")
            await self.sync_pipelines(sync_results)
            
            # Step 4: Sync branches for each project
            self.logger.info("Starting branches synchronization...")
            await self.sync_branches(sync_results)
            
            self.db.update_sync_status('full_sync', None, 'completed')
            self.logger.info("Full synchronization completed successfully")
            
        except Exception as e:
            self.logger.error(f"Full sync failed: {str(e)}")
            self.db.update_sync_status('full_sync', None, 'failed', str(e))
            raise
        
        return sync_results
    
    async def sync_groups(self, sync_results: Dict):
        """Sync all groups and subgroups"""
        try:
            # Get all groups
            groups_data = self.gitlab_api.get_groups()
            if not groups_data['success']:
                raise Exception(groups_data['error'])
            
            groups = groups_data['groups']
            self.db.save_groups(groups)
            sync_results['groups']['success'] += len(groups)
            
            # Get subgroups for each group
            for group in groups:
                try:
                    subgroups_data = self.gitlab_api.get_subgroups(group['id'])
                    if subgroups_data['success']:
                        subgroups = subgroups_data['subgroups']
                        if subgroups:
                            # Mark subgroups with parent_id
                            for subgroup in subgroups:
                                subgroup['parent_id'] = group['id']
                            self.db.save_groups(subgroups)
                            sync_results['groups']['success'] += len(subgroups)
                except Exception as e:
                    error_msg = f"Failed to sync subgroups for group {group['id']}: {str(e)}"
                    self.logger.error(error_msg)
                    sync_results['groups']['errors'].append(error_msg)
                    sync_results['groups']['failed'] += 1
                    
        except Exception as e:
            error_msg = f"Failed to sync groups: {str(e)}"
            self.logger.error(error_msg)
            sync_results['groups']['errors'].append(error_msg)
            raise
    
    async def sync_projects(self, sync_results: Dict):
        """Sync all projects"""
        try:
            # Get all groups from database
            all_groups = self.db.get_groups()
            subgroups = self.db.get_groups(parent_id=0)  # This will get subgroups
            
            # Add subgroups to the list
            for group in all_groups:
                subgroups.extend(self.db.get_subgroups(group['id']))
            
            all_groups.extend(subgroups)
            
            # Sync projects for each group
            for group in all_groups:
                try:
                    projects_data = self.gitlab_api.get_group_projects(group['id'])
                    if projects_data['success']:
                        projects = projects_data['projects']
                        if projects:
                            self.db.save_projects(projects, group['id'])
                            sync_results['projects']['success'] += len(projects)
                except Exception as e:
                    error_msg = f"Failed to sync projects for group {group['id']}: {str(e)}"
                    self.logger.error(error_msg)
                    sync_results['projects']['errors'].append(error_msg)
                    sync_results['projects']['failed'] += 1
                    
        except Exception as e:
            error_msg = f"Failed to sync projects: {str(e)}"
            self.logger.error(error_msg)
            sync_results['projects']['errors'].append(error_msg)
            raise
    
    async def sync_pipelines(self, sync_results: Dict):
        """Sync pipelines for all projects"""
        try:
            # Get all projects from database
            projects = self.db.get_projects()
            
            for project in projects:
                try:
                    pipelines_data = self.gitlab_api.get_project_pipelines(project['id'])
                    if pipelines_data['success']:
                        pipelines = pipelines_data['pipelines']
                        self.db.save_pipelines(pipelines, project['id'])
                        sync_results['pipelines']['success'] += len(pipelines)
                except Exception as e:
                    error_msg = f"Failed to sync pipelines for project {project['id']}: {str(e)}"
                    self.logger.error(error_msg)
                    sync_results['pipelines']['errors'].append(error_msg)
                    sync_results['pipelines']['failed'] += 1
                    
        except Exception as e:
            error_msg = f"Failed to sync pipelines: {str(e)}"
            self.logger.error(error_msg)
            sync_results['pipelines']['errors'].append(error_msg)
            raise
    
    async def sync_branches(self, sync_results: Dict):
        """Sync branches for all projects"""
        try:
            # Get all projects from database
            projects = self.db.get_projects()
            
            for project in projects:
                try:
                    branches_data = self.gitlab_api.get_project_branches(project['id'])
                    if branches_data['success']:
                        branches = branches_data['branches']
                        self.db.save_branches(branches, project['id'])
                        sync_results['branches']['success'] += len(branches)
                except Exception as e:
                    error_msg = f"Failed to sync branches for project {project['id']}: {str(e)}"
                    self.logger.error(error_msg)
                    sync_results['branches']['errors'].append(error_msg)
                    sync_results['branches']['failed'] += 1
                    
        except Exception as e:
            error_msg = f"Failed to sync branches: {str(e)}"
            self.logger.error(error_msg)
            sync_results['branches']['errors'].append(error_msg)
            raise
    
    async def sync_single_project(self, project_id: int) -> Dict:
        """Sync data for a single project"""
        if not self.gitlab_api:
            raise Exception("GitLab API not configured")
        
        sync_results = {
            'pipelines': {'success': 0, 'failed': 0, 'errors': []},
            'branches': {'success': 0, 'failed': 0, 'errors': []}
        }
        
        try:
            # Sync pipelines
            pipelines_data = self.gitlab_api.get_project_pipelines(project_id)
            if pipelines_data['success']:
                pipelines = pipelines_data['pipelines']
                self.db.save_pipelines(pipelines, project_id)
                sync_results['pipelines']['success'] = len(pipelines)
            else:
                sync_results['pipelines']['errors'].append(pipelines_data.get('error', 'Unknown error'))
                sync_results['pipelines']['failed'] = 1
            
            # Sync branches
            branches_data = self.gitlab_api.get_project_branches(project_id)
            if branches_data['success']:
                branches = branches_data['branches']
                self.db.save_branches(branches, project_id)
                sync_results['branches']['success'] = len(branches)
            else:
                sync_results['branches']['errors'].append(branches_data.get('error', 'Unknown error'))
                sync_results['branches']['failed'] = 1
            
            self.db.update_sync_status('project_sync', project_id, 'completed')
            
        except Exception as e:
            error_msg = f"Failed to sync project {project_id}: {str(e)}"
            self.logger.error(error_msg)
            self.db.update_sync_status('project_sync', project_id, 'failed', str(e))
            raise
        
        return sync_results
    
    def get_sync_status(self) -> Dict:
        """Get overall sync status"""
        full_sync_status = self.db.get_sync_status('full_sync')
        stats = self.db.get_dashboard_stats()
        
        return {
            'last_full_sync': full_sync_status['last_sync'] if full_sync_status else None,
            'sync_status': full_sync_status['sync_status'] if full_sync_status else 'never',
            'error_message': full_sync_status['error_message'] if full_sync_status else None,
            'stats': stats
        }
    def __init__(self, db: GitLabDatabase):
        self.db = db
        self.logger = logging.getLogger(__name__)
        self.gitlab_api = None
        
    def set_gitlab_api(self, gitlab_api):
        """Set the GitLab API instance"""
        self.gitlab_api = gitlab_api
    
    async def full_sync(self) -> Dict:
        """Perform a full synchronization of all GitLab data"""
        if not self.gitlab_api:
            raise Exception("GitLab API not configured")
        
        sync_results = {
            'groups': {'success': 0, 'failed': 0, 'errors': []},
            'projects': {'success': 0, 'failed': 0, 'errors': []},
            'pipelines': {'success': 0, 'failed': 0, 'errors': []},
            'branches': {'success': 0, 'failed': 0, 'errors': []}
        }
        
        try:
            # Step 1: Sync groups and subgroups
            self.logger.info("Starting groups synchronization...")
            await self.sync_groups(sync_results)
            
            # Step 2: Sync projects
            self.logger.info("Starting projects synchronization...")
            await self.sync_projects(sync_results)
            
            # Step 3: Sync pipelines for each project
            self.logger.info("Starting pipelines synchronization...")
            await self.sync_pipelines(sync_results)
            
            # Step 4: Sync branches for each project
            self.logger.info("Starting branches synchronization...")
            await self.sync_branches(sync_results)
            
            self.db.update_sync_status('full_sync', None, 'completed')
            self.logger.info("Full synchronization completed successfully")
            
        except Exception as e:
            self.logger.error(f"Full sync failed: {str(e)}")
            self.db.update_sync_status('full_sync', None, 'failed', str(e))
            raise
        
        return sync_results
    
    async def sync_groups(self, sync_results: Dict):
        """Sync all groups and subgroups"""
        try:
            # Get all groups
            groups_data = self.gitlab_api.get_groups()
            if not groups_data['success']:
                raise Exception(groups_data['error'])
            
            groups = groups_data['groups']
            self.db.save_groups(groups)
            sync_results['groups']['success'] += len(groups)
            
            # Get subgroups for each group
            for group in groups:
                try:
                    subgroups_data = self.gitlab_api.get_subgroups(group['id'])
                    if subgroups_data['success']:
                        subgroups = subgroups_data['subgroups']
                        if subgroups:
                            # Mark subgroups with parent_id
                            for subgroup in subgroups:
                                subgroup['parent_id'] = group['id']
                            self.db.save_groups(subgroups)
                            sync_results['groups']['success'] += len(subgroups)
                except Exception as e:
                    error_msg = f"Failed to sync subgroups for group {group['id']}: {str(e)}"
                    self.logger.error(error_msg)
                    sync_results['groups']['errors'].append(error_msg)
                    sync_results['groups']['failed'] += 1
                    
        except Exception as e:
            error_msg = f"Failed to sync groups: {str(e)}"
            self.logger.error(error_msg)
            sync_results['groups']['errors'].append(error_msg)
            raise
    
    async def sync_projects(self, sync_results: Dict):
        """Sync all projects"""
        try:
            # Get all groups from database
            all_groups = self.db.get_groups()
            subgroups = self.db.get_groups(parent_id=0)  # This will get subgroups
            
            # Add subgroups to the list
            for group in all_groups:
                subgroups.extend(self.db.get_subgroups(group['id']))
            
            all_groups.extend(subgroups)
            
            # Sync projects for each group
            for group in all_groups:
                try:
                    projects_data = self.gitlab_api.get_group_projects(group['id'])
                    if projects_data['success']:
                        projects = projects_data['projects']
                        if projects:
                            self.db.save_projects(projects, group['id'])
                            sync_results['projects']['success'] += len(projects)
                except Exception as e:
                    error_msg = f"Failed to sync projects for group {group['id']}: {str(e)}"
                    self.logger.error(error_msg)
                    sync_results['projects']['errors'].append(error_msg)
                    sync_results['projects']['failed'] += 1
                    
        except Exception as e:
            error_msg = f"Failed to sync projects: {str(e)}"
            self.logger.error(error_msg)
            sync_results['projects']['errors'].append(error_msg)
            raise
    
    async def sync_pipelines(self, sync_results: Dict):
        """Sync pipelines for all projects"""
        try:
            # Get all projects from database
            projects = self.db.get_projects()
            
            for project in projects:
                try:
                    pipelines_data = self.gitlab_api.get_project_pipelines(project['id'])
                    if pipelines_data['success']:
                        pipelines = pipelines_data['pipelines']
                        self.db.save_pipelines(pipelines, project['id'])
                        sync_results['pipelines']['success'] += len(pipelines)
                except Exception as e:
                    error_msg = f"Failed to sync pipelines for project {project['id']}: {str(e)}"
                    self.logger.error(error_msg)
                    sync_results['pipelines']['errors'].append(error_msg)
                    sync_results['pipelines']['failed'] += 1
                    
        except Exception as e:
            error_msg = f"Failed to sync pipelines: {str(e)}"
            self.logger.error(error_msg)
            sync_results['pipelines']['errors'].append(error_msg)
            raise
    
    async def sync_branches(self, sync_results: Dict):
        """Sync branches for all projects"""
        try:
            # Get all projects from database
            projects = self.db.get_projects()
            
            for project in projects:
                try:
                    branches_data = self.gitlab_api.get_project_branches(project['id'])
                    if branches_data['success']:
                        branches = branches_data['branches']
                        self.db.save_branches(branches, project['id'])
                        sync_results['branches']['success'] += len(branches)
                except Exception as e:
                    error_msg = f"Failed to sync branches for project {project['id']}: {str(e)}"
                    self.logger.error(error_msg)
                    sync_results['branches']['errors'].append(error_msg)
                    sync_results['branches']['failed'] += 1
                    
        except Exception as e:
            error_msg = f"Failed to sync branches: {str(e)}"
            self.logger.error(error_msg)
            sync_results['branches']['errors'].append(error_msg)
            raise
    
    async def sync_single_project(self, project_id: int) -> Dict:
        """Sync data for a single project"""
        if not self.gitlab_api:
            raise Exception("GitLab API not configured")
        
        sync_results = {
            'pipelines': {'success': 0, 'failed': 0, 'errors': []},
            'branches': {'success': 0, 'failed': 0, 'errors': []}
        }
        
        try:
            # Sync pipelines
            pipelines_data = self.gitlab_api.get_project_pipelines(project_id)
            if pipelines_data['success']:
                pipelines = pipelines_data['pipelines']
                self.db.save_pipelines(pipelines, project_id)
                sync_results['pipelines']['success'] = len(pipelines)
            else:
                sync_results['pipelines']['errors'].append(pipelines_data.get('error', 'Unknown error'))
                sync_results['pipelines']['failed'] = 1
            
            # Sync branches
            branches_data = self.gitlab_api.get_project_branches(project_id)
            if branches_data['success']:
                branches = branches_data['branches']
                self.db.save_branches(branches, project_id)
                sync_results['branches']['success'] = len(branches)
            else:
                sync_results['branches']['errors'].append(branches_data.get('error', 'Unknown error'))
                sync_results['branches']['failed'] = 1
            
            self.db.update_sync_status('project_sync', project_id, 'completed')
            
        except Exception as e:
            error_msg = f"Failed to sync project {project_id}: {str(e)}"
            self.logger.error(error_msg)
            self.db.update_sync_status('project_sync', project_id, 'failed', str(e))
            raise
        
        return sync_results
    
    def get_sync_status(self) -> Dict:
        """Get overall sync status"""
        full_sync_status = self.db.get_sync_status('full_sync')
        stats = self.db.get_dashboard_stats()
        
        return {
            'last_full_sync': full_sync_status['last_sync'] if full_sync_status else None,
            'sync_status': full_sync_status['sync_status'] if full_sync_status else 'never',
            'error_message': full_sync_status['error_message'] if full_sync_status else None,
            'stats': stats
        }
