import sqlite3
import json
import logging
from datetime import datetime
from typing import List, Dict, Optional

class GitLabDatabase:
    def __init__(self, db_path: str = 'gitlab_dashboard.db'):
        self.db_path = db_path
        self.init_database()
        
    def init_database(self):
        """Initialize the database with required tables"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('PRAGMA foreign_keys = ON')
            cursor = conn.cursor()
            
            # Configuration table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS config (
                    id INTEGER PRIMARY KEY,
                    gitlab_url TEXT NOT NULL,
                    access_token TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Groups table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS groups (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    full_name TEXT,
                    path TEXT,
                    full_path TEXT,
                    description TEXT,
                    visibility TEXT,
                    avatar_url TEXT,
                    web_url TEXT,
                    parent_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    gitlab_data TEXT,
                    FOREIGN KEY (parent_id) REFERENCES groups (id)
                )
            ''')
            
            # Projects table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS projects (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    name_with_namespace TEXT,
                    path TEXT,
                    path_with_namespace TEXT,
                    description TEXT,
                    default_branch TEXT,
                    visibility TEXT,
                    avatar_url TEXT,
                    web_url TEXT,
                    http_url_to_repo TEXT,
                    ssh_url_to_repo TEXT,
                    group_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    gitlab_data TEXT,
                    FOREIGN KEY (group_id) REFERENCES groups (id)
                )
            ''')
            
            # Pipelines table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS pipelines (
                    id INTEGER PRIMARY KEY,
                    project_id INTEGER NOT NULL,
                    status TEXT,
                    ref TEXT,
                    sha TEXT,
                    tag BOOLEAN DEFAULT FALSE,
                    source TEXT,
                    web_url TEXT,
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP,
                    started_at TIMESTAMP,
                    finished_at TIMESTAMP,
                    duration INTEGER,
                    last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    gitlab_data TEXT,
                    FOREIGN KEY (project_id) REFERENCES projects (id)
                )
            ''')
            
            # Branches table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS branches (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    merged BOOLEAN DEFAULT FALSE,
                    protected BOOLEAN DEFAULT FALSE,
                    default_branch BOOLEAN DEFAULT FALSE,
                    developers_can_push BOOLEAN DEFAULT FALSE,
                    developers_can_merge BOOLEAN DEFAULT FALSE,
                    can_push BOOLEAN DEFAULT FALSE,
                    web_url TEXT,
                    commit_id TEXT,
                    commit_short_id TEXT,
                    commit_title TEXT,
                    commit_author_name TEXT,
                    commit_author_email TEXT,
                    commit_authored_date TIMESTAMP,
                    commit_committer_name TEXT,
                    commit_committer_email TEXT,
                    commit_committed_date TIMESTAMP,
                    commit_message TEXT,
                    last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    gitlab_data TEXT,
                    FOREIGN KEY (project_id) REFERENCES projects (id),
                    UNIQUE(project_id, name)
                )
            ''')
            
            # Sync status table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sync_status (
                    id INTEGER PRIMARY KEY,
                    entity_type TEXT NOT NULL,
                    entity_id INTEGER,
                    last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    sync_status TEXT DEFAULT 'pending',
                    error_message TEXT,
                    UNIQUE(entity_type, entity_id)
                )
            ''')
            
            conn.commit()
            
    def save_config(self, gitlab_url: str, access_token: str):
        """Save GitLab configuration"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Clear existing config
            cursor.execute('DELETE FROM config')
            # Insert new config
            cursor.execute('''
                INSERT INTO config (gitlab_url, access_token)
                VALUES (?, ?)
            ''', (gitlab_url, access_token))
            conn.commit()
            
    def get_config(self) -> Optional[Dict]:
        """Get GitLab configuration"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT gitlab_url, access_token FROM config ORDER BY id DESC LIMIT 1')
            result = cursor.fetchone()
            if result:
                return {
                    'gitlab_url': result[0],
                    'access_token': result[1]
                }
        return None
    
    def save_groups(self, groups: List[Dict]):
        """Save groups to database"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            for group in groups:
                cursor.execute('''
                    INSERT OR REPLACE INTO groups 
                    (id, name, full_name, path, full_path, description, visibility, 
                     avatar_url, web_url, parent_id, gitlab_data, last_synced)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ''', (
                    group['id'],
                    group.get('name', ''),
                    group.get('full_name', ''),
                    group.get('path', ''),
                    group.get('full_path', ''),
                    group.get('description', ''),
                    group.get('visibility', ''),
                    group.get('avatar_url', ''),
                    group.get('web_url', ''),
                    group.get('parent_id'),
                    json.dumps(group)
                ))
            conn.commit()
            
    def get_groups(self, parent_id: Optional[int] = None) -> List[Dict]:
        """Get groups from database"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            if parent_id is None:
                cursor.execute('SELECT * FROM groups WHERE parent_id IS NULL ORDER BY name')
            else:
                cursor.execute('SELECT * FROM groups WHERE parent_id = ? ORDER BY name', (parent_id,))
            
            columns = [description[0] for description in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
    
    def get_subgroups(self, group_id: int) -> List[Dict]:
        """Get subgroups for a group"""
        return self.get_groups(parent_id=group_id)
    
    def save_projects(self, projects: List[Dict], group_id: Optional[int] = None):
        """Save projects to database"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            for project in projects:
                cursor.execute('''
                    INSERT OR REPLACE INTO projects 
                    (id, name, name_with_namespace, path, path_with_namespace, description,
                     default_branch, visibility, avatar_url, web_url, http_url_to_repo,
                     ssh_url_to_repo, group_id, gitlab_data, last_synced)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ''', (
                    project['id'],
                    project.get('name', ''),
                    project.get('name_with_namespace', ''),
                    project.get('path', ''),
                    project.get('path_with_namespace', ''),
                    project.get('description', ''),
                    project.get('default_branch', ''),
                    project.get('visibility', ''),
                    project.get('avatar_url', ''),
                    project.get('web_url', ''),
                    project.get('http_url_to_repo', ''),
                    project.get('ssh_url_to_repo', ''),
                    group_id or project.get('namespace', {}).get('id'),
                    json.dumps(project)
                ))
            conn.commit()
    
    def get_projects(self, group_id: Optional[int] = None) -> List[Dict]:
        """Get projects from database"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            if group_id:
                cursor.execute('SELECT * FROM projects WHERE group_id = ? ORDER BY name', (group_id,))
            else:
                cursor.execute('SELECT * FROM projects ORDER BY name')
            
            columns = [description[0] for description in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
    
    def get_project(self, project_id: int) -> Optional[Dict]:
        """Get single project"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM projects WHERE id = ?', (project_id,))
            result = cursor.fetchone()
            if result:
                columns = [description[0] for description in cursor.description]
                return dict(zip(columns, result))
        return None
    
    def save_pipelines(self, pipelines: List[Dict], project_id: int):
        """Save pipelines to database"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Clear existing pipelines for this project
            cursor.execute('DELETE FROM pipelines WHERE project_id = ?', (project_id,))
            
            for pipeline in pipelines:
                cursor.execute('''
                    INSERT INTO pipelines 
                    (id, project_id, status, ref, sha, tag, source, web_url,
                     created_at, updated_at, started_at, finished_at, duration, gitlab_data, last_synced)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ''', (
                    pipeline['id'],
                    project_id,
                    pipeline.get('status', ''),
                    pipeline.get('ref', ''),
                    pipeline.get('sha', ''),
                    pipeline.get('tag', False),
                    pipeline.get('source', ''),
                    pipeline.get('web_url', ''),
                    pipeline.get('created_at'),
                    pipeline.get('updated_at'),
                    pipeline.get('started_at'),
                    pipeline.get('finished_at'),
                    pipeline.get('duration'),
                    json.dumps(pipeline)
                ))
            conn.commit()
    
    def get_pipelines(self, project_id: int) -> List[Dict]:
        """Get pipelines for a project"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM pipelines 
                WHERE project_id = ? 
                ORDER BY created_at DESC
            ''', (project_id,))
            
            columns = [description[0] for description in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
    
    def save_branches(self, branches: List[Dict], project_id: int):
        """Save branches to database"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Clear existing branches for this project
            cursor.execute('DELETE FROM branches WHERE project_id = ?', (project_id,))
            
            for branch in branches:
                commit = branch.get('commit', {})
                cursor.execute('''
                    INSERT INTO branches 
                    (project_id, name, merged, protected, default_branch, developers_can_push,
                     developers_can_merge, can_push, web_url, commit_id, commit_short_id,
                     commit_title, commit_author_name, commit_author_email, commit_authored_date,
                     commit_committer_name, commit_committer_email, commit_committed_date,
                     commit_message, gitlab_data, last_synced)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ''', (
                    project_id,
                    branch.get('name', ''),
                    branch.get('merged', False),
                    branch.get('protected', False),
                    branch.get('default', False),
                    branch.get('developers_can_push', False),
                    branch.get('developers_can_merge', False),
                    branch.get('can_push', False),
                    branch.get('web_url', ''),
                    commit.get('id', ''),
                    commit.get('short_id', ''),
                    commit.get('title', ''),
                    commit.get('author_name', ''),
                    commit.get('author_email', ''),
                    commit.get('authored_date'),
                    commit.get('committer_name', ''),
                    commit.get('committer_email', ''),
                    commit.get('committed_date'),
                    commit.get('message', ''),
                    json.dumps(branch)
                ))
            conn.commit()
    
    def get_branches(self, project_id: int) -> List[Dict]:
        """Get branches for a project"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM branches 
                WHERE project_id = ? 
                ORDER BY default_branch DESC, name
            ''', (project_id,))
            
            columns = [description[0] for description in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
    
    def search_projects(self, query: str) -> List[Dict]:
        """Search projects by name"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM projects 
                WHERE name LIKE ? OR name_with_namespace LIKE ? OR description LIKE ?
                ORDER BY name
            ''', (f'%{query}%', f'%{query}%', f'%{query}%'))
            
            columns = [description[0] for description in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
    
    def get_dashboard_stats(self) -> Dict:
        """Get dashboard statistics"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Count groups (excluding subgroups)
            cursor.execute('SELECT COUNT(*) FROM groups WHERE parent_id IS NULL')
            total_groups = cursor.fetchone()[0]
            
            # Count subgroups
            cursor.execute('SELECT COUNT(*) FROM groups WHERE parent_id IS NOT NULL')
            total_subgroups = cursor.fetchone()[0]
            
            # Count projects
            cursor.execute('SELECT COUNT(*) FROM projects')
            total_projects = cursor.fetchone()[0]
            
            # Get last sync time
            cursor.execute('SELECT MAX(last_synced) FROM groups')
            last_sync = cursor.fetchone()[0]
            
            return {
                'total_groups': total_groups,
                'total_subgroups': total_subgroups,
                'total_projects': total_projects,
                'last_updated': last_sync
            }
    
    def update_sync_status(self, entity_type: str, entity_id: Optional[int], status: str, error: Optional[str] = None):
        """Update sync status for an entity"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO sync_status 
                (entity_type, entity_id, sync_status, error_message, last_sync)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (entity_type, entity_id, status, error))
            conn.commit()
    
    def get_sync_status(self, entity_type: str, entity_id: Optional[int] = None) -> Optional[Dict]:
        """Get sync status for an entity"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            if entity_id:
                cursor.execute('''
                    SELECT * FROM sync_status 
                    WHERE entity_type = ? AND entity_id = ?
                ''', (entity_type, entity_id))
            else:
                cursor.execute('''
                    SELECT * FROM sync_status 
                    WHERE entity_type = ?
                    ORDER BY last_sync DESC
                    LIMIT 1
                ''', (entity_type,))
            
            result = cursor.fetchone()
            if result:
                columns = [description[0] for description in cursor.description]
                return dict(zip(columns, result))
        return None
    
    def clear_all_data(self):
        """Clear all data (for fresh sync)"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM branches')
            cursor.execute('DELETE FROM pipelines')
            cursor.execute('DELETE FROM projects')
            cursor.execute('DELETE FROM groups')
            cursor.execute('DELETE FROM sync_status')
            conn.commit()
