# GitLab Dashboard Flask API

A clean Flask API backend for GitLab dashboard that provides RESTful endpoints for GitLab data.

## Features

- 🔍 GitLab API integration
- 📊 Groups and projects management
- 🔄 Pipeline monitoring
- 🔍 Project search functionality
- 📈 Statistics overview
- 🌐 CORS enabled for frontend integration

## API Endpoints

### Configuration
- `POST /api/config` - Set GitLab URL and access token
- `GET /api/health` - Health check endpoint

### Groups & Projects
- `GET /api/groups` - Get all GitLab groups
- `GET /api/groups/{id}/projects` - Get projects for a specific group
- `GET /api/projects/{id}` - Get project details
- `GET /api/projects/{id}/pipelines` - Get project pipelines

### Search & Stats
- `GET /api/search/projects?q={term}` - Search projects
- `GET /api/stats` - Get overall statistics

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables (optional):
```bash
export GITLAB_URL=https://your-gitlab-instance.com
export GITLAB_TOKEN=your-access-token
```

3. Run the application:
```bash
python app.py
```

The API will be available at `http://localhost:5000`

## Configuration

You can configure GitLab connection in two ways:

1. **Environment Variables** (recommended for production):
   - `GITLAB_URL`: Your GitLab instance URL
   - `GITLAB_TOKEN`: Your GitLab access token

2. **API Endpoint** (recommended for development):
   - Use `POST /api/config` to set configuration dynamically

## Usage Example

```bash
# Configure GitLab
curl -X POST http://localhost:5000/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "gitlab_url": "https://gitlab.com",
    "access_token": "your-token-here"
  }'

# Get groups
curl http://localhost:5000/api/groups

# Get projects for a group
curl http://localhost:5000/api/groups/123/projects

# Search projects
curl "http://localhost:5000/api/search/projects?q=dashboard"
```

## Production Deployment

Use gunicorn for production:

```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```
