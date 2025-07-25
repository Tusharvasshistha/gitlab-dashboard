from flask import Flask, render_template, request, jsonify, session
import requests
import os
from datetime import datetime
import logging
import asyncio
from database import GitLabDatabase
from sync_service import GitLabSyncService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')

# Initialize database and sync service
db = GitLabDatabase()
sync_service = GitLabSyncService(db)

class GitLabAPI:
    def __init__(self, base_url, access_token):
        self.base_url = base_url.rstrip('/')
        self.access_token = access_token
        self.headers = {
            'Private-Token': access_token,
            'Content-Type': 'application/json'
        }
    
    def make_request(self, endpoint, params=None):
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
    
    def test_connection(self):
        """Test the GitLab connection"""
        try:
            # Try to get current user info to test the connection
            url = f"{self.base_url}/api/v4/user"
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            user_data = response.json()
            return {'success': True, 'message': f'Connection successful! Authenticated as: {user_data.get("name", "Unknown")}'}
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
    
    def get_groups(self, top_level_only=True, per_page=100):
        """Get all groups"""
        try:
            params = {'per_page': per_page}
            if top_level_only:
                params['top_level_only'] = 'true'
            groups = self.make_request('/groups', params)
            return {'success': True, 'groups': groups}
        except Exception as e:
            return {'success': False, 'error': str(e), 'groups': []}
    
    def get_subgroups(self, group_id, per_page=100):
        """Get subgroups for a specific group"""
        try:
            params = {'per_page': per_page}
            subgroups = self.make_request(f'/groups/{group_id}/subgroups', params)
            return {'success': True, 'subgroups': subgroups}
        except Exception as e:
            return {'success': False, 'error': str(e), 'subgroups': []}
    
    def get_group_projects(self, group_id, include_subgroups=False, per_page=100):
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
    
    def get_project_details(self, project_id):
        """Get detailed information about a specific project"""
        try:
            project = self.make_request(f'/projects/{project_id}')
            return {'success': True, 'project': project}
        except Exception as e:
            return {'success': False, 'error': str(e), 'project': None}
    
    def search_projects(self, search_term, per_page=20):
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
    
    def get_project_pipelines(self, project_id, per_page=20):
        """Get pipelines for a specific project"""
        try:
            params = {'per_page': per_page}
            pipelines = self.make_request(f'/projects/{project_id}/pipelines', params)
            return {'success': True, 'pipelines': pipelines}
        except Exception as e:
            return {'success': False, 'error': str(e), 'pipelines': []}
    
    def get_project_branches(self, project_id, per_page=50):
        """Get branches for a specific project"""
        try:
            params = {'per_page': per_page}
            branches = self.make_request(f'/projects/{project_id}/repository/branches', params)
            return {'success': True, 'branches': branches}
        except Exception as e:
            return {'success': False, 'error': str(e), 'branches': []}
    
    def get_pipeline_details(self, project_id, pipeline_id):
        """Get detailed information about a specific pipeline"""
        try:
            pipeline = self.make_request(f'/projects/{project_id}/pipelines/{pipeline_id}')
            return {'success': True, 'pipeline': pipeline}
        except Exception as e:
            return {'success': False, 'error': str(e), 'pipeline': None}
    
    def get_branch_details(self, project_id, branch_name):
        """Get detailed information about a specific branch"""
        try:
            from urllib.parse import quote
            encoded_branch = quote(branch_name, safe='')
            branch = self.make_request(f'/projects/{project_id}/repository/branches/{encoded_branch}')
            return {'success': True, 'branch': branch}
        except Exception as e:
            return {'success': False, 'error': str(e), 'branch': None}

def get_gitlab_api():
    """Get GitLab API instance from session or database"""
    # First try session
    gitlab_url = session.get('gitlab_url')
    access_token = session.get('gitlab_access_token')
    
    # If not in session, try database
    if not gitlab_url or not access_token:
        config = db.get_config()
        if config:
            gitlab_url = config['gitlab_url']
            access_token = config['access_token']
            # Update session for future requests
            session['gitlab_url'] = gitlab_url
            session['gitlab_access_token'] = access_token
    
    if gitlab_url and access_token:
        return GitLabAPI(gitlab_url, access_token)
    
    return None

@app.route('/')
def index():
    """Serve the main dashboard page"""
    return render_template('index.html')

@app.route('/api/config', methods=['POST'])
def save_config():
    """Save GitLab configuration"""
    try:
        data = request.get_json()
        gitlab_url = data.get('gitlab_url')
        access_token = data.get('access_token')
        
        if not gitlab_url or not access_token:
            return jsonify({'error': 'GitLab URL and Access Token are required'}), 400
        
        # Test the connection
        gitlab_api = GitLabAPI(gitlab_url, access_token)
        test_result = gitlab_api.test_connection()
        
        if not test_result['success']:
            return jsonify({'error': f'Failed to connect to GitLab: {test_result["error"]}'}), 400
        
        # Save to session
        session['gitlab_url'] = gitlab_url
        session['gitlab_access_token'] = access_token
        
        # Save to database
        db.save_config(gitlab_url, access_token)
        
        # Set up sync service
        sync_service.set_gitlab_api(gitlab_api)
        
        # Check if database is empty - if so, trigger an initial sync
        stats = db.get_dashboard_stats()
        if stats['total_groups'] == 0 and stats['total_projects'] == 0:
            try:
                # Trigger initial sync in background
                logger.info("Database is empty, triggering initial sync...")
                
                # Simple sync - just get groups first
                groups_result = gitlab_api.get_groups()
                if groups_result['success']:
                    db.save_groups(groups_result['groups'])
                    logger.info(f"Saved {len(groups_result['groups'])} groups to database")
                    
                    # Get projects for each group and sync their pipelines/branches
                    for group in groups_result['groups'][:3]:  # Limit to first 3 groups for speed
                        try:
                            projects_result = gitlab_api.get_group_projects(group['id'])
                            if projects_result['success']:
                                db.save_projects(projects_result['projects'], group['id'])
                                logger.info(f"Saved {len(projects_result['projects'])} projects for group {group['name']}")
                                
                                # Sync pipelines and branches for each project (limit to first 2 projects per group)
                                for project in projects_result['projects'][:2]:
                                    try:
                                        # Sync pipelines
                                        pipelines_result = gitlab_api.get_project_pipelines(project['id'])
                                        if pipelines_result['success'] and pipelines_result['pipelines']:
                                            db.save_pipelines(pipelines_result['pipelines'], project['id'])
                                            logger.info(f"Saved {len(pipelines_result['pipelines'])} pipelines for project {project['name']}")
                                        
                                        # Sync branches
                                        branches_result = gitlab_api.get_project_branches(project['id'])
                                        if branches_result['success'] and branches_result['branches']:
                                            db.save_branches(branches_result['branches'], project['id'])
                                            logger.info(f"Saved {len(branches_result['branches'])} branches for project {project['name']}")
                                            
                                    except Exception as e:
                                        logger.warning(f"Failed to sync pipelines/branches for project {project['id']}: {str(e)}")
                                        continue
                                        
                        except Exception as e:
                            logger.warning(f"Failed to sync projects for group {group['id']}: {str(e)}")
                            continue
                
                return jsonify({
                    'message': 'Configuration saved and initial data synchronized successfully',
                    'initial_sync': True
                })
                        
            except Exception as sync_error:
                logger.warning(f"Initial sync failed, but configuration saved: {str(sync_error)}")
                return jsonify({
                    'message': 'Configuration saved successfully. Use Sync button to load data.',
                    'initial_sync': False,
                    'sync_error': str(sync_error)
                })
        else:
            return jsonify({
                'message': 'Configuration saved successfully',
                'initial_sync': False
            })
        
    except Exception as e:
        logger.error(f"Error saving configuration: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/groups')
def get_groups():
    """Get all groups from database"""
    try:
        # Get groups from database
        groups = db.get_groups()
        
        # Convert database format to API format
        formatted_groups = []
        for group in groups:
            if group.get('gitlab_data'):
                import json
                gitlab_data = json.loads(group['gitlab_data'])
                formatted_groups.append(gitlab_data)
            else:
                # Fallback to basic data
                formatted_groups.append({
                    'id': group['id'],
                    'name': group['name'],
                    'full_name': group.get('full_name', ''),
                    'path': group.get('path', ''),
                    'full_path': group.get('full_path', ''),
                    'description': group.get('description', ''),
                    'visibility': group.get('visibility', ''),
                    'avatar_url': group.get('avatar_url', ''),
                    'web_url': group.get('web_url', '')
                })
        
        return jsonify({
            'success': True,
            'groups': formatted_groups,
            'source': 'database'
        })
        
    except Exception as e:
        logger.error(f"Error fetching groups from database: {str(e)}")
        
        # Fallback to API if database fails
        try:
            gitlab_api = get_gitlab_api()
            if not gitlab_api:
                return jsonify({'error': 'GitLab not configured and no cached data available'}), 400
            
            result = gitlab_api.get_groups()
            if result['success']:
                # Save to database for next time
                db.save_groups(result['groups'])
            return jsonify({**result, 'source': 'api_fallback'})
            
        except Exception as api_error:
            logger.error(f"API fallback also failed: {str(api_error)}")
            return jsonify({'error': f'Database error: {str(e)}, API fallback error: {str(api_error)}'}), 500

@app.route('/api/groups/<int:group_id>/subgroups')
def get_subgroups(group_id):
    """Get subgroups for a group from database"""
    try:
        # Get subgroups from database
        subgroups = db.get_subgroups(group_id)
        
        # Convert database format to API format
        formatted_subgroups = []
        for subgroup in subgroups:
            if subgroup.get('gitlab_data'):
                import json
                gitlab_data = json.loads(subgroup['gitlab_data'])
                formatted_subgroups.append(gitlab_data)
            else:
                # Fallback to basic data
                formatted_subgroups.append({
                    'id': subgroup['id'],
                    'name': subgroup['name'],
                    'full_name': subgroup.get('full_name', ''),
                    'path': subgroup.get('path', ''),
                    'full_path': subgroup.get('full_path', ''),
                    'description': subgroup.get('description', ''),
                    'visibility': subgroup.get('visibility', ''),
                    'avatar_url': subgroup.get('avatar_url', ''),
                    'web_url': subgroup.get('web_url', ''),
                    'parent_id': subgroup.get('parent_id')
                })
        
        return jsonify({
            'success': True,
            'subgroups': formatted_subgroups,
            'source': 'database'
        })
        
    except Exception as e:
        logger.error(f"Error fetching subgroups from database: {str(e)}")
        
        # Fallback to API if database fails
        try:
            gitlab_api = get_gitlab_api()
            if not gitlab_api:
                return jsonify({'error': 'GitLab not configured and no cached data available'}), 400
            
            result = gitlab_api.get_subgroups(group_id)
            return jsonify({**result, 'source': 'api_fallback'})
            
        except Exception as api_error:
            logger.error(f"API fallback also failed: {str(api_error)}")
            return jsonify({'error': f'Database error: {str(e)}, API fallback error: {str(api_error)}'}), 500

@app.route('/api/groups/<int:group_id>/projects')
def get_group_projects(group_id):
    """Get projects for a group from database"""
    try:
        # Get projects from database
        projects = db.get_projects(group_id)
        
        # Convert database format to API format
        formatted_projects = []
        for project in projects:
            if project.get('gitlab_data'):
                import json
                gitlab_data = json.loads(project['gitlab_data'])
                formatted_projects.append(gitlab_data)
            else:
                # Fallback to basic data
                formatted_projects.append({
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
                })
        
        return jsonify({
            'success': True,
            'projects': formatted_projects,
            'source': 'database'
        })
        
    except Exception as e:
        logger.error(f"Error fetching projects from database: {str(e)}")
        
        # Fallback to API if database fails
        try:
            gitlab_api = get_gitlab_api()
            if not gitlab_api:
                return jsonify({'error': 'GitLab not configured and no cached data available'}), 400
            
            result = gitlab_api.get_group_projects(group_id)
            return jsonify({**result, 'source': 'api_fallback'})
            
        except Exception as api_error:
            logger.error(f"API fallback also failed: {str(api_error)}")
            return jsonify({'error': f'Database error: {str(e)}, API fallback error: {str(api_error)}'}), 500

@app.route('/api/projects/<int:project_id>')
def get_project_details(project_id):
    """Get project details from database"""
    try:
        # Get project from database
        project = db.get_project(project_id)
        
        if project:
            if project.get('gitlab_data'):
                import json
                gitlab_data = json.loads(project['gitlab_data'])
                return jsonify({
                    'success': True,
                    'project': gitlab_data,
                    'source': 'database'
                })
            else:
                # Fallback to basic data
                basic_project = {
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
                return jsonify({
                    'success': True,
                    'project': basic_project,
                    'source': 'database'
                })
        
        # If not found in database, try API
        gitlab_api = get_gitlab_api()
        if not gitlab_api:
            return jsonify({'error': 'Project not found in database and GitLab not configured'}), 404
        
        result = gitlab_api.get_project_details(project_id)
        return jsonify({**result, 'source': 'api_fallback'})
        
    except Exception as e:
        logger.error(f"Error fetching project details: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<int:project_id>/pipelines')
def get_project_pipelines(project_id):
    """Get project pipelines from database"""
    try:
        # Get pipelines from database
        pipelines = db.get_pipelines(project_id)
        
        # If no pipelines in database, try API
        if not pipelines:
            logger.info(f"No pipelines found in database for project {project_id}, trying API...")
            gitlab_api = get_gitlab_api()
            if gitlab_api:
                try:
                    api_result = gitlab_api.get_project_pipelines(project_id)
                    if api_result['success'] and api_result['pipelines']:
                        # Save to database for future use
                        db.save_pipelines(api_result['pipelines'], project_id)
                        return jsonify({
                            'success': True,
                            'pipelines': api_result['pipelines'],
                            'source': 'api_live'
                        })
                except Exception as api_error:
                    logger.warning(f"API fallback failed: {str(api_error)}")
        
        # Convert database format to API format
        formatted_pipelines = []
        for pipeline in pipelines:
            if pipeline.get('gitlab_data'):
                import json
                gitlab_data = json.loads(pipeline['gitlab_data'])
                formatted_pipelines.append(gitlab_data)
            else:
                # Fallback to basic data
                formatted_pipelines.append({
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
                })
        
        return jsonify({
            'success': True,
            'pipelines': formatted_pipelines,
            'source': 'database'
        })
        
    except Exception as e:
        logger.error(f"Error fetching pipelines from database: {str(e)}")
        
        # Fallback to API if database fails
        try:
            gitlab_api = get_gitlab_api()
            if not gitlab_api:
                return jsonify({'error': 'GitLab not configured and no cached data available'}), 400
            
            result = gitlab_api.get_project_pipelines(project_id)
            if result['success']:
                # Save to database for next time
                try:
                    db.save_pipelines(result['pipelines'], project_id)
                except Exception as save_error:
                    logger.warning(f"Failed to save pipelines to database: {str(save_error)}")
            return jsonify({**result, 'source': 'api_fallback'})
            
        except Exception as api_error:
            logger.error(f"API fallback also failed: {str(api_error)}")
            return jsonify({'error': f'Database error: {str(e)}, API fallback error: {str(api_error)}'}), 500

@app.route('/api/projects/<int:project_id>/branches')
def get_project_branches(project_id):
    """Get project branches from database"""
    try:
        # Get branches from database
        branches = db.get_branches(project_id)
        
        # If no branches in database, try API
        if not branches:
            logger.info(f"No branches found in database for project {project_id}, trying API...")
            gitlab_api = get_gitlab_api()
            if gitlab_api:
                try:
                    api_result = gitlab_api.get_project_branches(project_id)
                    if api_result['success'] and api_result['branches']:
                        # Save to database for future use
                        db.save_branches(api_result['branches'], project_id)
                        return jsonify({
                            'success': True,
                            'branches': api_result['branches'],
                            'source': 'api_live'
                        })
                except Exception as api_error:
                    logger.warning(f"API fallback failed: {str(api_error)}")
        
        # Convert database format to API format
        formatted_branches = []
        for branch in branches:
            if branch.get('gitlab_data'):
                import json
                gitlab_data = json.loads(branch['gitlab_data'])
                formatted_branches.append(gitlab_data)
            else:
                # Fallback to basic data
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
                
                formatted_branches.append({
                    'name': branch.get('name', ''),
                    'merged': branch.get('merged', False),
                    'protected': branch.get('protected', False),
                    'default': branch.get('default_branch', False),
                    'developers_can_push': branch.get('developers_can_push', False),
                    'developers_can_merge': branch.get('developers_can_merge', False),
                    'can_push': branch.get('can_push', False),
                    'web_url': branch.get('web_url', ''),
                    'commit': commit_data
                })
        
        return jsonify({
            'success': True,
            'branches': formatted_branches,
            'source': 'database'
        })
        
    except Exception as e:
        logger.error(f"Error fetching branches from database: {str(e)}")
        
        # Fallback to API if database fails
        try:
            gitlab_api = get_gitlab_api()
            if not gitlab_api:
                return jsonify({'error': 'GitLab not configured and no cached data available'}), 400
            
            result = gitlab_api.get_project_branches(project_id)
            if result['success']:
                # Save to database for next time
                try:
                    db.save_branches(result['branches'], project_id)
                except Exception as save_error:
                    logger.warning(f"Failed to save branches to database: {str(save_error)}")
            return jsonify({**result, 'source': 'api_fallback'})
            
        except Exception as api_error:
            logger.error(f"API fallback also failed: {str(api_error)}")
            return jsonify({'error': f'Database error: {str(e)}, API fallback error: {str(api_error)}'}), 500

@app.route('/api/projects/<int:project_id>/pipelines/<int:pipeline_id>')
def get_pipeline_details(project_id, pipeline_id):
    """Get detailed information about a specific pipeline"""
    try:
        gitlab_api = get_gitlab_api()
        if not gitlab_api:
            return jsonify({'error': 'GitLab configuration not found'}), 401
        
        pipeline = gitlab_api.get_pipeline_details(project_id, pipeline_id)
        
        return jsonify(pipeline)
    
    except Exception as e:
        logger.error(f"Error fetching pipeline {pipeline_id} for project {project_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<int:project_id>/branches/<path:branch_name>')
def get_branch_details(project_id, branch_name):
    """Get detailed information about a specific branch"""
    try:
        gitlab_api = get_gitlab_api()
        if not gitlab_api:
            return jsonify({'error': 'GitLab configuration not found'}), 401
        
        branch = gitlab_api.get_branch_details(project_id, branch_name)
        
        return jsonify(branch)
    
    except Exception as e:
        logger.error(f"Error fetching branch {branch_name} for project {project_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/search/projects')
def search_projects():
    """Search projects from database"""
    try:
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'error': 'Search query is required'}), 400
        
        # Search in database
        projects = db.search_projects(query)
        
        # Convert database format to API format
        formatted_projects = []
        for project in projects:
            if project.get('gitlab_data'):
                import json
                gitlab_data = json.loads(project['gitlab_data'])
                formatted_projects.append(gitlab_data)
            else:
                # Fallback to basic data
                formatted_projects.append({
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
                })
        
        return jsonify({
            'success': True,
            'projects': formatted_projects,
            'count': len(formatted_projects),
            'query': query,
            'source': 'database'
        })
        
    except Exception as e:
        logger.error(f"Error searching projects: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard/stats')
def get_dashboard_stats():
    """Get dashboard statistics from database"""
    try:
        stats = db.get_dashboard_stats()
        return jsonify(stats)
        
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    try:
        # Check if configuration exists in database
        config = db.get_config()
        
        # Check if session exists
        session_configured = 'gitlab_url' in session and 'gitlab_access_token' in session
        
        return jsonify({
            'status': 'healthy',
            'configured': config is not None or session_configured,
            'database_config': config is not None,
            'session_config': session_configured
        })
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'configured': False
        }), 500

@app.route('/api/sync/full', methods=['POST'])
def trigger_full_sync():
    """Trigger a full synchronization of all GitLab data"""
    try:
        gitlab_api = get_gitlab_api()
        if not gitlab_api:
            return jsonify({'error': 'GitLab not configured'}), 400
        
        sync_service.set_gitlab_api(gitlab_api)
        
        # Run sync in background (for demo, we'll run synchronously)
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        sync_results = loop.run_until_complete(sync_service.full_sync())
        loop.close()
        
        return jsonify({
            'message': 'Full synchronization completed',
            'results': sync_results
        })
        
    except Exception as e:
        logger.error(f"Full sync failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/sync/project/<int:project_id>', methods=['POST'])
def trigger_project_sync(project_id):
    """Trigger synchronization for a specific project"""
    try:
        gitlab_api = get_gitlab_api()
        if not gitlab_api:
            return jsonify({'error': 'GitLab not configured'}), 400
        
        sync_service.set_gitlab_api(gitlab_api)
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        sync_results = loop.run_until_complete(sync_service.sync_single_project(project_id))
        loop.close()
        
        return jsonify({
            'message': f'Project {project_id} synchronization completed',
            'results': sync_results
        })
        
    except Exception as e:
        logger.error(f"Project sync failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/sync/status')
def get_sync_status():
    """Get synchronization status"""
    try:
        status = sync_service.get_sync_status()
        return jsonify(status)
        
    except Exception as e:
        logger.error(f"Failed to get sync status: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Development server
    app.run(debug=True, host='0.0.0.0', port=5000)
