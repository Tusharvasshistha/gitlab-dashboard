"""
Response Utilities
Handles API response formatting and data processing
"""
import logging
from typing import Dict, Any, List, Optional, Union
from utils.data_transformer import DataTransformer
from utils.error_handler import ErrorHandler

logger = logging.getLogger(__name__)

class ResponseHelper:
    """Utility for handling API responses and data processing"""
    
    def __init__(self, database, gitlab_api_factory):
        self.database = database
        self.gitlab_api_factory = gitlab_api_factory
    
    def get_with_fallback(self, db_method, api_method, transform_method, 
                         api_save_method=None, *args, **kwargs):
        """
        Generic method to get data from database with API fallback
        
        Args:
            db_method: Database method to call
            api_method: API method to call as fallback
            transform_method: Method to transform database data
            api_save_method: Optional method to save API data to database
            *args, **kwargs: Arguments to pass to methods
        """
        try:
            # Try database first
            db_data = db_method(*args, **kwargs)
            
            if db_data:
                formatted_data = transform_method(db_data)
                return ErrorHandler.create_success_response(
                    formatted_data, 
                    source='database'
                )
            
            # If no data in database, try API
            gitlab_api = self.gitlab_api_factory()
            if not gitlab_api:
                return ErrorHandler.create_error_response(
                    'GitLab not configured and no cached data available',
                    400
                )
            
            api_result = api_method(gitlab_api, *args, **kwargs)
            
            # Handle the API result format
            if isinstance(api_result, dict) and api_result.get('success'):
                api_data = []  # Default to empty list
                if 'groups' in api_result:
                    api_data = api_result['groups'] or []
                elif 'subgroups' in api_result:
                    api_data = api_result['subgroups'] or []
                elif 'projects' in api_result:
                    api_data = api_result['projects'] or []
                elif 'pipelines' in api_result:
                    api_data = api_result['pipelines'] or []
                elif 'branches' in api_result:
                    api_data = api_result['branches'] or []
                
                # Save to database if successful and save method provided
                # Temporarily disabled to fix lambda argument errors
                # if api_save_method and api_data:
                #     try:
                #         api_save_method(api_data)
                #     except Exception as save_error:
                #         logger.warning(f"Failed to save API data to database: {str(save_error)}")
                
                return ErrorHandler.create_success_response(
                    transform_method(api_data),
                    source='api_live'
                )
            else:
                return ErrorHandler.create_success_response(
                    {},
                    source='api_error'
                )
            
        except Exception as e:
            logger.error(f"Error in get_with_fallback: {str(e)}")
            return ErrorHandler.create_error_response(str(e))
    
    def handle_groups_request(self):
        """Handle groups API request with database fallback"""
        return self.get_with_fallback(
            self.database.get_groups,
            lambda api: api.get_groups(),
            lambda data: {'groups': DataTransformer.format_groups_from_db(data)},
            lambda data, *args, **kwargs: self.database.save_groups(data)
        )
    
    def handle_subgroups_request(self, group_id: int):
        """Handle subgroups API request with database fallback"""
        return self.get_with_fallback(
            self.database.get_subgroups,
            lambda api, *args, **kwargs: api.get_subgroups(group_id),
            lambda data: {'subgroups': DataTransformer.format_groups_from_db(data or [])},
            None,
            group_id
        )
    
    def handle_projects_request(self, group_id: int):
        """Handle projects API request with database fallback"""
        return self.get_with_fallback(
            self.database.get_projects,
            lambda api, *args, **kwargs: api.get_group_projects(group_id),
            lambda data: {'projects': DataTransformer.format_projects_from_db(data)},
            lambda data, *args, **kwargs: self.database.save_projects(data, group_id),
            group_id
        )
    
    def handle_pipelines_request(self, project_id: int):
        """Handle pipelines API request with database fallback"""
        return self.get_with_fallback(
            self.database.get_pipelines,
            lambda api, *args, **kwargs: api.get_project_pipelines(project_id),
            lambda data: {'pipelines': DataTransformer.format_pipelines_from_db(data)},
            lambda data, *args, **kwargs: self.database.save_pipelines(data, project_id),
            project_id
        )
    
    def handle_branches_request(self, project_id: int):
        """Handle branches API request with database fallback"""
        return self.get_with_fallback(
            self.database.get_branches,
            lambda api, *args, **kwargs: api.get_project_branches(project_id),
            lambda data: {'branches': DataTransformer.format_branches_from_db(data)},
            lambda data, *args, **kwargs: self.database.save_branches(data, project_id),
            project_id
        )
    
    def handle_project_details_request(self, project_id: int):
        """Handle project details request with database fallback"""
        try:
            # Get project from database
            project = self.database.get_project(project_id)
            
            if project:
                if project.get('gitlab_data'):
                    import json
                    gitlab_data = json.loads(project['gitlab_data'])
                    return ErrorHandler.create_success_response(
                        {'project': gitlab_data},
                        source='database'
                    )
                else:
                    # Fallback to basic data
                    basic_project = DataTransformer._create_basic_project(project)
                    return ErrorHandler.create_success_response(
                        {'project': basic_project},
                        source='database'
                    )
            
            # If not found in database, try API
            gitlab_api = self.gitlab_api_factory()
            if not gitlab_api:
                return ErrorHandler.create_error_response(
                    'Project not found in database and GitLab not configured',
                    404
                )
            
            result = gitlab_api.get_project_details(project_id)
            return ErrorHandler.create_success_response(
                result,
                source='api_fallback'
            )
            
        except Exception as e:
            logger.error(f"Error fetching project details: {str(e)}")
            return ErrorHandler.create_error_response(str(e))
    
    def handle_search_request(self, query: str):
        """Handle project search request"""
        try:
            if not query:
                return ErrorHandler.create_error_response(
                    'Search query is required',
                    400
                )
            
            # Search in database
            projects = self.database.search_projects(query)
            formatted_projects = DataTransformer.format_projects_from_db(projects)
            
            return ErrorHandler.create_success_response(
                {
                    'projects': formatted_projects,
                    'count': len(formatted_projects),
                    'query': query
                },
                source='database'
            )
            
        except Exception as e:
            logger.error(f"Error searching projects: {str(e)}")
            return ErrorHandler.create_error_response(str(e))
