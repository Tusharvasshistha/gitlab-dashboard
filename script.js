// GitLab Dashboard JavaScript

class GitLabDashboard {
    constructor() {
        this.baseUrl = '';
        this.accessToken = '';
        this.stats = {
            totalGroups: 0,
            totalSubgroups: 0,
            totalProjects: 0
        };
    }

    // Initialize the dashboard
    init() {
        this.bindEvents();
        this.loadStoredConfig();
    }

    // Bind event listeners
    bindEvents() {
        // Enter key support for inputs
        document.getElementById('gitlabUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadGroups();
        });
        
        document.getElementById('accessToken').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadGroups();
        });
    }

    // Load stored configuration
    loadStoredConfig() {
        const storedUrl = localStorage.getItem('gitlabUrl');
        const storedToken = localStorage.getItem('accessToken');
        
        if (storedUrl) {
            document.getElementById('gitlabUrl').value = storedUrl;
        }
        if (storedToken) {
            document.getElementById('accessToken').value = storedToken;
        }
    }

    // Save configuration to localStorage
    saveConfig() {
        const url = document.getElementById('gitlabUrl').value;
        const token = document.getElementById('accessToken').value;
        
        localStorage.setItem('gitlabUrl', url);
        localStorage.setItem('accessToken', token);
    }

    // Show loading indicator
    showLoading() {
        document.getElementById('loadingIndicator').classList.remove('d-none');
        document.getElementById('errorAlert').classList.add('d-none');
        document.getElementById('dashboardContent').innerHTML = '';
    }

    // Hide loading indicator
    hideLoading() {
        document.getElementById('loadingIndicator').classList.add('d-none');
    }

    // Show error message
    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorAlert').classList.remove('d-none');
        this.hideLoading();
    }

    // Make API request to GitLab
    async makeApiRequest(endpoint) {
        const url = `${this.baseUrl}/api/v4${endpoint}`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            throw new Error(`API Request failed: ${error.message}`);
        }
    }

    // Load groups and build dashboard
    async loadGroups() {
        // Get configuration
        this.baseUrl = document.getElementById('gitlabUrl').value.trim();
        this.accessToken = document.getElementById('accessToken').value.trim();

        if (!this.baseUrl || !this.accessToken) {
            this.showError('Please provide both GitLab URL and Access Token');
            return;
        }

        // Remove trailing slash from URL
        this.baseUrl = this.baseUrl.replace(/\/$/, '');
        
        // Save configuration
        this.saveConfig();

        // Reset stats
        this.stats = { totalGroups: 0, totalSubgroups: 0, totalProjects: 0 };

        this.showLoading();

        try {
            // Get all groups
            const groups = await this.makeApiRequest('/groups?top_level_only=true&per_page=100');
            
            if (!groups || groups.length === 0) {
                this.showError('No groups found or you don\'t have access to any groups');
                return;
            }

            await this.renderDashboard(groups);
            this.updateStats();
            this.hideLoading();

        } catch (error) {
            this.showError(error.message);
        }
    }

    // Render the complete dashboard
    async renderDashboard(groups) {
        const container = document.getElementById('dashboardContent');
        container.innerHTML = '';

        for (const group of groups) {
            const groupElement = await this.createGroupElement(group);
            container.appendChild(groupElement);
            this.stats.totalGroups++;
        }
    }

    // Create group element with subgroups and projects
    async createGroupElement(group) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'col-12 group-card fade-in';
        
        // Get subgroups and projects for this group
        const [subgroups, projects] = await Promise.all([
            this.getSubgroups(group.id),
            this.getProjects(group.id)
        ]);

        groupDiv.innerHTML = `
            <div class="card">
                <div class="card-header group-header">
                    <div class="d-flex justify-content-between align-items-center collapse-toggle" 
                         data-bs-toggle="collapse" data-bs-target="#group-${group.id}">
                        <h5 class="mb-0">
                            <i class="fas fa-layer-group group-icon"></i>
                            ${this.escapeHtml(group.name)}
                            <span class="badge bg-light text-dark ms-2">${subgroups.length + projects.length} items</span>
                        </h5>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    ${group.description ? `<p class="mb-0 mt-2 opacity-75">${this.escapeHtml(group.description)}</p>` : ''}
                </div>
                <div class="collapse show" id="group-${group.id}">
                    <div class="card-body">
                        ${this.renderSubgroups(subgroups)}
                        ${this.renderProjects(projects, 'Direct Projects')}
                    </div>
                </div>
            </div>
        `;

        return groupDiv;
    }

    // Get subgroups for a group
    async getSubgroups(groupId) {
        try {
            return await this.makeApiRequest(`/groups/${groupId}/subgroups?per_page=100`);
        } catch (error) {
            console.error(`Error fetching subgroups for group ${groupId}:`, error);
            return [];
        }
    }

    // Get projects for a group
    async getProjects(groupId) {
        try {
            return await this.makeApiRequest(`/groups/${groupId}/projects?include_subgroups=false&per_page=100`);
        } catch (error) {
            console.error(`Error fetching projects for group ${groupId}:`, error);
            return [];
        }
    }

    // Render subgroups
    renderSubgroups(subgroups) {
        if (!subgroups || subgroups.length === 0) {
            return '';
        }

        let html = '<h6><i class="fas fa-sitemap"></i> Subgroups</h6>';
        
        subgroups.forEach(subgroup => {
            this.stats.totalSubgroups++;
            html += `
                <div class="subgroup-card card mb-3">
                    <div class="card-header subgroup-header">
                        <div class="d-flex justify-content-between align-items-center collapse-toggle" 
                             data-bs-toggle="collapse" data-bs-target="#subgroup-${subgroup.id}">
                            <h6 class="mb-0">
                                <i class="fas fa-folder subgroup-icon"></i>
                                ${this.escapeHtml(subgroup.name)}
                            </h6>
                            <i class="fas fa-chevron-down"></i>
                        </div>
                        ${subgroup.description ? `<small class="text-muted">${this.escapeHtml(subgroup.description)}</small>` : ''}
                    </div>
                    <div class="collapse" id="subgroup-${subgroup.id}">
                        <div class="card-body" id="subgroup-content-${subgroup.id}">
                            <div class="text-center">
                                <div class="spinner-border spinner-border-sm" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <small class="d-block mt-2">Loading projects...</small>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        // Add event listeners for lazy loading subgroup projects
        setTimeout(() => {
            subgroups.forEach(subgroup => {
                const collapseElement = document.getElementById(`subgroup-${subgroup.id}`);
                if (collapseElement) {
                    collapseElement.addEventListener('shown.bs.collapse', () => {
                        this.loadSubgroupProjects(subgroup.id);
                    });
                }
            });
        }, 100);

        return html;
    }

    // Load projects for a subgroup (lazy loading)
    async loadSubgroupProjects(subgroupId) {
        const contentElement = document.getElementById(`subgroup-content-${subgroupId}`);
        if (!contentElement) return;

        try {
            const projects = await this.getProjects(subgroupId);
            contentElement.innerHTML = this.renderProjects(projects, 'Projects');
        } catch (error) {
            contentElement.innerHTML = `<div class="alert alert-warning">Error loading projects: ${error.message}</div>`;
        }
    }

    // Render projects
    renderProjects(projects, title = 'Projects') {
        if (!projects || projects.length === 0) {
            return `<div class="no-data"><i class="fas fa-folder-open"></i> No projects found</div>`;
        }

        let html = `<h6><i class="fas fa-code-branch"></i> ${title}</h6>`;
        
        projects.forEach(project => {
            this.stats.totalProjects++;
            const visibilityClass = project.visibility === 'private' ? 'bg-danger' : 
                                   project.visibility === 'internal' ? 'bg-warning' : 'bg-success';
            
            html += `
                <div class="project-item">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <a href="${project.web_url}" target="_blank" class="project-link">
                                <i class="fas fa-project-diagram project-icon"></i>
                                ${this.escapeHtml(project.name)}
                            </a>
                            ${project.description ? `<div class="project-meta">${this.escapeHtml(project.description)}</div>` : ''}
                            <div class="project-meta">
                                <span class="badge ${visibilityClass} visibility-badge me-2">${project.visibility}</span>
                                ${project.star_count ? `<span class="me-2"><i class="fas fa-star project-stars"></i> ${project.star_count}</span>` : ''}
                                ${project.forks_count ? `<span class="me-2"><i class="fas fa-code-branch project-forks"></i> ${project.forks_count}</span>` : ''}
                                <span class="text-muted"><i class="fas fa-clock"></i> Updated ${this.formatDate(project.last_activity_at)}</span>
                            </div>
                        </div>
                        <div class="text-end">
                            <small class="text-muted">ID: ${project.id}</small>
                        </div>
                    </div>
                </div>
            `;
        });

        return html;
    }

    // Update statistics
    updateStats() {
        document.getElementById('totalGroups').textContent = this.stats.totalGroups;
        document.getElementById('totalSubgroups').textContent = this.stats.totalSubgroups;
        document.getElementById('totalProjects').textContent = this.stats.totalProjects;
        document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
    }

    // Utility function to escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Utility function to format date
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
        return `${Math.ceil(diffDays / 365)} years ago`;
    }
}

// Global function to load groups (called from HTML)
function loadGroups() {
    dashboard.loadGroups();
}

// Initialize dashboard when page loads
const dashboard = new GitLabDashboard();
document.addEventListener('DOMContentLoaded', () => {
    dashboard.init();
});
