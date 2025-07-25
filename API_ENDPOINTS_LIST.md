# GitLab Dashboard API Endpoints

## Complete List of Available Endpoints

### Base URL: `http://localhost:5000`

---

## 1. Configuration Endpoints

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `POST` | `/api/config` | Save GitLab configuration and trigger initial sync | Body: `{gitlab_url, access_token}` |

---

## 2. Group Management Endpoints

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `GET` | `/api/groups` | Get all groups from database | None |
| `GET` | `/api/groups/{group_id}/subgroups` | Get subgroups for a specific group | `group_id` (path parameter) |
| `GET` | `/api/groups/{group_id}/projects` | Get projects for a specific group | `group_id` (path parameter) |

**Example Group IDs:**
- `103595591` - shared-repo (has 3 subgroups)
- `97422868` - learningdevops
- `97490645` - demos-group

---

## 3. Project Endpoints

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `GET` | `/api/projects/{project_id}` | Get detailed project information | `project_id` (path parameter) |
| `GET` | `/api/projects/{project_id}/pipelines` | Get pipelines for a project | `project_id` (path parameter) |
| `GET` | `/api/projects/{project_id}/branches` | Get branches for a project | `project_id` (path parameter) |
| `GET` | `/api/projects/{project_id}/pipelines/{pipeline_id}` | Get specific pipeline details | `project_id`, `pipeline_id` (path parameters) |
| `GET` | `/api/projects/{project_id}/branches/{branch_name}` | Get specific branch details | `project_id`, `branch_name` (path parameters) |

**Example Project ID:**
- `64529625` - A project with 20 pipelines and 1 branch

---

## 4. Search Endpoints

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `GET` | `/api/search/projects` | Search projects by name/description | `q` (query parameter) |

**Example Search:**
- `/api/search/projects?q=web` - Search for projects containing "web"

---

## 5. Dashboard & Statistics Endpoints

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `GET` | `/api/dashboard/stats` | Get overall dashboard statistics | None |
| `GET` | `/api/health` | Check API health and configuration status | None |

---

## 6. Synchronization Endpoints

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `POST` | `/api/sync/full` | Trigger full sync of all GitLab data | None |
| `POST` | `/api/sync/project/{project_id}` | Sync specific project data | `project_id` (path parameter) |
| `GET` | `/api/sync/status` | Get current sync status and statistics | None |

---

## 7. Frontend Endpoints

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `GET` | `/` | Main dashboard web interface | None |

---

## API Response Formats

### Successful Responses
All endpoints return JSON with a consistent structure:
```json
{
  "success": true,
  "data": {...},
  "source": "database" | "api"
}
```

### Error Responses
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Database-First Architecture

All endpoints now use a **database-first approach** with smart fallback:

1. **Primary**: Data served from SQLite database
2. **Fallback**: Live GitLab API if database data is missing
3. **Sync**: Manual or automatic synchronization available

---

## Key Features

### Subgroup Support ✅
- Full support for GitLab subgroups
- Hierarchical group structure maintained
- Examples: `shared-repo` → `core-service`, `web-service`, `shared-repo-ci-cd`

### Smart Caching ✅
- Database storage for fast access
- Automatic sync on configuration save
- Manual sync endpoints available

### Search Capabilities ✅
- Fast database-based project search
- Search by project name and description

### Real-time Data ✅
- Pipeline status and branch information
- Project statistics and metadata
- Group hierarchies and relationships

---

## Sample Data Available

After full sync, your database contains:
- **16 Groups** (8 top-level + 8 subgroups)
- **20 Projects**
- **215 Pipelines**
- **25 Branches**

### Example Subgroups:
- **shared-repo** (103595591):
  - core-service (103595604)
  - web-service (103595623)
  - shared-repo-ci-cd (103595647)

- **learningdevops** (97422868):
  - Web-dev (101848805)
  - shared-devops (101871565)

---

## Quick Start Workflow

1. **Configure**: `POST /api/config` with GitLab URL and token
2. **Sync**: `POST /api/sync/full` to populate database
3. **Explore**: Use `GET /api/groups` to see all groups
4. **Drill Down**: Use subgroup and project endpoints
5. **Search**: Use search endpoint to find specific projects

The Postman collection includes all these endpoints with sample data and proper variable configuration.
