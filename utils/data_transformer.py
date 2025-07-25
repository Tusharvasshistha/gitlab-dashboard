"""
Data Transformation Utilities
Handles conversion between database and API formats
"""
import json
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class DataTransformer:
    """Utility for transforming data between different formats"""
    
    @staticmethod
    def format_groups_from_db(groups: List[Dict]) -> List[Dict]:
        """Convert database group format to API format"""
        formatted_groups = []
        for group in groups:
            if group.get('gitlab_data'):
                try:
                    gitlab_data = json.loads(group['gitlab_data'])
                    formatted_groups.append(gitlab_data)
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON data for group {group.get('id')}")
                    formatted_groups.append(DataTransformer._create_basic_group(group))
            else:
                formatted_groups.append(DataTransformer._create_basic_group(group))
        
        return formatted_groups
    
    @staticmethod
    def _create_basic_group(group: Dict) -> Dict:
        """Create basic group data structure"""
        return {
            'id': group['id'],
            'name': group['name'],
            'full_name': group.get('full_name', ''),
            'path': group.get('path', ''),
            'full_path': group.get('full_path', ''),
            'description': group.get('description', ''),
            'visibility': group.get('visibility', ''),
            'avatar_url': group.get('avatar_url', ''),
            'web_url': group.get('web_url', ''),
            'parent_id': group.get('parent_id')
        }
    
    @staticmethod
    def format_projects_from_db(projects: List[Dict]) -> List[Dict]:
        """Convert database project format to API format"""
        formatted_projects = []
        for project in projects:
            if project.get('gitlab_data'):
                try:
                    gitlab_data = json.loads(project['gitlab_data'])
                    formatted_projects.append(gitlab_data)
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON data for project {project.get('id')}")
                    formatted_projects.append(DataTransformer._create_basic_project(project))
            else:
                formatted_projects.append(DataTransformer._create_basic_project(project))
        
        return formatted_projects
    
    @staticmethod
    def _create_basic_project(project: Dict) -> Dict:
        """Create basic project data structure"""
        return {
            'id': project['id'],
            'name': project['name'],
            'name_with_namespace': project.get('name_with_namespace', ''),
            'path': project.get('path', ''),
            'path_with_namespace': project.get('path_with_namespace', ''),
            'description': project.get('description', ''),
            'default_branch': project.get('default_branch', ''),
            'visibility': project.get('visibility', ''),
            'avatar_url': project.get('avatar_url', ''),
            'web_url': project.get('web_url', ''),
            'http_url_to_repo': project.get('http_url_to_repo', ''),
            'ssh_url_to_repo': project.get('ssh_url_to_repo', '')
        }
    
    @staticmethod
    def format_pipelines_from_db(pipelines: List[Dict]) -> List[Dict]:
        """Convert database pipeline format to API format"""
        formatted_pipelines = []
        for pipeline in pipelines:
            if pipeline.get('gitlab_data'):
                try:
                    gitlab_data = json.loads(pipeline['gitlab_data'])
                    formatted_pipelines.append(gitlab_data)
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON data for pipeline {pipeline.get('id')}")
                    formatted_pipelines.append(DataTransformer._create_basic_pipeline(pipeline))
            else:
                formatted_pipelines.append(DataTransformer._create_basic_pipeline(pipeline))
        
        return formatted_pipelines
    
    @staticmethod
    def _create_basic_pipeline(pipeline: Dict) -> Dict:
        """Create basic pipeline data structure"""
        return {
            'id': pipeline['id'],
            'status': pipeline.get('status', ''),
            'ref': pipeline.get('ref', ''),
            'sha': pipeline.get('sha', ''),
            'tag': pipeline.get('tag', False),
            'source': pipeline.get('source', ''),
            'web_url': pipeline.get('web_url', ''),
            'created_at': pipeline.get('created_at'),
            'updated_at': pipeline.get('updated_at'),
            'started_at': pipeline.get('started_at'),
            'finished_at': pipeline.get('finished_at'),
            'duration': pipeline.get('duration')
        }
    
    @staticmethod
    def format_branches_from_db(branches: List[Dict]) -> List[Dict]:
        """Convert database branch format to API format"""
        formatted_branches = []
        for branch in branches:
            if branch.get('gitlab_data'):
                try:
                    gitlab_data = json.loads(branch['gitlab_data'])
                    formatted_branches.append(gitlab_data)
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON data for branch {branch.get('name')}")
                    formatted_branches.append(DataTransformer._create_basic_branch(branch))
            else:
                formatted_branches.append(DataTransformer._create_basic_branch(branch))
        
        return formatted_branches
    
    @staticmethod
    def _create_basic_branch(branch: Dict) -> Dict:
        """Create basic branch data structure"""
        commit_data = {
            'id': branch.get('commit_id', ''),
            'short_id': branch.get('commit_short_id', ''),
            'title': branch.get('commit_title', ''),
            'author_name': branch.get('commit_author_name', ''),
            'author_email': branch.get('commit_author_email', ''),
            'authored_date': branch.get('commit_authored_date'),
            'committer_name': branch.get('commit_committer_name', ''),
            'committer_email': branch.get('commit_committer_email', ''),
            'committed_date': branch.get('commit_committed_date'),
            'message': branch.get('commit_message', '')
        }
        
        return {
            'name': branch.get('name', ''),
            'merged': branch.get('merged', False),
            'protected': branch.get('protected', False),
            'default': branch.get('default_branch', False),
            'developers_can_push': branch.get('developers_can_push', False),
            'developers_can_merge': branch.get('developers_can_merge', False),
            'can_push': branch.get('can_push', False),
            'web_url': branch.get('web_url', ''),
            'commit': commit_data
        }
    
    @staticmethod
    def create_api_response(success: bool, data: Any = None, source: str = 'database', 
                          error: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """Create standardized API response"""
        response = {
            'success': success,
            'source': source
        }
        
        if success:
            if isinstance(data, list):
                response['count'] = len(data)
            response.update(kwargs)
            if data is not None:
                response.update(data if isinstance(data, dict) else {'data': data})
        else:
            response['error'] = error or 'Unknown error occurred'
        
        return response
