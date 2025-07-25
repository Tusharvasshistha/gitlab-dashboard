# GitLab Dashboard API - Postman Guide

## Overview
Your GitLab Dashboard Flask API provides RESTful endpoints that can be easily tested with Postman. This guide shows you how to use all the available endpoints.

## Base URL
```
http://127.0.0.1:5000
```

## API Endpoints

### 1. Health Check
**GET** `/api/health`
- **Purpose**: Check if the API is running and configuration status
- **Authentication**: None required
- **Response**: 
```json
{
  "status": "healthy",
  "configured": true
}
```

### 2. Configuration
**POST** `/api/config`
- **Purpose**: Set GitLab URL and access token (REQUIRED FIRST)
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "gitlab_url": "https://gitlab.com",
  "access_token": "your-gitlab-access-token"
}
```
- **Response**:
```json
{
  "message": "Configuration saved successfully"
}
```

### 3. Groups
**GET** `/api/groups`
- **Purpose**: Get all top-level groups
- **Authentication**: Configuration must be set first
- **Response**: Array of group objects

**GET** `/api/groups/{group_id}/subgroups`
- **Purpose**: Get subgroups for a specific group
- **Parameters**: `group_id` (path parameter)
- **Response**: Array of subgroup objects

**GET** `/api/groups/{group_id}/projects`
- **Purpose**: Get projects in a specific group
- **Parameters**: 
  - `group_id` (path parameter)
  - `include_subgroups` (query parameter, optional, default: false)
- **Response**: Array of project objects

### 4. Projects
**GET** `/api/projects/{project_id}`
- **Purpose**: Get detailed project information
- **Parameters**: `project_id` (path parameter)
- **Response**: Detailed project object

**GET** `/api/search/projects?q={search_term}`
- **Purpose**: Search projects by name
- **Parameters**: `q` (query parameter)
- **Response**: Array of matching projects

### 5. Pipelines
**GET** `/api/projects/{project_id}/pipelines`
- **Purpose**: Get recent pipelines for a project
- **Parameters**: `project_id` (path parameter)
- **Response**: Array of pipeline objects

**GET** `/api/projects/{project_id}/pipelines/{pipeline_id}`
- **Purpose**: Get detailed pipeline information
- **Parameters**: `project_id`, `pipeline_id` (path parameters)
- **Response**: Detailed pipeline object

### 6. Branches
**GET** `/api/projects/{project_id}/branches`
- **Purpose**: Get all branches for a project
- **Parameters**: `project_id` (path parameter)
- **Response**: Array of branch objects

**GET** `/api/projects/{project_id}/branches/{branch_name}`
- **Purpose**: Get detailed branch information
- **Parameters**: `project_id`, `branch_name` (path parameters)
- **Response**: Detailed branch object

### 7. Dashboard Statistics
**GET** `/api/dashboard/stats`
- **Purpose**: Get overall dashboard statistics
- **Response**:
```json
{
  "total_groups": 5,
  "total_subgroups": 12,
  "total_projects": 45
}
```

## Using Postman

### Step 1: Import Collection
1. Open Postman
2. Click "Import" button
3. Select the `GitLab_Dashboard_API.postman_collection.json` file
4. The collection will be imported with all endpoints

### Step 2: Set Variables
1. Click on the collection name
2. Go to "Variables" tab
3. Set the following variables:
   - `base_url`: `http://127.0.0.1:5000`
   - `gitlab_url`: Your GitLab instance URL (e.g., `https://gitlab.com`)
   - `access_token`: Your GitLab access token
   - `project_id`: A valid project ID for testing
   - `group_id`: A valid group ID for testing

### Step 3: Start Flask Server
Make sure your Flask server is running:
```bash
cd /path/to/your/project
python app.py
```

### Step 4: Test Endpoints
1. **First**: Call "Save Configuration" to authenticate
2. **Then**: Test other endpoints in any order

## Authentication Flow
1. **No Token Required**: `/api/health`
2. **Set Configuration**: `/api/config` (POST with GitLab URL and token)
3. **All Other Endpoints**: Require configuration to be set first

## Example Workflow in Postman

1. **Health Check**: Verify API is running
2. **Save Configuration**: POST your GitLab credentials
3. **Get Groups**: Retrieve all groups
4. **Get Group Projects**: Get projects for a specific group
5. **Get Project Details**: View detailed project information
6. **Get Pipelines**: Check pipeline status
7. **Get Branches**: View branch information

## Error Responses
- **400**: Bad Request (missing parameters)
- **401**: Unauthorized (invalid token)
- **404**: Not Found (resource doesn't exist)
- **500**: Internal Server Error

## Tips for Testing
- Start with health check to ensure API is running
- Always set configuration first before testing other endpoints
- Use the variables feature in Postman for easy endpoint testing
- Check the console output in your Flask app for debugging
- Use environment variables in Postman for different GitLab instances (dev, staging, prod)

## Environment Setup for Multiple Instances
You can create different Postman environments for:
- **Development**: `http://127.0.0.1:5000`
- **Production**: Your production URL
- **Different GitLab Instances**: Different `gitlab_url` values
