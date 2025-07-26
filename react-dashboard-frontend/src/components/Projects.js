import React, { useState } from 'react';
import { Card, Row, Col, Spinner, Alert, Button, Form, InputGroup, Badge, Modal, Nav } from 'react-bootstrap';
import { useQuery } from 'react-query';
import moment from 'moment';

const Projects = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'search'

  // Get all user projects directly (faster)
  const { data: allProjects, isLoading: allProjectsLoading, error: allProjectsError } = useQuery(
    'all-projects',
    () => fetch('/api/projects').then(res => res.json()),
    {
      enabled: activeTab === 'all',
    }
  );

  // Search projects query
  const { data: searchResults, isLoading: searchLoading, refetch: searchRefetch } = useQuery(
    ['search-projects', searchTerm],
    () => fetch(`/api/search/projects?q=${encodeURIComponent(searchTerm)}`).then(res => res.json()),
    {
      enabled: false, // Only run when manually triggered
    }
  );

  // Project details query
  const { data: projectDetails, isLoading: detailsLoading } = useQuery(
    ['project-details', selectedProject?.id],
    () => fetch(`/api/projects/${selectedProject.id}`).then(res => res.json()),
    {
      enabled: !!selectedProject,
    }
  );

  // Project pipelines query
  const { data: projectPipelines } = useQuery(
    ['project-pipelines', selectedProject?.id],
    () => fetch(`/api/projects/${selectedProject.id}/pipelines`).then(res => res.json()),
    {
      enabled: !!selectedProject,
    }
  );

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setActiveTab('search');
      searchRefetch();
    }
  };

  const handleProjectClick = (project) => {
    setSelectedProject(project);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedProject(null);
  };

  const switchToAllProjects = () => {
    setActiveTab('all');
    setSearchTerm('');
  };

  const getCurrentProjects = () => {
    if (activeTab === 'all') {
      return allProjects?.projects || [];
    }
    return searchResults?.projects || [];
  };

  const isCurrentlyLoading = () => {
    if (activeTab === 'all') {
      return allProjectsLoading;
    }
    return searchLoading;
  };

  const getCurrentError = () => {
    if (activeTab === 'all') {
      return allProjectsError;
    }
    return null;
  };

  const getPipelineStatusColor = (status) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'danger';
      case 'running': return 'primary';
      case 'pending': return 'warning';
      default: return 'secondary';
    }
  };

  const getPipelineStatusIcon = (status) => {
    switch (status) {
      case 'success': return 'fa-check-circle';
      case 'failed': return 'fa-times-circle';
      case 'running': return 'fa-spinner fa-spin';
      case 'pending': return 'fa-clock';
      default: return 'fa-question-circle';
    }
  };

  const projects = getCurrentProjects();
  const isLoading = isCurrentlyLoading();
  const error = getCurrentError();

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-gradient">
          <i className="fas fa-project-diagram me-2"></i>
          Projects
        </h2>
      </div>

      {/* Navigation tabs */}
      <Nav variant="tabs" className="mb-3">
        <Nav.Item>
          <Nav.Link 
            active={activeTab === 'all'} 
            onClick={switchToAllProjects}
            style={{ cursor: 'pointer' }}
          >
            <i className="fas fa-list me-1"></i>
            All Projects {allProjects?.count && `(${allProjects.count})`}
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={activeTab === 'search'} 
            onClick={() => setActiveTab('search')}
            style={{ cursor: 'pointer' }}
          >
            <i className="fas fa-search me-1"></i>
            Search Results {searchResults?.count && `(${searchResults.count})`}
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {/* Search Form */}
      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={handleSearch}>
            <InputGroup className="search-bar">
              <Form.Control
                type="text"
                placeholder="Search for projects by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={searchLoading}
              />
              <Button 
                type="submit" 
                variant="primary" 
                disabled={searchLoading || !searchTerm.trim()}
              >
                {searchLoading ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <i className="fas fa-search"></i>
                )}
              </Button>
            </InputGroup>
          </Form>
        </Card.Body>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center">
          <Spinner animation="border" className="mb-3" />
          <p className="text-muted">
            {activeTab === 'all' ? 'Loading all your projects...' : 'Searching projects...'}
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="danger">
          <i className="fas fa-exclamation-triangle me-2"></i>
          Error loading projects: {error.message}
        </Alert>
      )}

      {/* Search Results Info */}
      {activeTab === 'search' && searchResults && searchResults.success && (
        <Alert variant="info" className="alert-custom mb-4">
          <i className="fas fa-info-circle me-2"></i>
          Found {searchResults.count} project(s) matching "{searchTerm}" 
          <strong> (complete results, no pagination limits)</strong>
        </Alert>
      )}

      {/* All Projects Info */}
      {activeTab === 'all' && allProjects && (
        <Alert variant="success" className="alert-custom mb-4">
          <i className="fas fa-check-circle me-2"></i>
          Showing all {allProjects.total_count} of your projects
          {allProjects.loading_time && (
            <span className="text-muted"> (loaded in {allProjects.loading_time})</span>
          )}
        </Alert>
      )}

      {/* No Results */}
      {!isLoading && projects.length === 0 && activeTab === 'search' && searchTerm && (
        <Alert variant="warning">
          <i className="fas fa-search me-2"></i>
          No projects found matching "{searchTerm}". Try a different search term.
        </Alert>
      )}

      {!isLoading && projects.length === 0 && activeTab === 'search' && !searchTerm && (
        <Alert variant="info">
          <i className="fas fa-info-circle me-2"></i>
          Enter a search term to find specific projects.
        </Alert>
      )}

      {!isLoading && projects.length === 0 && activeTab === 'all' && (
        <Alert variant="warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          No projects found. Check your GitLab connection and permissions.
        </Alert>
      )}

      {/* Projects Grid */}
      {!isLoading && projects.length > 0 && (
        <Row>
          {projects.map(project => (
            <Col md={6} lg={4} key={project.id} className="mb-4">
              <Card 
                className="project-card h-100" 
                style={{ cursor: 'pointer' }}
                onClick={() => handleProjectClick(project)}
              >
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h6 className="card-title">
                      <i className={`fas ${
                        project.visibility === 'private' ? 'fa-lock' :
                        project.visibility === 'internal' ? 'fa-shield-alt' : 'fa-globe'
                      } me-2`}></i>
                      {project.name}
                    </h6>
                    <Badge bg={
                      project.visibility === 'private' ? 'danger' :
                      project.visibility === 'internal' ? 'warning' : 'success'
                    }>
                      {project.visibility}
                    </Badge>
                  </div>
                  
                  {project.description && (
                    <p className="card-text text-muted small">
                      {project.description.substring(0, 120)}
                      {project.description.length > 120 && '...'}
                    </p>
                  )}
                  
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div>
                      <Badge variant="outline-secondary" className="me-1">
                        <i className="fas fa-star me-1"></i>
                        {project.star_count || 0}
                      </Badge>
                      <Badge variant="outline-info" className="me-1">
                        <i className="fas fa-code-branch me-1"></i>
                        {project.forks_count || 0}
                      </Badge>
                      <Badge variant="outline-warning">
                        <i className="fas fa-exclamation-circle me-1"></i>
                        {project.open_issues_count || 0}
                      </Badge>
                    </div>
                    <small className="text-muted">
                      {moment(project.last_activity_at).fromNow()}
                    </small>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Project Details Modal */}
      <Modal show={showModal} onHide={closeModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-project-diagram me-2"></i>
            {selectedProject?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailsLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p className="mt-2">Loading project details...</p>
            </div>
          ) : projectDetails?.success ? (
            <div>
              {/* Project Info */}
              <div className="mb-4">
                <h6>Project Information</h6>
                <Row>
                  <Col md={6}>
                    <p><strong>Description:</strong></p>
                    <p className="text-muted">{projectDetails.project.description || 'No description'}</p>
                  </Col>
                  <Col md={6}>
                    <p><strong>Default Branch:</strong> <code>{projectDetails.project.default_branch}</code></p>
                    <p><strong>Created:</strong> {moment(projectDetails.project.created_at).format('MMM DD, YYYY')}</p>
                    <p><strong>Last Activity:</strong> {moment(projectDetails.project.last_activity_at).fromNow()}</p>
                  </Col>
                </Row>
              </div>

              {/* Statistics */}
              <div className="mb-4">
                <h6>Statistics</h6>
                <Row>
                  <Col md={3}>
                    <div className="text-center">
                      <div className="display-6 text-warning">
                        <i className="fas fa-star"></i>
                      </div>
                      <div className="fw-bold">{projectDetails.project.star_count || 0}</div>
                      <small className="text-muted">Stars</small>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center">
                      <div className="display-6 text-info">
                        <i className="fas fa-code-branch"></i>
                      </div>
                      <div className="fw-bold">{projectDetails.project.forks_count || 0}</div>
                      <small className="text-muted">Forks</small>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center">
                      <div className="display-6 text-danger">
                        <i className="fas fa-exclamation-circle"></i>
                      </div>
                      <div className="fw-bold">{projectDetails.project.open_issues_count || 0}</div>
                      <small className="text-muted">Issues</small>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="text-center">
                      <div className="display-6 text-success">
                        <i className="fas fa-code"></i>
                      </div>
                      <div className="fw-bold">{projectDetails.project.repository_size || 0}</div>
                      <small className="text-muted">Size (KB)</small>
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Recent Pipelines */}
              {projectPipelines && projectPipelines.success && (
                <div className="mb-4">
                  <h6>Recent Pipelines</h6>
                  {projectPipelines.pipelines.length > 0 ? (
                    <div className="list-group">
                      {projectPipelines.pipelines.slice(0, 5).map(pipeline => (
                        <div key={pipeline.id} className="list-group-item d-flex justify-content-between align-items-center">
                          <div>
                            <div className="d-flex align-items-center">
                              <i className={`fas ${getPipelineStatusIcon(pipeline.status)} me-2 text-${getPipelineStatusColor(pipeline.status)}`}></i>
                              <span className="fw-bold">#{pipeline.id}</span>
                              <Badge bg={getPipelineStatusColor(pipeline.status)} className="ms-2">
                                {pipeline.status}
                              </Badge>
                            </div>
                            <small className="text-muted">
                              <i className="fas fa-code-branch me-1"></i>
                              {pipeline.ref}
                            </small>
                          </div>
                          <small className="text-muted">
                            {moment(pipeline.created_at).fromNow()}
                          </small>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Alert variant="info">No pipelines found for this project.</Alert>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="d-flex gap-2">
                <Button 
                  variant="primary" 
                  href={projectDetails.project.web_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="fas fa-external-link-alt me-2"></i>
                  View in GitLab
                </Button>
                {projectDetails.project.http_url_to_repo && (
                  <Button 
                    variant="outline-secondary"
                    onClick={() => navigator.clipboard.writeText(projectDetails.project.http_url_to_repo)}
                  >
                    <i className="fas fa-copy me-2"></i>
                    Copy Clone URL
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <Alert variant="danger">
              <i className="fas fa-exclamation-triangle me-2"></i>
              Failed to load project details.
            </Alert>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Projects;
