from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import os
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Configuration
class Config:
    GITLAB_URL = os.getenv('GITLAB_URL', 'https://gitlab.com')
    GITLAB_TOKEN = os.getenv('GITLAB_TOKEN', '')

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'gitlab_configured': bool(Config.GITLAB_TOKEN)
    })

@app.route('/api/config', methods=['POST'])
def set_config():
    """Set GitLab configuration"""
    try:
        data = request.get_json()
        gitlab_url = data.get('gitlab_url', '').strip()
        access_token = data.get('access_token', '').strip()
        
        if not gitlab_url or not access_token:
            return jsonify({
                'success': False,
                'error': 'GitLab URL and access token are required'
            }), 400
        
        # Test the connection
        headers = {'Authorization': f'Bearer {access_token}'}
        test_url = f"{gitlab_url.rstrip('/')}/api/v4/user"
        
        response = requests.get(test_url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            # Update configuration
            Config.GITLAB_URL = gitlab_url.rstrip('/')
            Config.GITLAB_TOKEN = access_token
            
            user_data = response.json()
            return jsonify({
                'success': True,
                'message': 'Configuration saved successfully',
                'user': {
                    'username': user_data.get('username'),
                    'name': user_data.get('name'),
                    'email': user_data.get('email')
                }
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Invalid GitLab credentials. Status: {response.status_code}'
            }), 400
            
    except requests.RequestException as e:
        return jsonify({
            'success': False,
            'error': f'Connection error: {str(e)}'
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Configuration error: {str(e)}'
        }), 500

def get_all_paginated_data(url, headers, params=None, max_items=None):
    """Get all data from paginated GitLab API endpoint with optional limits"""
    all_data = []
    page = 1
    
    if params is None:
        params = {}
    
    while True:
        current_params = {**params, 'page': page, 'per_page': 100}
        
        try:
            response = requests.get(url, headers=headers, params=current_params, timeout=30)
            
            if response.status_code != 200:
                logger.warning(f"Failed to fetch page {page} from {url}: {response.status_code}")
                break
            
            data = response.json()
            
            if not data or len(data) == 0:
                # No more data
                break
            
            all_data.extend(data)
            
            # Check max_items limit
            if max_items and len(all_data) >= max_items:
                all_data = all_data[:max_items]
                logger.info(f"Reached max_items limit ({max_items}) for {url}")
                break
            
            # Check if we got less than per_page items (last page)
            if len(data) < 100:
                break
                
            page += 1
            
            # Safety check to prevent infinite loops (reduced for performance)
            if page > 20:  # Max 2000 items instead of 5000
                logger.warning(f"Reached maximum page limit for {url}")
                break
                
        except Exception as e:
            logger.error(f"Error fetching page {page} from {url}: {str(e)}")
            break
    
    logger.info(f"Fetched {len(all_data)} total items from {url}")
    return all_data

@app.route('/api/groups', methods=['GET'])
def get_groups():
    """Get all GitLab groups with optional hierarchy"""
    try:
        if not Config.GITLAB_TOKEN:
            return jsonify({
                'success': False,
                'error': 'GitLab not configured'
            }), 400
        
        headers = {'Authorization': f'Bearer {Config.GITLAB_TOKEN}'}
        
        # Check if we should load full hierarchy or just top-level
        load_hierarchy = request.args.get('hierarchy', 'false').lower() == 'true'
        
        # Get ALL top-level groups with pagination
        url = f"{Config.GITLAB_URL}/api/v4/groups"
        params = {
            'statistics': 'true',
            'with_custom_attributes': 'true',
            'top_level_only': 'true'  # Only get top-level groups
        }
        
        groups = get_all_paginated_data(url, headers, params)
        
        if groups:
            # Only build full hierarchy if requested (for performance)
            if load_hierarchy:
                logger.info("Loading full hierarchy - this may take longer...")
                for group in groups:
                    group['subgroups'] = get_group_subgroups(group['id'], headers)
                    group['level'] = 0  # Mark as top-level
            else:
                # Just add basic info for fast loading
                for group in groups:
                    group['subgroups'] = []  # Empty for now, load on demand
                    group['level'] = 0
                    group['has_subgroups'] = True  # We'll check this dynamically
            
            return jsonify({
                'success': True,
                'groups': groups,
                'count': len(groups),
                'hierarchy_loaded': load_hierarchy
            })
        else:
            return jsonify({
                'success': False,
                'error': 'No groups found or failed to fetch groups'
            }), 404
            
    except Exception as e:
        logger.error(f"Error fetching groups: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error fetching groups: {str(e)}'
        }), 500

def get_group_subgroups(group_id, headers, level=1, max_depth=3):
    """Recursively get ALL subgroups for a group with pagination"""
    if level > max_depth:  # Prevent infinite recursion
        return []
    
    try:
        url = f"{Config.GITLAB_URL}/api/v4/groups/{group_id}/subgroups"
        params = {
            'statistics': 'true'
        }
        
        # Get ALL subgroups with pagination
        subgroups = get_all_paginated_data(url, headers, params)
        
        if subgroups:
            # Recursively get subgroups for each subgroup
            for subgroup in subgroups:
                subgroup['subgroups'] = get_group_subgroups(subgroup['id'], headers, level + 1, max_depth)
                subgroup['level'] = level
                subgroup['parent_id'] = group_id
            
            return subgroups
        else:
            return []
            
    except Exception as e:
        logger.error(f"Error fetching subgroups for group {group_id}: {str(e)}")
        return []

@app.route('/api/groups/<int:group_id>/subgroups', methods=['GET'])
def get_group_subgroups_endpoint(group_id):
    """Get subgroups for a specific group"""
    try:
        if not Config.GITLAB_TOKEN:
            return jsonify({
                'success': False,
                'error': 'GitLab not configured'
            }), 400
        
        headers = {'Authorization': f'Bearer {Config.GITLAB_TOKEN}'}
        subgroups = get_group_subgroups(group_id, headers)
        
        return jsonify({
            'success': True,
            'subgroups': subgroups,
            'count': len(subgroups)
        })
        
    except Exception as e:
        logger.error(f"Error fetching subgroups for group {group_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error fetching subgroups: {str(e)}'
        }), 500

@app.route('/api/groups/<int:group_id>/projects', methods=['GET'])
def get_group_projects(group_id):
    """Get ALL projects for a specific group with pagination"""
    try:
        if not Config.GITLAB_TOKEN:
            return jsonify({
                'success': False,
                'error': 'GitLab not configured'
            }), 400
        
        headers = {'Authorization': f'Bearer {Config.GITLAB_TOKEN}'}
        url = f"{Config.GITLAB_URL}/api/v4/groups/{group_id}/projects"
        
        params = {
            'include_subgroups': 'true'
        }
        
        # Get ALL projects with pagination
        projects = get_all_paginated_data(url, headers, params)
        
        return jsonify({
            'success': True,
            'projects': projects,
            'count': len(projects)
        })
            
    except Exception as e:
        logger.error(f"Error fetching projects for group {group_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error fetching projects: {str(e)}'
        }), 500

@app.route('/api/projects', methods=['GET'])
def get_all_projects():
    """Get ALL user's projects directly (faster than going through groups)"""
    try:
        if not Config.GITLAB_TOKEN:
            return jsonify({
                'success': False,
                'error': 'GitLab not configured'
            }), 400
        
        headers = {'Authorization': f'Bearer {Config.GITLAB_TOKEN}'}
        url = f"{Config.GITLAB_URL}/api/v4/projects"
        
        params = {
            'membership': 'true',  # Only projects user is a member of
            'statistics': 'true',
            'with_custom_attributes': 'true'
        }
        
        # Get ALL projects with pagination
        projects = get_all_paginated_data(url, headers, params)
        
        return jsonify({
            'success': True,
            'projects': projects,
            'count': len(projects)
        })
            
    except Exception as e:
        logger.error(f"Error fetching all projects: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error fetching projects: {str(e)}'
        }), 500

@app.route('/api/projects/<int:project_id>', methods=['GET'])
def get_project_details(project_id):
    """Get detailed information about a specific project"""
    try:
        if not Config.GITLAB_TOKEN:
            return jsonify({
                'success': False,
                'error': 'GitLab not configured'
            }), 400
        
        headers = {'Authorization': f'Bearer {Config.GITLAB_TOKEN}'}
        url = f"{Config.GITLAB_URL}/api/v4/projects/{project_id}"
        
        response = requests.get(url, headers=headers, timeout=30)
        
        if response.status_code == 200:
            project = response.json()
            return jsonify({
                'success': True,
                'project': project
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Failed to fetch project: {response.status_code}'
            }), response.status_code
            
    except Exception as e:
        logger.error(f"Error fetching project {project_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error fetching project: {str(e)}'
        }), 500

@app.route('/api/projects/<int:project_id>/pipelines', methods=['GET'])
def get_project_pipelines(project_id):
    """Get pipelines for a specific project with pagination"""
    try:
        if not Config.GITLAB_TOKEN:
            return jsonify({
                'success': False,
                'error': 'GitLab not configured'
            }), 400
        
        headers = {'Authorization': f'Bearer {Config.GITLAB_TOKEN}'}
        url = f"{Config.GITLAB_URL}/api/v4/projects/{project_id}/pipelines"
        
        params = {
            'order_by': 'updated_at',
            'sort': 'desc'
        }
        
        # Get ALL pipelines with pagination (but limit to reasonable amount)
        pipelines = get_all_paginated_data(url, headers, params)
        
        # Limit to most recent 100 pipelines for performance
        pipelines = pipelines[:100] if len(pipelines) > 100 else pipelines
        
        return jsonify({
            'success': True,
            'pipelines': pipelines,
            'count': len(pipelines)
        })
            
    except Exception as e:
        logger.error(f"Error fetching pipelines for project {project_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error fetching pipelines: {str(e)}'
        }), 500

@app.route('/api/search/projects', methods=['GET'])
def search_projects():
    """Search for ALL projects with pagination"""
    try:
        if not Config.GITLAB_TOKEN:
            return jsonify({
                'success': False,
                'error': 'GitLab not configured'
            }), 400
        
        search_term = request.args.get('q', '').strip()
        if not search_term:
            return jsonify({
                'success': False,
                'error': 'Search term is required'
            }), 400
        
        headers = {'Authorization': f'Bearer {Config.GITLAB_TOKEN}'}
        url = f"{Config.GITLAB_URL}/api/v4/projects"
        
        params = {
            'search': search_term
        }
        
        # Get ALL matching projects with pagination
        projects = get_all_paginated_data(url, headers, params)
        
        return jsonify({
            'success': True,
            'projects': projects,
            'count': len(projects)
        })
            
    except Exception as e:
        logger.error(f"Error searching projects: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Search error: {str(e)}'
        }), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get overall statistics (optimized for speed)"""
    try:
        if not Config.GITLAB_TOKEN:
            return jsonify({
                'success': False,
                'error': 'GitLab not configured'
            }), 400
        
        headers = {'Authorization': f'Bearer {Config.GITLAB_TOKEN}'}
        
        # Get basic counts faster - limit to first few pages for speed
        # Top-level groups (fast)
        groups_url = f"{Config.GITLAB_URL}/api/v4/groups"
        groups_params = {'top_level_only': 'true'}
        all_groups = get_all_paginated_data(groups_url, headers, groups_params, max_items=500)
        
        # All projects (fast - directly from user's accessible projects)
        projects_url = f"{Config.GITLAB_URL}/api/v4/projects"
        projects_params = {'membership': 'true'}
        all_projects = get_all_paginated_data(projects_url, headers, projects_params, max_items=1000)
        
        # Count subgroups from a sample (not all - for performance)
        total_subgroups = 0
        sample_groups = all_groups[:10]  # Only check first 10 groups for performance
        for group in sample_groups:
            subgroups_count = count_direct_subgroups(group['id'], headers)
            total_subgroups += subgroups_count
        
        # Estimate total subgroups if we have more groups
        if len(all_groups) > 10:
            avg_subgroups = total_subgroups / 10 if sample_groups else 0
            estimated_total = int(avg_subgroups * len(all_groups))
            total_subgroups = estimated_total
        
        return jsonify({
            'success': True,
            'total_groups': len(all_groups),
            'total_subgroups': total_subgroups,
            'total_projects': len(all_projects),
            'last_updated': datetime.now().isoformat(),
            'note': 'Optimized for speed - subgroup count may be estimated'
        })
        
    except Exception as e:
        logger.error(f"Error fetching stats: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error fetching stats: {str(e)}'
        }), 500

def count_direct_subgroups(group_id, headers):
    """Count only direct subgroups (not recursive) for performance"""
    try:
        url = f"{Config.GITLAB_URL}/api/v4/groups/{group_id}/subgroups"
        params = {'per_page': 100, 'page': 1}  # Only first page for speed
        
        response = requests.get(url, headers=headers, params=params, timeout=10)
        
        if response.status_code == 200:
            subgroups = response.json()
            return len(subgroups)
        else:
            return 0
            
    except Exception as e:
        logger.error(f"Error counting direct subgroups for group {group_id}: {str(e)}")
        return 0

# ============================================================================
# ENHANCED ENDPOINTS FOR QA AND PROJECT MANAGEMENT
# ============================================================================

@app.route('/api/projects/<int:project_id>/issues', methods=['GET'])
def get_project_issues(project_id):
    """Get all issues for a specific project with filtering options"""
    try:
        if not Config.GITLAB_TOKEN:
            return jsonify({'success': False, 'error': 'GitLab not configured'}), 400
        
        headers = {'Authorization': f'Bearer {Config.GITLAB_TOKEN}'}
        url = f"{Config.GITLAB_URL}/api/v4/projects/{project_id}/issues"
        
        # Support filtering parameters
        params = {
            'state': request.args.get('state', 'opened'),  # opened, closed, all
            'assignee_id': request.args.get('assignee_id'),
            'author_id': request.args.get('author_id'),
            'labels': request.args.get('labels'),
            'milestone': request.args.get('milestone'),
            'order_by': request.args.get('order_by', 'created_at'),
            'sort': request.args.get('sort', 'desc')
        }
        
        # Remove None values
        params = {k: v for k, v in params.items() if v is not None}
        
        issues = get_all_paginated_data(url, headers, params)
        
        return jsonify({
            'success': True,
            'issues': issues,
            'count': len(issues)
        })
            
    except Exception as e:
        logger.error(f"Error fetching project issues: {str(e)}")
        return jsonify({'success': False, 'error': f'Error fetching issues: {str(e)}'}), 500

@app.route('/api/projects/<int:project_id>/merge_requests', methods=['GET'])
def get_project_merge_requests(project_id):
    """Get all merge requests for a specific project"""
    try:
        if not Config.GITLAB_TOKEN:
            return jsonify({'success': False, 'error': 'GitLab not configured'}), 400
        
        headers = {'Authorization': f'Bearer {Config.GITLAB_TOKEN}'}
        url = f"{Config.GITLAB_URL}/api/v4/projects/{project_id}/merge_requests"
        
        params = {
            'state': request.args.get('state', 'opened'),
            'order_by': request.args.get('order_by', 'created_at'),
            'sort': request.args.get('sort', 'desc')
        }
        
        merge_requests = get_all_paginated_data(url, headers, params)
        
        return jsonify({
            'success': True,
            'merge_requests': merge_requests,
            'count': len(merge_requests)
        })
            
    except Exception as e:
        logger.error(f"Error fetching merge requests: {str(e)}")
        return jsonify({'success': False, 'error': f'Error fetching merge requests: {str(e)}'}), 500

@app.route('/api/projects/<int:project_id>/milestones', methods=['GET'])
def get_project_milestones(project_id):
    """Get all milestones for a specific project"""
    try:
        if not Config.GITLAB_TOKEN:
            return jsonify({'success': False, 'error': 'GitLab not configured'}), 400
        
        headers = {'Authorization': f'Bearer {Config.GITLAB_TOKEN}'}
        url = f"{Config.GITLAB_URL}/api/v4/projects/{project_id}/milestones"
        
        params = {
            'state': request.args.get('state', 'active')
        }
        
        milestones = get_all_paginated_data(url, headers, params)
        
        return jsonify({
            'success': True,
            'milestones': milestones,
            'count': len(milestones)
        })
            
    except Exception as e:
        logger.error(f"Error fetching milestones: {str(e)}")
        return jsonify({'success': False, 'error': f'Error fetching milestones: {str(e)}'}), 500

@app.route('/api/projects/<int:project_id>/releases', methods=['GET'])
def get_project_releases(project_id):
    """Get all releases for a specific project"""
    try:
        if not Config.GITLAB_TOKEN:
            return jsonify({'success': False, 'error': 'GitLab not configured'}), 400
        
        headers = {'Authorization': f'Bearer {Config.GITLAB_TOKEN}'}
        url = f"{Config.GITLAB_URL}/api/v4/projects/{project_id}/releases"
        
        releases = get_all_paginated_data(url, headers, {})
        
        return jsonify({
            'success': True,
            'releases': releases,
            'count': len(releases)
        })
            
    except Exception as e:
        logger.error(f"Error fetching releases: {str(e)}")
        return jsonify({'success': False, 'error': f'Error fetching releases: {str(e)}'}), 500

@app.route('/api/projects/<int:project_id>/branches', methods=['GET'])
def get_project_branches(project_id):
    """Get all branches for a specific project"""
    try:
        if not Config.GITLAB_TOKEN:
            return jsonify({'success': False, 'error': 'GitLab not configured'}), 400
        
        headers = {'Authorization': f'Bearer {Config.GITLAB_TOKEN}'}
        url = f"{Config.GITLAB_URL}/api/v4/projects/{project_id}/repository/branches"
        
        branches = get_all_paginated_data(url, headers, {})
        
        return jsonify({
            'success': True,
            'branches': branches,
            'count': len(branches)
        })
            
    except Exception as e:
        logger.error(f"Error fetching branches: {str(e)}")
        return jsonify({'success': False, 'error': f'Error fetching branches: {str(e)}'}), 500

@app.route('/api/projects/<int:project_id>/commits', methods=['GET'])
def get_project_commits(project_id):
    """Get recent commits for a specific project"""
    try:
        if not Config.GITLAB_TOKEN:
            return jsonify({'success': False, 'error': 'GitLab not configured'}), 400
        
        headers = {'Authorization': f'Bearer {Config.GITLAB_TOKEN}'}
        url = f"{Config.GITLAB_URL}/api/v4/projects/{project_id}/repository/commits"
        
        params = {
            'since': request.args.get('since'),
            'until': request.args.get('until'),
            'ref_name': request.args.get('ref_name', 'main'),
            'per_page': min(int(request.args.get('per_page', 50)), 100)
        }
        
        # Remove None values
        params = {k: v for k, v in params.items() if v is not None}
        
        commits = get_all_paginated_data(url, headers, params, max_items=250)  # Limit for performance
        
        return jsonify({
            'success': True,
            'commits': commits,
            'count': len(commits)
        })
            
    except Exception as e:
        logger.error(f"Error fetching commits: {str(e)}")
        return jsonify({'success': False, 'error': f'Error fetching commits: {str(e)}'}), 500

@app.route('/api/projects/<int:project_id>/analytics', methods=['GET'])
def get_project_analytics(project_id):
    """Get comprehensive analytics for a project"""
    try:
        if not Config.GITLAB_TOKEN:
            return jsonify({'success': False, 'error': 'GitLab not configured'}), 400
        
        headers = {'Authorization': f'Bearer {Config.GITLAB_TOKEN}'}
        
        # Get project statistics
        project_url = f"{Config.GITLAB_URL}/api/v4/projects/{project_id}"
        project_response = requests.get(project_url, headers=headers, params={'statistics': 'true'}, timeout=10)
        
        if project_response.status_code != 200:
            return jsonify({'success': False, 'error': 'Failed to fetch project data'}), 400
        
        project_data = project_response.json()
        
        # Get issues summary
        issues_opened = len(get_all_paginated_data(f"{Config.GITLAB_URL}/api/v4/projects/{project_id}/issues", headers, {'state': 'opened'}, max_items=200))
        issues_closed = len(get_all_paginated_data(f"{Config.GITLAB_URL}/api/v4/projects/{project_id}/issues", headers, {'state': 'closed'}, max_items=200))
        
        # Get MR summary
        mrs_opened = len(get_all_paginated_data(f"{Config.GITLAB_URL}/api/v4/projects/{project_id}/merge_requests", headers, {'state': 'opened'}, max_items=200))
        mrs_merged = len(get_all_paginated_data(f"{Config.GITLAB_URL}/api/v4/projects/{project_id}/merge_requests", headers, {'state': 'merged'}, max_items=200))
        
        # Get recent pipeline summary
        pipelines = get_all_paginated_data(f"{Config.GITLAB_URL}/api/v4/projects/{project_id}/pipelines", headers, {}, max_items=100)
        
        analytics = {
            'project_info': {
                'name': project_data.get('name'),
                'description': project_data.get('description'),
                'default_branch': project_data.get('default_branch'),
                'created_at': project_data.get('created_at'),
                'last_activity_at': project_data.get('last_activity_at'),
                'star_count': project_data.get('star_count', 0),
                'forks_count': project_data.get('forks_count', 0)
            },
            'statistics': project_data.get('statistics', {}),
            'issues': {
                'opened': issues_opened,
                'closed': issues_closed,
                'total': issues_opened + issues_closed
            },
            'merge_requests': {
                'opened': mrs_opened,
                'merged': mrs_merged,
                'total': mrs_opened + mrs_merged
            },
            'recent_pipelines': pipelines[:10]  # Last 10 pipelines
        }
        
        return jsonify({
            'success': True,
            'analytics': analytics
        })
            
    except Exception as e:
        logger.error(f"Error fetching project analytics: {str(e)}")
        return jsonify({'success': False, 'error': f'Error fetching analytics: {str(e)}'}), 500

@app.route('/api/projects/<int:project_id>/members', methods=['GET'])
def get_project_members(project_id):
    """Get all members of a specific project"""
    try:
        if not Config.GITLAB_TOKEN:
            return jsonify({'success': False, 'error': 'GitLab not configured'}), 400
        
        headers = {'Authorization': f'Bearer {Config.GITLAB_TOKEN}'}
        url = f"{Config.GITLAB_URL}/api/v4/projects/{project_id}/members/all"
        
        members = get_all_paginated_data(url, headers, {})
        
        return jsonify({
            'success': True,
            'members': members,
            'count': len(members)
        })
            
    except Exception as e:
        logger.error(f"Error fetching project members: {str(e)}")
        return jsonify({'success': False, 'error': f'Error fetching members: {str(e)}'}), 500

@app.route('/api/dashboard/overview', methods=['GET'])
def get_dashboard_overview():
    """Get comprehensive overview for dashboard home page"""
    try:
        if not Config.GITLAB_TOKEN:
            return jsonify({'success': False, 'error': 'GitLab not configured'}), 400
        
        headers = {'Authorization': f'Bearer {Config.GITLAB_TOKEN}'}
        
        # Get user info
        user_url = f"{Config.GITLAB_URL}/api/v4/user"
        user_response = requests.get(user_url, headers=headers, timeout=10)
        user_data = user_response.json() if user_response.status_code == 200 else {}
        
        # Get quick stats
        projects = get_all_paginated_data(f"{Config.GITLAB_URL}/api/v4/projects", headers, {'membership': 'true'}, max_items=300)
        groups = get_all_paginated_data(f"{Config.GITLAB_URL}/api/v4/groups", headers, {'owned': 'true'}, max_items=200)
        
        # Get recent activity (issues and MRs assigned to user)
        recent_issues = []
        recent_mrs = []
        
        if user_data.get('id'):
            user_id = user_data['id']
            recent_issues = get_all_paginated_data(f"{Config.GITLAB_URL}/api/v4/issues", headers, 
                                                 {'assignee_id': user_id, 'state': 'opened'}, max_items=100)
            recent_mrs = get_all_paginated_data(f"{Config.GITLAB_URL}/api/v4/merge_requests", headers, 
                                              {'assignee_id': user_id, 'state': 'opened'}, max_items=100)
        
        overview = {
            'user': user_data,
            'stats': {
                'total_projects': len(projects),
                'total_groups': len(groups),
                'assigned_issues': len(recent_issues),
                'assigned_mrs': len(recent_mrs)
            },
            'recent_activity': {
                'issues': recent_issues[:5],
                'merge_requests': recent_mrs[:5]
            },
            'recent_projects': projects[:6]  # Last 6 projects
        }
        
        return jsonify({
            'success': True,
            'overview': overview
        })
            
    except Exception as e:
        logger.error(f"Error fetching dashboard overview: {str(e)}")
        return jsonify({'success': False, 'error': f'Error fetching overview: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
