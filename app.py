"""
GitLab Dashboard - Refactored Application
Clean Flask application using modular utilities
"""
from flask import Flask, render_template, request, jsonify, session
import os
import logging
import asyncio

# Import our utilities
from database import GitLabDatabase
from sync_service import GitLabSyncService
from utils.gitlab_api import GitLabAPI
from utils.enhanced_config import EnhancedConfigManager
from utils.error_handler import ErrorHandler
from utils.response_helper import ResponseHelper
from utils.initialization import InitializationHelper

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')

# Initialize core components
db = GitLabDatabase()
sync_service = GitLabSyncService(db)
config_manager = EnhancedConfigManager(db)  # Use enhanced config manager
initialization_helper = InitializationHelper(db, sync_service)

# Initialize response helper with GitLab API factory
def get_gitlab_api():
    """Factory function to get GitLab API instance"""
    config = config_manager.get_gitlab_config()
    if config:
        return GitLabAPI(config['gitlab_url'], config['access_token'])
    return None

response_helper = ResponseHelper(db, get_gitlab_api)

# Routes
@app.route('/')
def index():
    """Serve the main dashboard page"""
    return render_template('index.html')

@app.route('/api/config', methods=['POST'])
@ErrorHandler.handle_api_error
def save_config():
    """Save GitLab configuration"""
    data = request.get_json()
    
    # Validate input
    validation_result = config_manager.validate_config(data)
    if not validation_result['valid']:
        return ErrorHandler.create_error_response(
            f"Validation failed: {', '.join(validation_result['errors'])}",
            400,
            'validation_error'
        )
    
    gitlab_url = data['gitlab_url']
    access_token = data['access_token']
    
    # Test the connection
    gitlab_api = GitLabAPI(gitlab_url, access_token)
    test_result = gitlab_api.test_connection()
    
    if not test_result['success']:
        return ErrorHandler.create_error_response(
            f"Failed to connect to GitLab: {test_result['error']}",
            400,
            'connection_error'
        )
    
    # Save configuration
    config_result = config_manager.save_gitlab_config(gitlab_url, access_token)
    if not config_result['success']:
        return ErrorHandler.create_error_response(config_result['error'])
    
    # Perform initial sync if database is empty
    init_result = initialization_helper.perform_initial_sync(gitlab_api)
    
    return ErrorHandler.create_success_response(
        message=init_result['message'],
        initial_sync=init_result['initial_sync'],
        sync_results=init_result.get('results'),
        sync_error=init_result.get('sync_error')
    )

@app.route('/api/groups')
@ErrorHandler.handle_api_error
def get_groups():
    """Get all groups from database with API fallback"""
    return response_helper.handle_groups_request()

@app.route('/api/groups/<int:group_id>/subgroups')
@ErrorHandler.handle_api_error
def get_subgroups(group_id):
    """Get subgroups for a group from database with API fallback"""
    return response_helper.handle_subgroups_request(group_id)

@app.route('/api/groups/<int:group_id>/projects')
@ErrorHandler.handle_api_error
def get_group_projects(group_id):
    """Get projects for a group from database with API fallback"""
    return response_helper.handle_projects_request(group_id)

@app.route('/api/projects/<int:project_id>')
@ErrorHandler.handle_api_error
def get_project_details(project_id):
    """Get project details from database with API fallback"""
    return response_helper.handle_project_details_request(project_id)

@app.route('/api/projects/<int:project_id>/pipelines')
@ErrorHandler.handle_api_error
def get_project_pipelines(project_id):
    """Get project pipelines from database with API fallback"""
    return response_helper.handle_pipelines_request(project_id)

@app.route('/api/projects/<int:project_id>/branches')
@ErrorHandler.handle_api_error
def get_project_branches(project_id):
    """Get project branches from database with API fallback"""
    return response_helper.handle_branches_request(project_id)

@app.route('/api/projects/<int:project_id>/pipelines/<int:pipeline_id>')
@ErrorHandler.handle_api_error
def get_pipeline_details(project_id, pipeline_id):
    """Get detailed information about a specific pipeline"""
    gitlab_api = get_gitlab_api()
    if not gitlab_api:
        return ErrorHandler.create_error_response(
            'GitLab configuration not found',
            401,
            'configuration_error'
        )
    
    result = gitlab_api.get_pipeline_details(project_id, pipeline_id)
    return ErrorHandler.create_success_response(result, source='api')

@app.route('/api/projects/<int:project_id>/branches/<path:branch_name>')
@ErrorHandler.handle_api_error
def get_branch_details(project_id, branch_name):
    """Get detailed information about a specific branch"""
    gitlab_api = get_gitlab_api()
    if not gitlab_api:
        return ErrorHandler.create_error_response(
            'GitLab configuration not found',
            401,
            'configuration_error'
        )
    
    result = gitlab_api.get_branch_details(project_id, branch_name)
    return ErrorHandler.create_success_response(result, source='api')

@app.route('/api/search/projects')
@ErrorHandler.handle_api_error
def search_projects():
    """Search projects from database"""
    query = request.args.get('q', '').strip()
    return response_helper.handle_search_request(query)

@app.route('/api/dashboard/stats')
@ErrorHandler.handle_api_error
def get_dashboard_stats():
    """Get dashboard statistics from database"""
    stats = db.get_dashboard_stats()
    return ErrorHandler.create_success_response(stats)

@app.route('/api/health')
@ErrorHandler.handle_api_error
def health_check():
    """Health check endpoint"""
    config = config_manager.get_gitlab_config()
    session_configured = config_manager.is_configured()
    
    # Validate dependencies
    validation_result = initialization_helper.validate_dependencies()
    
    # Get configuration status
    config_status = config_manager.get_config_status()
    
    return ErrorHandler.create_success_response({
        'status': 'healthy' if validation_result['valid'] else 'degraded',
        'configured': config is not None,
        'source': config.get('source') if config else None,
        'database_config': db.get_config() is not None,
        'session_config': session_configured,
        'config_sources': config_status,
        'dependencies': validation_result
    })

@app.route('/api/sync/full', methods=['POST'])
@ErrorHandler.handle_api_error
def trigger_full_sync():
    """Trigger a full synchronization of all GitLab data"""
    gitlab_api = get_gitlab_api()
    if not gitlab_api:
        return ErrorHandler.create_error_response(
            'GitLab not configured',
            400,
            'configuration_error'
        )
    
    sync_service.set_gitlab_api(gitlab_api)
    
    # Run sync (for demo, we'll run synchronously)
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    sync_results = loop.run_until_complete(sync_service.full_sync())
    loop.close()
    
    return ErrorHandler.create_success_response(
        sync_results,
        message='Full synchronization completed'
    )

@app.route('/api/sync/project/<int:project_id>', methods=['POST'])
@ErrorHandler.handle_api_error
def trigger_project_sync(project_id):
    """Trigger synchronization for a specific project"""
    gitlab_api = get_gitlab_api()
    if not gitlab_api:
        return ErrorHandler.create_error_response(
            'GitLab not configured',
            400,
            'configuration_error'
        )
    
    sync_service.set_gitlab_api(gitlab_api)
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    sync_results = loop.run_until_complete(sync_service.sync_single_project(project_id))
    loop.close()
    
    return ErrorHandler.create_success_response(
        sync_results,
        message=f'Project {project_id} synchronization completed'
    )

@app.route('/api/sync/status')
@ErrorHandler.handle_api_error
def get_sync_status():
    """Get synchronization status"""
    status = sync_service.get_sync_status()
    return ErrorHandler.create_success_response(status)

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return ErrorHandler.create_error_response('Endpoint not found', 404, 'not_found')

@app.errorhandler(500)
def internal_error(error):
    return ErrorHandler.create_error_response('Internal server error', 500, 'internal_error')

if __name__ == '__main__':
    # Validate dependencies on startup
    validation_result = initialization_helper.validate_dependencies()
    if not validation_result['valid']:
        logger.error(f"Missing dependencies: {validation_result['missing_dependencies']}")
        exit(1)
    
    if validation_result['warnings']:
        for warning in validation_result['warnings']:
            logger.warning(warning)
    
    # Get app configuration
    app_config = config_manager.get_app_config()
    
    # Setup logging
    initialization_helper.setup_logging(app_config['log_level'])
    
    logger.info("GitLab Dashboard starting up...")
    logger.info(f"Debug mode: {app_config['debug']}")
    logger.info(f"Host: {app_config['host']}")
    logger.info(f"Port: {app_config['port']}")
    
    # Start the application
    app.run(
        debug=app_config['debug'],
        host=app_config['host'],
        port=app_config['port']
    )
