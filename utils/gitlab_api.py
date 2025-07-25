"""
GitLab API Utility
Handles all GitLab API interactions and authentication
"""
import requests
import logging
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

class GitLabAPI:
    """GitLab API client utility"""
    
    def __init__(self, base_url: str, access_token: str):
        self.base_url = base_url.rstrip('/')
        self.access_token = access_token
        self.headers = {
            'Private-Token': access_token,
            'Content-Type': 'application/json'
        }
    
    def make_request(self, endpoint: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Make a request to GitLab API"""
        url = f"{self.base_url}/api/v4{endpoint}"
        try:
            response = requests.get(url, headers=self.headers, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                error_msg = f"Authentication failed for {endpoint}. Please check your GitLab access token."
            elif e.response.status_code == 403:
                error_msg = f"Access forbidden for {endpoint}. Your token doesn't have sufficient permissions."
            elif e.response.status_code == 404:
                error_msg = f"Resource not found: {endpoint}. Please check if the resource exists."
            else:
                error_msg = f"HTTP Error {e.response.status_code} for {endpoint}: {str(e)}"
            logger.error(f"API request failed: {error_msg}")
            raise Exception(error_msg)
        except requests.exceptions.RequestException as e:
            error_msg = f"API request failed for {endpoint}: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
    
    def test_connection(self) -> Dict[str, Any]:
        """Test the GitLab connection"""
        try:
            url = f"{self.base_url}/api/v4/user"
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            user_data = response.json()
            return {
                'success': True, 
                'message': f'Connection successful! Authenticated as: {user_data.get("name", "Unknown")}'
            }
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                error_msg = "Authentication failed. Please check your GitLab access token. Make sure it's a valid Personal Access Token with 'api' scope."
            elif e.response.status_code == 403:
                error_msg = "Access forbidden. Your token doesn't have sufficient permissions. Ensure it has 'api' scope."
            else:
                error_msg = f"HTTP Error {e.response.status_code}: {str(e)}"
            logger.error(f"Connection test failed: {error_msg}")
            return {'success': False, 'error': error_msg}
        except requests.exceptions.RequestException as e:
            error_msg = f"Connection failed: {str(e)}. Please check your GitLab URL and network connection."
            logger.error(f"Connection test failed: {error_msg}")
            return {'success': False, 'error': error_msg}
    
    def get_groups(self, top_level_only: bool = True, per_page: int = 100) -> Dict[str, Any]:
        """Get all groups"""
        try:
            params = {'per_page': per_page}
            if top_level_only:
                params['top_level_only'] = 'true'
            groups = self.make_request('/groups', params)
            return {'success': True, 'groups': groups}
        except Exception as e:
            return {'success': False, 'error': str(e), 'groups': []}
    
    def get_subgroups(self, group_id: int, per_page: int = 100) -> Dict[str, Any]:
        """Get subgroups for a specific group"""
        try:
            params = {'per_page': per_page}
            subgroups = self.make_request(f'/groups/{group_id}/subgroups', params)
            return {'success': True, 'subgroups': subgroups}
        except Exception as e:
            return {'success': False, 'error': str(e), 'subgroups': []}
    
    def get_group_projects(self, group_id: int, include_subgroups: bool = False, per_page: int = 100) -> Dict[str, Any]:
        """Get projects for a specific group"""
        try:
            params = {
                'per_page': per_page,
                'include_subgroups': str(include_subgroups).lower()
            }
            projects = self.make_request(f'/groups/{group_id}/projects', params)
            return {'success': True, 'projects': projects}
        except Exception as e:
            return {'success': False, 'error': str(e), 'projects': []}
    
    def get_project_details(self, project_id: int) -> Dict[str, Any]:
        """Get detailed information about a specific project"""
        try:
            project = self.make_request(f'/projects/{project_id}')
            return {'success': True, 'project': project}
        except Exception as e:
            return {'success': False, 'error': str(e), 'project': None}
    
    def search_projects(self, search_term: str, per_page: int = 20) -> Dict[str, Any]:
        """Search for projects"""
        try:
            params = {
                'search': search_term,
                'per_page': per_page
            }
            projects = self.make_request('/projects', params)
            return {'success': True, 'projects': projects, 'count': len(projects)}
        except Exception as e:
            return {'success': False, 'error': str(e), 'projects': [], 'count': 0}
    
    def get_project_pipelines(self, project_id: int, per_page: int = 20) -> Dict[str, Any]:
        """Get pipelines for a specific project"""
        try:
            params = {'per_page': per_page}
            pipelines = self.make_request(f'/projects/{project_id}/pipelines', params)
            return {'success': True, 'pipelines': pipelines}
        except Exception as e:
            return {'success': False, 'error': str(e), 'pipelines': []}
    
    def get_project_branches(self, project_id: int, per_page: int = 50) -> Dict[str, Any]:
        """Get branches for a specific project"""
        try:
            params = {'per_page': per_page}
            branches = self.make_request(f'/projects/{project_id}/repository/branches', params)
            return {'success': True, 'branches': branches}
        except Exception as e:
            return {'success': False, 'error': str(e), 'branches': []}
    
    def get_pipeline_details(self, project_id: int, pipeline_id: int) -> Dict[str, Any]:
        """Get detailed information about a specific pipeline"""
        try:
            pipeline = self.make_request(f'/projects/{project_id}/pipelines/{pipeline_id}')
            return {'success': True, 'pipeline': pipeline}
        except Exception as e:
            return {'success': False, 'error': str(e), 'pipeline': None}
    
    def get_branch_details(self, project_id: int, branch_name: str) -> Dict[str, Any]:
        """Get detailed information about a specific branch"""
        try:
            from urllib.parse import quote
            encoded_branch = quote(branch_name, safe='')
            branch = self.make_request(f'/projects/{project_id}/repository/branches/{encoded_branch}')
            return {'success': True, 'branch': branch}
        except Exception as e:
            return {'success': False, 'error': str(e), 'branch': None}
