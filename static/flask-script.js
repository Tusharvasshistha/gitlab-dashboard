// GitLab Dashboard JavaScript - Flask Edition

class GitLabDashboardFlask {
    constructor() {
        this.baseApiUrl = '/api';
        this.stats = {
            totalGroups: 0,
            totalSubgroups: 0,
            totalProjects: 0
        };
        this.isConfigured = false;
    }

    // Initialize the dashboard
    init() {
        this.bindEvents();
        this.checkHealth();
        this.showWelcomeState();
    }

    // Show welcome state
    showWelcomeState() {
        const treeView = document.getElementById('treeView');
        const contentArea = document.getElementById('contentArea');
        const contentTitle = document.getElementById('contentTitle');
        
        // Show placeholder in tree view
        treeView.innerHTML = `
            <div id="treeViewPlaceholder" class="text-center text-muted p-4">
                <i class="fas fa-cog fa-3x mb-3"></i>
                <h6>Configuration Required</h6>
                <p class="small">Please configure your GitLab connection above to view your groups and projects.</p>
            </div>
        `;
        
        // Reset statistics
        this.resetStatsDisplay();
    }

    // Reset statistics display
    resetStatsDisplay() {
        document.getElementById('totalGroups').textContent = '-';
        document.getElementById('totalSubgroups').textContent = '-';
        document.getElementById('totalProjects').textContent = '-';
        document.getElementById('lastUpdated').textContent = '-';
    }

    // Bind event listeners
    bindEvents() {
        // Form submission
        document.getElementById('configForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveConfigAndLoad();
        });

        // Enter key support for search
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchProjects();
        });
    }

    // Save configuration and load dashboard
    async saveConfigAndLoad() {
        const gitlabUrl = document.getElementById('gitlabUrl').value.trim();
        const accessToken = document.getElementById('accessToken').value.trim();

        if (!gitlabUrl || !accessToken) {
            this.showError('Please provide both GitLab URL and Access Token');
            return;
        }

        this.showLoading();
        
        // Clear any existing data
        this.showWelcomeState();

        try {
            const response = await fetch(`${this.baseApiUrl}/config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    gitlab_url: gitlabUrl,
                    access_token: accessToken
                })
            });

            const result = await response.json();

            if (response.ok) {
                this.showSuccess('Configuration saved successfully! Loading dashboard...');
                this.isConfigured = true;
                
                // Add a small delay to show success message
                setTimeout(async () => {
                    await this.loadDashboard();
                    this.checkHealth();
                }, 1000);
            } else {
                this.showError(result.error || 'Failed to save configuration');
                this.isConfigured = false;
                this.showWelcomeState();
            }
        } catch (error) {
            this.showError(`Network error: ${error.message}`);
            this.isConfigured = false;
            this.showWelcomeState();
        } finally {
            this.hideLoading();
        }
    }

    // Load the complete dashboard
    async loadDashboard() {
        if (!this.isConfigured) {
            this.showError('Please configure GitLab connection first');
            return;
        }

        this.showLoading();
        this.resetStats();

        try {
            const response = await fetch(`${this.baseApiUrl}/groups`);
            const result = await response.json();

            if (response.ok) {
                await this.renderTreeView(result.groups);
                this.loadStats();
            } else {
                this.showError(result.error || 'Failed to load groups');
            }
        } catch (error) {
            this.showError(`Failed to load dashboard: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    // Render the tree view in the left sidebar
    async renderTreeView(groups) {
        const treeContainer = document.getElementById('treeView');
        
        // Remove placeholder
        const placeholder = document.getElementById('treeViewPlaceholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        treeContainer.innerHTML = '';

        if (!groups || groups.length === 0) {
            treeContainer.innerHTML = `
                <div class="text-center text-muted p-4">
                    <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                    <h6>No Groups Found</h6>
                    <p class="small">No groups found or you don't have access to any groups.</p>
                </div>
            `;
            return;
        }

        // Update content area to show instruction
        document.getElementById('contentTitle').innerHTML = '<i class="fas fa-info-circle"></i> Select an item from the tree';
        document.getElementById('contentArea').innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-mouse-pointer fa-3x mb-3"></i>
                <h5>Groups Loaded Successfully!</h5>
                <p>Click on groups, subgroups, or projects in the left tree to view details</p>
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i>
                    Found ${groups.length} group(s) in your GitLab instance
                </div>
            </div>
        `;

        for (const group of groups) {
            const groupElement = await this.createTreeGroupElement(group);
            treeContainer.appendChild(groupElement);
        }
    }

    // Create tree group element
    async createTreeGroupElement(group) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'tree-group-container';

        try {
            // Get subgroups and projects for this group
            const [subgroupsResult, projectsResult] = await Promise.all([
                fetch(`${this.baseApiUrl}/groups/${group.id}/subgroups`),
                fetch(`${this.baseApiUrl}/groups/${group.id}/projects`)
            ]);

            const subgroups = subgroupsResult.ok ? (await subgroupsResult.json()).subgroups : [];
            const projects = projectsResult.ok ? (await projectsResult.json()).projects : [];

            const hasChildren = subgroups.length > 0 || projects.length > 0;

            groupDiv.innerHTML = `
                <div class="tree-item tree-group" onclick="dashboard.toggleTreeItem('group-${group.id}', this)" data-type="group" data-id="${group.id}">
                    <span class="tree-toggle ${hasChildren ? '' : 'invisible'}">${hasChildren ? '▶' : ''}</span>
                    <i class="fas fa-layer-group tree-icon"></i>
                    <span onclick="dashboard.showGroupDetails(${group.id}, event)">${this.escapeHtml(group.name)}</span>
                </div>
                <div class="tree-children" id="group-${group.id}">
                    ${this.renderTreeSubgroups(subgroups)}
                    ${this.renderTreeProjects(projects)}
                </div>
            `;

            return groupDiv;
        } catch (error) {
            console.error(`Error creating tree group for ${group.name}:`, error);
            groupDiv.innerHTML = `
                <div class="tree-item tree-group">
                    <i class="fas fa-exclamation-triangle tree-icon text-warning"></i>
                    <span>${this.escapeHtml(group.name)} (Error)</span>
                </div>
            `;
            return groupDiv;
        }
    }

    // Render tree subgroups
    renderTreeSubgroups(subgroups) {
        if (!subgroups || subgroups.length === 0) {
            return '';
        }

        let html = '';
        subgroups.forEach(subgroup => {
            html += `
                <div class="tree-subgroup-container">
                    <div class="tree-item tree-subgroup" onclick="dashboard.toggleTreeItem('subgroup-${subgroup.id}', this)" data-type="subgroup" data-id="${subgroup.id}">
                        <span class="tree-toggle">▶</span>
                        <i class="fas fa-folder tree-icon"></i>
                        <span onclick="dashboard.showSubgroupDetails(${subgroup.id}, event)">${this.escapeHtml(subgroup.name)}</span>
                    </div>
                    <div class="tree-children" id="subgroup-${subgroup.id}">
                        <div class="loading-tree">
                            <div class="spinner-border spinner-border-sm"></div>
                            <small class="d-block mt-1">Loading projects...</small>
                        </div>
                    </div>
                </div>
            `;
        });

        return html;
    }

    // Render tree projects
    renderTreeProjects(projects) {
        if (!projects || projects.length === 0) {
            return '';
        }

        let html = '';
        projects.forEach(project => {
            const visibilityIcon = project.visibility === 'private' ? 'fa-lock' : 
                                   project.visibility === 'internal' ? 'fa-shield-alt' : 'fa-globe';
            
            html += `
                <div class="tree-item tree-project" onclick="dashboard.showProjectDetails(${project.id})" data-type="project" data-id="${project.id}">
                    <span class="tree-toggle invisible"></span>
                    <i class="fas ${visibilityIcon} tree-icon"></i>
                    <span>${this.escapeHtml(project.name)}</span>
                </div>
            `;
        });

        return html;
    }

    // Toggle tree item (expand/collapse)
    toggleTreeItem(itemId, element) {
        const children = document.getElementById(itemId);
        const toggle = element.querySelector('.tree-toggle');
        
        if (!children || toggle.classList.contains('invisible')) return;

        if (children.classList.contains('show')) {
            children.classList.remove('show');
            toggle.textContent = '▶';
            toggle.classList.remove('expanded');
        } else {
            children.classList.add('show');
            toggle.textContent = '▼';
            toggle.classList.add('expanded');
            
            // Load subgroup projects if needed
            if (element.dataset.type === 'subgroup') {
                this.loadSubgroupProjectsForTree(element.dataset.id);
            }
        }
    }

    // Load projects for a subgroup in tree view
    async loadSubgroupProjectsForTree(subgroupId) {
        const contentElement = document.getElementById(`subgroup-${subgroupId}`);
        if (!contentElement || contentElement.dataset.loaded === 'true') return;

        try {
            const response = await fetch(`${this.baseApiUrl}/groups/${subgroupId}/projects`);
            const result = await response.json();

            if (response.ok) {
                contentElement.innerHTML = this.renderTreeProjects(result.projects);
                contentElement.dataset.loaded = 'true';
            } else {
                contentElement.innerHTML = `<div class="text-warning small p-2">Error: ${result.error}</div>`;
            }
        } catch (error) {
            contentElement.innerHTML = `<div class="text-warning small p-2">Error loading projects</div>`;
        }
    }

    // Show group details in content area
    async showGroupDetails(groupId, event) {
        if (event) event.stopPropagation();
        
        this.setActiveTreeItem(event ? event.target.parentElement : null);
        
        try {
            const [groupResponse, subgroupsResponse, projectsResponse] = await Promise.all([
                fetch(`${this.baseApiUrl}/groups`),
                fetch(`${this.baseApiUrl}/groups/${groupId}/subgroups`),
                fetch(`${this.baseApiUrl}/groups/${groupId}/projects`)
            ]);

            const groupsResult = await groupResponse.json();
            const subgroupsResult = await subgroupsResponse.json();
            const projectsResult = await projectsResponse.json();

            const group = groupsResult.groups.find(g => g.id === groupId);
            const subgroups = subgroupsResult.subgroups || [];
            const projects = projectsResult.projects || [];

            if (group) {
                document.getElementById('contentTitle').innerHTML = `<i class="fas fa-layer-group"></i> ${this.escapeHtml(group.name)}`;
                document.getElementById('contentArea').innerHTML = `
                    <div class="content-header">
                        <h5>${this.escapeHtml(group.name)}</h5>
                        ${group.description ? `<p class="text-muted">${this.escapeHtml(group.description)}</p>` : ''}
                        <div class="row">
                            <div class="col-md-4">
                                <small class="text-muted">Subgroups: </small>
                                <span class="badge bg-info">${subgroups.length}</span>
                            </div>
                            <div class="col-md-4">
                                <small class="text-muted">Direct Projects: </small>
                                <span class="badge bg-success">${projects.length}</span>
                            </div>
                            <div class="col-md-4">
                                <small class="text-muted">Visibility: </small>
                                <span class="badge bg-secondary">${group.visibility || 'Unknown'}</span>
                            </div>
                        </div>
                    </div>
                    
                    ${subgroups.length > 0 ? `
                        <div class="content-section">
                            <h6><i class="fas fa-sitemap"></i> Subgroups</h6>
                            <div class="row">
                                ${subgroups.map(subgroup => `
                                    <div class="col-md-6 mb-3">
                                        <div class="card">
                                            <div class="card-body">
                                                <h6>${this.escapeHtml(subgroup.name)}</h6>
                                                ${subgroup.description ? `<p class="small text-muted">${this.escapeHtml(subgroup.description)}</p>` : ''}
                                                <button class="btn btn-sm btn-outline-primary" onclick="dashboard.showSubgroupDetails(${subgroup.id})">
                                                    <i class="fas fa-eye"></i> View Details
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${projects.length > 0 ? `
                        <div class="content-section">
                            <h6><i class="fas fa-code-branch"></i> Direct Projects</h6>
                            ${this.renderProjectCards(projects)}
                        </div>
                    ` : '<div class="alert alert-info">No direct projects in this group</div>'}
                `;
            }
        } catch (error) {
            this.showError(`Failed to load group details: ${error.message}`);
        }
    }

    // Show subgroup details in content area
    async showSubgroupDetails(subgroupId, event) {
        if (event) event.stopPropagation();
        
        this.setActiveTreeItem(event ? event.target.parentElement : null);
        
        try {
            const response = await fetch(`${this.baseApiUrl}/groups/${subgroupId}/projects`);
            const result = await response.json();

            if (response.ok) {
                // Find subgroup info from tree
                const subgroupElement = document.querySelector(`[data-type="subgroup"][data-id="${subgroupId}"]`);
                const subgroupName = subgroupElement ? subgroupElement.textContent.trim() : 'Subgroup';
                
                document.getElementById('contentTitle').innerHTML = `<i class="fas fa-folder"></i> ${subgroupName}`;
                document.getElementById('contentArea').innerHTML = `
                    <div class="content-header">
                        <h5>${subgroupName}</h5>
                        <div class="row">
                            <div class="col-md-6">
                                <small class="text-muted">Projects: </small>
                                <span class="badge bg-success">${result.projects.length}</span>
                            </div>
                            <div class="col-md-6">
                                <small class="text-muted">ID: </small>
                                <span class="badge bg-secondary">${subgroupId}</span>
                            </div>
                        </div>
                    </div>
                    
                    ${result.projects.length > 0 ? `
                        <div class="content-section">
                            <h6><i class="fas fa-code-branch"></i> Projects</h6>
                            ${this.renderProjectCards(result.projects)}
                        </div>
                    ` : '<div class="alert alert-info">No projects in this subgroup</div>'}
                `;
            } else {
                this.showError(`Failed to load subgroup details: ${result.error}`);
            }
        } catch (error) {
            this.showError(`Failed to load subgroup details: ${error.message}`);
        }
    }

    // Render subgroups
    renderSubgroups(subgroups) {
        if (!subgroups || subgroups.length === 0) {
            return '';
        }

        let html = '<h6><i class="fas fa-sitemap"></i> Subgroups</h6>';
        
        subgroups.forEach(subgroup => {
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

        // Add event listeners for lazy loading
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

    // Load projects for a subgroup
    async loadSubgroupProjects(subgroupId) {
        const contentElement = document.getElementById(`subgroup-content-${subgroupId}`);
        if (!contentElement) return;

        try {
            const response = await fetch(`${this.baseApiUrl}/groups/${subgroupId}/projects`);
            const result = await response.json();

            if (response.ok) {
                contentElement.innerHTML = this.renderProjects(result.projects, 'Projects');
            } else {
                contentElement.innerHTML = `<div class="alert alert-warning">Error: ${result.error}</div>`;
            }
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
                            <button class="btn btn-sm btn-outline-info ms-2" onclick="dashboard.showProjectDetails(${project.id})">
                                <i class="fas fa-info-circle"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        return html;
    }

    // Search projects with better state management
    async searchProjects() {
        const searchTerm = document.getElementById('searchInput').value.trim();
        if (!searchTerm) {
            this.showError('Please enter a search term');
            return;
        }

        if (!this.isConfigured) {
            this.showError('Please configure GitLab connection first');
            return;
        }

        const resultsContainer = document.getElementById('searchResults');
        resultsContainer.innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm"></div> Searching...</div>';

        try {
            const response = await fetch(`${this.baseApiUrl}/search/projects?q=${encodeURIComponent(searchTerm)}`);
            const result = await response.json();

            if (response.ok) {
                if (result.projects && result.projects.length > 0) {
                    resultsContainer.innerHTML = `
                        <h6>Search Results (${result.count} found)</h6>
                        ${this.renderProjectCards(result.projects)}
                    `;
                } else {
                    resultsContainer.innerHTML = '<div class="alert alert-info">No projects found matching your search.</div>';
                }
            } else {
                resultsContainer.innerHTML = `<div class="alert alert-danger">Search failed: ${result.error}</div>`;
            }
        } catch (error) {
            resultsContainer.innerHTML = `<div class="alert alert-danger">Search error: ${error.message}</div>`;
        }
    }

    // Clear search results
    clearSearch() {
        document.getElementById('searchInput').value = '';
        document.getElementById('searchResults').innerHTML = '';
    }

    // Show project details in modal or content area
    async showProjectDetails(projectId, event) {
        if (event) event.stopPropagation();
        
        this.setActiveTreeItem(event ? event.target : null);
        
        try {
            // Fetch project details, pipelines, and branches in parallel
            const [projectResponse, pipelinesResponse, branchesResponse] = await Promise.all([
                fetch(`${this.baseApiUrl}/projects/${projectId}`),
                fetch(`${this.baseApiUrl}/projects/${projectId}/pipelines`),
                fetch(`${this.baseApiUrl}/projects/${projectId}/branches`)
            ]);

            const projectResult = await projectResponse.json();
            const pipelinesResult = pipelinesResponse.ok ? await pipelinesResponse.json() : { pipelines: [], count: 0 };
            const branchesResult = branchesResponse.ok ? await branchesResponse.json() : { branches: [], count: 0 };

            if (projectResponse.ok && projectResult.success !== false) {
                // Handle different response formats - either direct project data or nested in 'project'
                const project = projectResult.project || projectResult;
                const projectName = project.name || 'Unknown Project';
                const projectDescription = project.description || '';
                const projectWebUrl = project.web_url || '#';
                const projectVisibility = project.visibility || 'unknown';
                const starCount = project.star_count || 0;
                const forksCount = project.forks_count || 0;
                const openIssuesCount = project.open_issues_count || 0;
                
                // Handle pipeline and branch counts
                const pipelineCount = pipelinesResult.pipelines ? pipelinesResult.pipelines.length : 0;
                const branchCount = branchesResult.branches ? branchesResult.branches.length : 0;
                
                document.getElementById('contentTitle').innerHTML = `<i class="fas fa-project-diagram"></i> ${this.escapeHtml(projectName)}`;
                document.getElementById('contentArea').innerHTML = `
                    <div class="content-header">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h5>${this.escapeHtml(projectName)}</h5>
                                ${projectDescription ? `<p class="text-muted">${this.escapeHtml(projectDescription)}</p>` : ''}
                            </div>
                            <a href="${projectWebUrl}" target="_blank" class="btn btn-primary">
                                <i class="fas fa-external-link-alt"></i> Open in GitLab
                            </a>
                        </div>
                        
                        <div class="row mt-3">
                            <div class="col-md-3">
                                <small class="text-muted">Visibility:</small><br>
                                <span class="badge ${projectVisibility === 'private' ? 'bg-danger' : projectVisibility === 'internal' ? 'bg-warning' : 'bg-success'}">${projectVisibility}</span>
                            </div>
                            <div class="col-md-3">
                                <small class="text-muted">Stars:</small><br>
                                <span class="badge bg-warning"><i class="fas fa-star"></i> ${starCount}</span>
                            </div>
                            <div class="col-md-3">
                                <small class="text-muted">Forks:</small><br>
                                <span class="badge bg-info"><i class="fas fa-code-branch"></i> ${forksCount}</span>
                            </div>
                            <div class="col-md-3">
                                <small class="text-muted">Issues:</small><br>
                                <span class="badge bg-secondary"><i class="fas fa-exclamation-circle"></i> ${openIssuesCount}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Navigation Tabs -->
                    <ul class="nav nav-tabs mt-4" id="projectTabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="overview-tab" data-bs-toggle="tab" data-bs-target="#overview" type="button">
                                <i class="fas fa-info-circle"></i> Overview
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="pipelines-tab" data-bs-toggle="tab" data-bs-target="#pipelines" type="button">
                                <i class="fas fa-cogs"></i> Pipelines <span class="badge bg-primary ms-1">${pipelineCount}</span>
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="branches-tab" data-bs-toggle="tab" data-bs-target="#branches" type="button">
                                <i class="fas fa-code-branch"></i> Branches <span class="badge bg-success ms-1">${branchCount}</span>
                            </button>
                        </li>
                    </ul>
                    
                    <!-- Tab Content -->
                    <div class="tab-content mt-3" id="projectTabContent">
                        <!-- Overview Tab -->
                        <div class="tab-pane fade show active" id="overview" role="tabpanel">
                            ${this.renderProjectOverview(project)}
                        </div>
                        
                        <!-- Pipelines Tab -->
                        <div class="tab-pane fade" id="pipelines" role="tabpanel">
                            ${this.renderProjectPipelines(pipelinesResult.pipelines, projectId)}
                        </div>
                        
                        <!-- Branches Tab -->
                        <div class="tab-pane fade" id="branches" role="tabpanel">
                            ${this.renderProjectBranches(branchesResult.branches, projectId)}
                        </div>
                    </div>
                `;
            } else {
                const errorMsg = projectResult.error || 'Failed to load project details';
                this.showError(`Failed to load project details: ${errorMsg}`);
            }
        } catch (error) {
            this.showError(`Error loading project details: ${error.message}`);
        }
    }

    // Render project overview tab
    renderProjectOverview(project) {
        // Safely access project properties
        const projectData = project.project || project; // Handle different data structures
        const createdAt = projectData.created_at || new Date().toISOString();
        const lastActivity = projectData.last_activity_at || projectData.updated_at || new Date().toISOString();
        const defaultBranch = projectData.default_branch || 'main';
        const starCount = projectData.star_count || 0;
        const forksCount = projectData.forks_count || 0;
        const openIssuesCount = projectData.open_issues_count || 0;
        const mergeRequestsEnabled = projectData.merge_requests_enabled !== false;
        const wikiEnabled = projectData.wiki_enabled !== false;
        const topics = projectData.topics || [];
        const webUrl = projectData.web_url || '#';
        
        return `
            <div class="row">
                <div class="col-md-6">
                    <h6><i class="fas fa-info-circle"></i> Project Information</h6>
                    <table class="table table-sm">
                        <tr>
                            <td><strong>Created:</strong></td>
                            <td>${new Date(createdAt).toLocaleDateString()}</td>
                        </tr>
                        <tr>
                            <td><strong>Last Activity:</strong></td>
                            <td>${this.formatDate(lastActivity)}</td>
                        </tr>
                        <tr>
                            <td><strong>Default Branch:</strong></td>
                            <td><code>${defaultBranch}</code></td>
                        </tr>
                        <tr>
                            <td><strong>Project ID:</strong></td>
                            <td><code>${projectData.id}</code></td>
                        </tr>
                        ${topics.length > 0 ? `
                        <tr>
                            <td><strong>Topics:</strong></td>
                            <td>${topics.map(topic => `<span class="badge bg-light text-dark me-1">${topic}</span>`).join('')}</td>
                        </tr>
                        ` : ''}
                    </table>
                </div>
                <div class="col-md-6">
                    <h6><i class="fas fa-chart-bar"></i> Statistics</h6>
                    <div class="row">
                        <div class="col-6 mb-3">
                            <div class="card text-center">
                                <div class="card-body py-2">
                                    <h5 class="text-primary">${starCount}</h5>
                                    <small>Stars</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 mb-3">
                            <div class="card text-center">
                                <div class="card-body py-2">
                                    <h5 class="text-info">${forksCount}</h5>
                                    <small>Forks</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 mb-3">
                            <div class="card text-center">
                                <div class="card-body py-2">
                                    <h5 class="text-warning">${openIssuesCount}</h5>
                                    <small>Open Issues</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 mb-3">
                            <div class="card text-center">
                                <div class="card-body py-2">
                                    <h5 class="text-success">${mergeRequestsEnabled ? 'Enabled' : 'Disabled'}</h5>
                                    <small>Merge Requests</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="content-section">
                <h6><i class="fas fa-link"></i> Quick Links</h6>
                <div class="d-flex flex-wrap gap-2">
                    <a href="${webUrl}" target="_blank" class="btn btn-outline-primary btn-sm">
                        <i class="fas fa-home"></i> Project Home
                    </a>
                    <a href="${webUrl}/-/tree/${defaultBranch}" target="_blank" class="btn btn-outline-secondary btn-sm">
                        <i class="fas fa-code"></i> Source Code
                    </a>
                    <a href="${webUrl}/-/issues" target="_blank" class="btn btn-outline-warning btn-sm">
                        <i class="fas fa-exclamation-circle"></i> Issues
                    </a>
                    <a href="${webUrl}/-/merge_requests" target="_blank" class="btn btn-outline-info btn-sm">
                        <i class="fas fa-code-branch"></i> Merge Requests
                    </a>
                    <a href="${webUrl}/-/pipelines" target="_blank" class="btn btn-outline-success btn-sm">
                        <i class="fas fa-cogs"></i> Pipelines
                    </a>
                    ${wikiEnabled ? `<a href="${webUrl}/-/wikis/home" target="_blank" class="btn btn-outline-success btn-sm">
                        <i class="fas fa-book"></i> Wiki
                    </a>` : ''}
                </div>
            </div>
        `;
    }

    // Render project pipelines tab
    renderProjectPipelines(pipelines, projectId) {
        if (!pipelines || pipelines.length === 0) {
            return `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    No pipelines found for this project. This might be because:
                    <ul class="mb-0 mt-2">
                        <li>No CI/CD pipelines have been configured</li>
                        <li>No pipelines have been run yet</li>
                        <li>Pipeline data hasn't been synced yet</li>
                    </ul>
                    <div class="mt-3">
                        <button class="btn btn-sm btn-outline-primary" onclick="triggerProjectSync(${projectId})">
                            <i class="fas fa-sync-alt"></i> Sync Pipeline Data
                        </button>
                    </div>
                </div>
            `;
        }

        return `
            <h6><i class="fas fa-cogs"></i> Recent Pipelines</h6>
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Pipeline ID</th>
                            <th>Branch/Tag</th>
                            <th>Commit</th>
                            <th>Created</th>
                            <th>Duration</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pipelines.map(pipeline => {
                            const status = pipeline.status || 'unknown';
                            const statusClass = this.getPipelineStatusClass(status);
                            const statusIcon = this.getPipelineStatusIcon(status);
                            const ref = pipeline.ref || 'unknown';
                            const sha = pipeline.sha || '';
                            const createdAt = pipeline.created_at || new Date().toISOString();
                            const duration = pipeline.duration || 0;
                            const webUrl = pipeline.web_url || '#';
                            
                            return `
                                <tr>
                                    <td>
                                        <span class="badge ${statusClass}">
                                            <i class="fas ${statusIcon}"></i> ${status}
                                        </span>
                                    </td>
                                    <td>
                                        <a href="#" onclick="dashboard.showPipelineDetails(${projectId}, ${pipeline.id})" class="text-decoration-none">
                                            #${pipeline.id}
                                        </a>
                                    </td>
                                    <td>
                                        <code>${ref}</code>
                                    </td>
                                    <td>
                                        <small class="text-muted">
                                            ${sha ? sha.substring(0, 8) : 'N/A'}
                                        </small>
                                    </td>
                                    <td>
                                        <small>${this.formatDate(createdAt)}</small>
                                    </td>
                                    <td>
                                        <small>${duration > 0 ? this.formatDuration(duration) : 'N/A'}</small>
                                    </td>
                                    <td>
                                        <a href="${webUrl}" target="_blank" class="btn btn-sm btn-outline-primary">
                                            <i class="fas fa-external-link-alt"></i>
                                        </a>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Render project branches tab
    renderProjectBranches(branches, projectId) {
        if (!branches || branches.length === 0) {
            return `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    No branches found for this project. This might be because:
                    <ul class="mb-0 mt-2">
                        <li>This is an empty repository</li>
                        <li>Branch data hasn't been synced yet</li>
                        <li>You don't have access to view branches</li>
                    </ul>
                    <div class="mt-3">
                        <button class="btn btn-sm btn-outline-primary" onclick="triggerProjectSync(${projectId})">
                            <i class="fas fa-sync-alt"></i> Sync Branch Data
                        </button>
                    </div>
                </div>
            `;
        }

        return `
            <h6><i class="fas fa-code-branch"></i> Repository Branches</h6>
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Branch Name</th>
                            <th>Last Commit</th>
                            <th>Committer</th>
                            <th>Commit Date</th>
                            <th>Protected</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${branches.map(branch => {
                            const branchName = branch.name || 'unknown';
                            const isDefault = branch.default || false;
                            const isProtected = branch.protected || false;
                            const commit = branch.commit || {};
                            const commitMessage = commit.message || 'No commit message';
                            const committerName = commit.committer_name || commit.author_name || 'Unknown';
                            const committedDate = commit.committed_date || commit.authored_date || new Date().toISOString();
                            const webUrl = branch.web_url || '#';
                            
                            return `
                                <tr>
                                    <td>
                                        <strong>
                                            <i class="fas fa-code-branch text-success"></i>
                                            ${this.escapeHtml(branchName)}
                                            ${isDefault ? '<span class="badge bg-primary ms-1">default</span>' : ''}
                                        </strong>
                                    </td>
                                    <td>
                                        <small class="text-muted">
                                            ${commitMessage.length > 50 ? commitMessage.substring(0, 50) + '...' : commitMessage}
                                        </small>
                                    </td>
                                    <td>
                                        <small>${this.escapeHtml(committerName)}</small>
                                    </td>
                                    <td>
                                        <small>${this.formatDate(committedDate)}</small>
                                    </td>
                                    <td>
                                        <span class="badge ${isProtected ? 'bg-warning' : 'bg-success'}">
                                            <i class="fas ${isProtected ? 'fa-shield-alt' : 'fa-unlock'}"></i>
                                            ${isProtected ? 'Protected' : 'Open'}
                                        </span>
                                    </td>
                                    <td>
                                        <a href="${webUrl}" target="_blank" class="btn btn-sm btn-outline-primary">
                                            <i class="fas fa-external-link-alt"></i>
                                        </a>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Render project cards
    renderProjectCards(projects) {
        if (!projects || projects.length === 0) {
            return '<div class="alert alert-info">No projects found</div>';
        }

        return projects.map(project => {
            // Safely access properties with fallbacks
            const visibility = project.visibility || 'unknown';
            const visibilityClass = visibility === 'private' ? 'bg-danger' : 
                                   visibility === 'internal' ? 'bg-warning' : 'bg-success';
            const starCount = project.star_count || 0;
            const forksCount = project.forks_count || 0;
            const lastActivity = project.last_activity_at || project.updated_at || new Date().toISOString();
            const description = project.description || '';
            const projectName = project.name || 'Unknown Project';
            
            return `
                <div class="project-card" onclick="dashboard.showProjectDetails(${project.id})">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h6 class="mb-1">
                                <i class="fas fa-project-diagram me-2"></i>
                                ${this.escapeHtml(projectName)}
                            </h6>
                            ${description ? `<p class="text-muted small mb-2">${this.escapeHtml(description)}</p>` : ''}
                            <div class="d-flex align-items-center gap-2">
                                <span class="badge ${visibilityClass} badge-visibility">${visibility}</span>
                                ${starCount > 0 ? `<span class="text-warning small"><i class="fas fa-star"></i> ${starCount}</span>` : ''}
                                ${forksCount > 0 ? `<span class="text-info small"><i class="fas fa-code-branch"></i> ${forksCount}</span>` : ''}
                                <span class="text-muted small"><i class="fas fa-clock"></i> ${this.formatDate(lastActivity)}</span>
                            </div>
                        </div>
                        <div class="text-end">
                            <small class="text-muted">ID: ${project.id}</small>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Set active tree item
    setActiveTreeItem(element) {
        // Remove active class from all tree items
        document.querySelectorAll('.tree-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked item
        if (element && element.classList.contains('tree-item')) {
            element.classList.add('active');
        }
    }

    // Show pipeline details
    async showPipelineDetails(projectId, pipelineId) {
        try {
            const response = await fetch(`${this.baseApiUrl}/projects/${projectId}/pipelines/${pipelineId}`);
            const pipeline = await response.json();

            if (response.ok) {
                // Create and show modal with pipeline details
                const modalHtml = `
                    <div class="modal fade" id="pipelineModal" tabindex="-1">
                        <div class="modal-dialog modal-lg">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">
                                        <i class="fas fa-cogs"></i> Pipeline #${pipeline.id}
                                        <span class="badge ${this.getPipelineStatusClass(pipeline.status)} ms-2">
                                            <i class="fas ${this.getPipelineStatusIcon(pipeline.status)}"></i> ${pipeline.status}
                                        </span>
                                    </h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <p><strong>Branch/Tag:</strong> <code>${pipeline.ref}</code></p>
                                            <p><strong>Commit:</strong> <code>${pipeline.sha ? pipeline.sha.substring(0, 8) : 'N/A'}</code></p>
                                            <p><strong>Created:</strong> ${new Date(pipeline.created_at).toLocaleString()}</p>
                                            <p><strong>Duration:</strong> ${pipeline.duration ? this.formatDuration(pipeline.duration) : 'N/A'}</p>
                                        </div>
                                        <div class="col-md-6">
                                            <p><strong>User:</strong> ${pipeline.user ? this.escapeHtml(pipeline.user.name) : 'N/A'}</p>
                                            <p><strong>Started:</strong> ${pipeline.started_at ? new Date(pipeline.started_at).toLocaleString() : 'N/A'}</p>
                                            <p><strong>Finished:</strong> ${pipeline.finished_at ? new Date(pipeline.finished_at).toLocaleString() : 'N/A'}</p>
                                            <p><strong>Coverage:</strong> ${pipeline.coverage ? pipeline.coverage + '%' : 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <a href="${pipeline.web_url}" target="_blank" class="btn btn-primary">
                                        <i class="fas fa-external-link-alt"></i> View in GitLab
                                    </a>
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Remove existing modal if any
                const existingModal = document.getElementById('pipelineModal');
                if (existingModal) existingModal.remove();
                
                // Add modal to page and show
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                const modal = new bootstrap.Modal(document.getElementById('pipelineModal'));
                modal.show();
            } else {
                this.showError(`Failed to load pipeline details: ${pipeline.error}`);
            }
        } catch (error) {
            this.showError(`Error loading pipeline details: ${error.message}`);
        }
    }

    // Get pipeline status CSS class
    getPipelineStatusClass(status) {
        const statusMap = {
            'success': 'bg-success',
            'failed': 'bg-danger',
            'running': 'bg-primary',
            'pending': 'bg-warning',
            'canceled': 'bg-secondary',
            'skipped': 'bg-info',
            'created': 'bg-light text-dark'
        };
        return statusMap[status] || 'bg-secondary';
    }

    // Get pipeline status icon
    getPipelineStatusIcon(status) {
        const iconMap = {
            'success': 'fa-check-circle',
            'failed': 'fa-times-circle',
            'running': 'fa-spinner fa-spin',
            'pending': 'fa-clock',
            'canceled': 'fa-ban',
            'skipped': 'fa-forward',
            'created': 'fa-plus-circle'
        };
        return iconMap[status] || 'fa-question-circle';
    }

    // Format duration in seconds to human readable
    formatDuration(seconds) {
        if (!seconds) return 'N/A';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    // Load statistics
    async loadStats() {
        try {
            const response = await fetch(`${this.baseApiUrl}/dashboard/stats`);
            const stats = await response.json();

            if (response.ok) {
                document.getElementById('totalGroups').textContent = stats.total_groups;
                document.getElementById('totalSubgroups').textContent = stats.total_subgroups;
                document.getElementById('totalProjects').textContent = stats.total_projects;
                document.getElementById('lastUpdated').textContent = new Date(stats.last_updated).toLocaleTimeString();
            } else {
                console.error('Failed to load stats:', stats.error);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    // Check API health
    async checkHealth() {
        try {
            const response = await fetch(`${this.baseApiUrl}/health`);
            const health = await response.json();

            if (response.ok) {
                document.getElementById('backendStatus').textContent = health.status;
                document.getElementById('backendStatus').className = 'badge bg-success';
                document.getElementById('configStatus').textContent = health.configured ? 'Configured' : 'Not Set';
                document.getElementById('configStatus').className = health.configured ? 'badge bg-success' : 'badge bg-warning';
                document.getElementById('lastHealthCheck').textContent = new Date().toLocaleTimeString();
                this.isConfigured = health.configured;
                
                // If configured, automatically load dashboard data
                if (health.configured) {
                    await this.loadDashboard();
                } else {
                    this.showWelcomeState();
                }
            } else {
                document.getElementById('backendStatus').textContent = 'Error';
                document.getElementById('backendStatus').className = 'badge bg-danger';
                this.showWelcomeState();
            }
        } catch (error) {
            document.getElementById('backendStatus').textContent = 'Offline';
            document.getElementById('backendStatus').className = 'badge bg-danger';
            console.error('Health check failed:', error);
            this.showWelcomeState();
        }
    }

    // Refresh dashboard
    refreshDashboard() {
        if (this.isConfigured) {
            this.showLoading();
            this.loadDashboard();
        } else {
            this.showError('Please configure GitLab connection first');
            this.showWelcomeState();
        }
    }

    // Load statistics with better error handling
    async loadStats() {
        if (!this.isConfigured) {
            this.resetStatsDisplay();
            return;
        }

        try {
            const response = await fetch(`${this.baseApiUrl}/dashboard/stats`);
            const stats = await response.json();

            if (response.ok) {
                document.getElementById('totalGroups').textContent = stats.total_groups;
                document.getElementById('totalSubgroups').textContent = stats.total_subgroups;
                document.getElementById('totalProjects').textContent = stats.total_projects;
                document.getElementById('lastUpdated').textContent = new Date(stats.last_updated).toLocaleTimeString();
            } else {
                console.error('Failed to load stats:', stats.error);
                this.resetStatsDisplay();
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            this.resetStatsDisplay();
        }
    }

    // Reset statistics
    resetStats() {
        this.stats = { totalGroups: 0, totalSubgroups: 0, totalProjects: 0 };
    }

    // Show loading indicator
    showLoading() {
        document.getElementById('loadingIndicator').classList.remove('d-none');
        document.getElementById('errorAlert').classList.add('d-none');
        document.getElementById('successAlert').classList.add('d-none');
    }

    // Hide loading indicator
    hideLoading() {
        document.getElementById('loadingIndicator').classList.add('d-none');
    }

    // Show error message
    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorAlert').classList.remove('d-none');
        document.getElementById('successAlert').classList.add('d-none');
        this.hideLoading();
    }

    // Show success message
    showSuccess(message) {
        document.getElementById('successMessage').textContent = message;
        document.getElementById('successAlert').classList.remove('d-none');
        document.getElementById('errorAlert').classList.add('d-none');
        setTimeout(() => {
            document.getElementById('successAlert').classList.add('d-none');
        }, 3000);
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

// Global functions (called from HTML)
function refreshDashboard() {
    dashboard.refreshDashboard();
}

function searchProjects() {
    dashboard.searchProjects();
}

function clearSearch() {
    dashboard.clearSearch();
}

function loadStats() {
    dashboard.loadStats();
}

function checkHealth() {
    dashboard.checkHealth();
}

function handleSearchKeypress(event) {
    if (event.key === 'Enter') {
        dashboard.searchProjects();
    }
}

// Trigger full synchronization
async function triggerFullSync() {
    const syncButton = document.getElementById('syncButton');
    const syncIcon = document.getElementById('syncIcon');
    
    try {
        // Show loading state
        syncButton.disabled = true;
        syncIcon.classList.add('fa-spin');
        
        // Show loading message
        const alertDiv = document.getElementById('alertContainer');
        alertDiv.innerHTML = `
            <div class="alert alert-info alert-dismissible fade show" role="alert">
                <i class="fas fa-sync-alt fa-spin"></i> Starting data synchronization...
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        const response = await fetch('/api/sync/full', {
            method: 'POST'
        });

        const result = await response.json();

        if (response.ok) {
            alertDiv.innerHTML = `
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    <i class="fas fa-check-circle"></i> Synchronization completed! 
                    Updated: ${result.results.groups.success} groups, ${result.results.projects.success} projects, ${result.results.pipelines.success} pipelines, ${result.results.branches.success} branches
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            
            // Reload page to show fresh data
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            alertDiv.innerHTML = `
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    <i class="fas fa-exclamation-triangle"></i> Synchronization failed: ${result.error || 'Unknown error'}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
        }
    } catch (error) {
        const alertDiv = document.getElementById('alertContainer');
        alertDiv.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="fas fa-exclamation-triangle"></i> Sync error: ${error.message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    } finally {
        syncButton.disabled = false;
        syncIcon.classList.remove('fa-spin');
    }
}

// Trigger project synchronization
async function triggerProjectSync(projectId) {
    try {
        const response = await fetch(`/api/sync/project/${projectId}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            const result = await response.json();
            dashboard.showSuccess('Project data synchronized successfully!');
            // Refresh the project details
            setTimeout(() => {
                dashboard.showProjectDetails(projectId);
            }, 1000);
        } else {
            const error = await response.json();
            dashboard.showError(`Sync failed: ${error.error}`);
        }
    } catch (error) {
        dashboard.showError(`Sync error: ${error.message}`);
    }
}

// Initialize dashboard when page loads
const dashboard = new GitLabDashboardFlask();
document.addEventListener('DOMContentLoaded', () => {
    dashboard.init();
});
