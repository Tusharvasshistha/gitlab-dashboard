import React, { useState } from 'react';
import { Card, Row, Col, Badge, Button, Form, Table, Spinner, ProgressBar } from 'react-bootstrap';
import { useQuery } from 'react-query';
import moment from 'moment';

const Analytics = () => {
  const [selectedProject, setSelectedProject] = useState(null);

  // Get all projects for selection
  const { data: allProjects } = useQuery(
    'all-projects',
    () => fetch('/api/projects').then(res => res.json())
  );

  // Get analytics for selected project
  const { data: analyticsData, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery(
    ['project-analytics', selectedProject?.id],
    () => {
      if (!selectedProject) return null;
      return fetch(`/api/projects/${selectedProject.id}/analytics`).then(res => res.json());
    },
    {
      enabled: !!selectedProject,
    }
  );

  // Get branches for selected project
  const { data: branchesData } = useQuery(
    ['project-branches', selectedProject?.id],
    () => {
      if (!selectedProject) return null;
      return fetch(`/api/projects/${selectedProject.id}/branches`).then(res => res.json());
    },
    {
      enabled: !!selectedProject,
    }
  );

  // Get recent commits
  const { data: commitsData } = useQuery(
    ['project-commits', selectedProject?.id],
    () => {
      if (!selectedProject) return null;
      return fetch(`/api/projects/${selectedProject.id}/commits?per_page=20`).then(res => res.json());
    },
    {
      enabled: !!selectedProject,
    }
  );

  // Get project members
  const { data: membersData } = useQuery(
    ['project-members', selectedProject?.id],
    () => {
      if (!selectedProject) return null;
      return fetch(`/api/projects/${selectedProject.id}/members`).then(res => res.json());
    },
    {
      enabled: !!selectedProject,
    }
  );

  const getPipelineStatusColor = (status) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'danger';
      case 'running': return 'primary';
      case 'pending': return 'warning';
      case 'canceled': return 'secondary';
      default: return 'secondary';
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getAccessLevelName = (level) => {
    const levels = {
      10: 'Guest',
      20: 'Reporter',
      30: 'Developer',
      40: 'Maintainer',
      50: 'Owner'
    };
    return levels[level] || 'Unknown';
  };

  const projects = allProjects?.projects || [];
  const analytics = analyticsData?.analytics;
  const branches = branchesData?.branches || [];
  const commits = commitsData?.commits || [];
  const members = membersData?.members || [];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-gradient">
          <i className="fas fa-chart-line me-2"></i>
          Project Analytics
        </h2>
        {selectedProject && (
          <Button 
            variant="outline-success" 
            size="sm"
            onClick={() => refetchAnalytics()}
            disabled={analyticsLoading}
          >
            <i className="fas fa-sync me-1"></i>
            Refresh
          </Button>
        )}
      </div>

      {/* Project Selection */}
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">
            <i className="fas fa-project-diagram me-2"></i>
            Select Project
          </h5>
        </Card.Header>
        <Card.Body>
          <Form.Select
            value={selectedProject?.id || ''}
            onChange={(e) => {
              const project = projects.find(p => p.id === parseInt(e.target.value));
              setSelectedProject(project);
            }}
          >
            <option value="">Choose a project...</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name_with_namespace}
              </option>
            ))}
          </Form.Select>
        </Card.Body>
      </Card>

      {selectedProject ? (
        analyticsLoading ? (
          <div className="text-center p-4">
            <Spinner animation="border" />
            <p className="mt-2">Loading analytics...</p>
          </div>
        ) : analytics ? (
          <div>
            {/* Project Overview */}
            <Row className="mb-4">
              <Col md={8}>
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">
                      <i className="fas fa-info-circle me-2"></i>
                      Project Overview
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <p><strong>Name:</strong> {analytics.project_info.name}</p>
                        <p><strong>Default Branch:</strong> 
                          <Badge bg="primary" className="ms-2">
                            {analytics.project_info.default_branch}
                          </Badge>
                        </p>
                        <p><strong>Created:</strong> {moment(analytics.project_info.created_at).format('MMMM D, YYYY')}</p>
                      </Col>
                      <Col md={6}>
                        <p><strong>Last Activity:</strong> {moment(analytics.project_info.last_activity_at).fromNow()}</p>
                        <p><strong>Stars:</strong> 
                          <Badge bg="warning" className="ms-2">
                            <i className="fas fa-star me-1"></i>
                            {analytics.project_info.star_count}
                          </Badge>
                        </p>
                        <p><strong>Forks:</strong> 
                          <Badge bg="info" className="ms-2">
                            <i className="fas fa-code-branch me-1"></i>
                            {analytics.project_info.forks_count}
                          </Badge>
                        </p>
                      </Col>
                    </Row>
                    {analytics.project_info.description && (
                      <div className="mt-3">
                        <strong>Description:</strong>
                        <p className="text-muted mt-1">{analytics.project_info.description}</p>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card>
                  <Card.Header>
                    <h6 className="mb-0">
                      <i className="fas fa-database me-2"></i>
                      Repository Size
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <div className="text-center">
                      <h4 className="text-primary mb-1">
                        {formatBytes(analytics.statistics.repository_size)}
                      </h4>
                      <small className="text-muted">Total Size</small>
                    </div>
                    <hr />
                    <div className="small">
                      <div className="d-flex justify-content-between">
                        <span>Commits:</span>
                        <Badge bg="primary">{analytics.statistics.commit_count || 0}</Badge>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Statistics Cards */}
            <Row className="mb-4">
              <Col md={3}>
                <Card className="text-center border-success">
                  <Card.Body>
                    <i className="fas fa-exclamation-circle fa-2x text-success mb-2"></i>
                    <h4 className="text-success">{analytics.issues.total}</h4>
                    <p className="mb-1">Total Issues</p>
                    <small className="text-muted">
                      {analytics.issues.opened} open, {analytics.issues.closed} closed
                    </small>
                    <ProgressBar 
                      className="mt-2"
                      now={analytics.issues.total > 0 ? (analytics.issues.closed / analytics.issues.total) * 100 : 0}
                      variant="success"
                      size="sm"
                    />
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center border-primary">
                  <Card.Body>
                    <i className="fas fa-code-branch fa-2x text-primary mb-2"></i>
                    <h4 className="text-primary">{analytics.merge_requests.total}</h4>
                    <p className="mb-1">Merge Requests</p>
                    <small className="text-muted">
                      {analytics.merge_requests.opened} open, {analytics.merge_requests.merged} merged
                    </small>
                    <ProgressBar 
                      className="mt-2"
                      now={analytics.merge_requests.total > 0 ? (analytics.merge_requests.merged / analytics.merge_requests.total) * 100 : 0}
                      variant="primary"
                      size="sm"
                    />
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center border-info">
                  <Card.Body>
                    <i className="fas fa-code fa-2x text-info mb-2"></i>
                    <h4 className="text-info">{branches.length}</h4>
                    <p className="mb-1">Branches</p>
                    <small className="text-muted">
                      Including protected branches
                    </small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center border-warning">
                  <Card.Body>
                    <i className="fas fa-users fa-2x text-warning mb-2"></i>
                    <h4 className="text-warning">{members.length}</h4>
                    <p className="mb-1">Team Members</p>
                    <small className="text-muted">
                      Contributors and maintainers
                    </small>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Recent Pipelines */}
            {analytics.recent_pipelines.length > 0 && (
              <Row className="mb-4">
                <Col>
                  <Card>
                    <Card.Header>
                      <h5 className="mb-0">
                        <i className="fas fa-tasks me-2"></i>
                        Recent Pipelines
                      </h5>
                    </Card.Header>
                    <Card.Body className="p-0">
                      <Table responsive hover>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Status</th>
                            <th>Ref</th>
                            <th>Created</th>
                            <th>Duration</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.recent_pipelines.slice(0, 5).map(pipeline => (
                            <tr key={pipeline.id}>
                              <td>#{pipeline.id}</td>
                              <td>
                                <Badge bg={getPipelineStatusColor(pipeline.status)}>
                                  <i className={`fas ${
                                    pipeline.status === 'success' ? 'fa-check' :
                                    pipeline.status === 'failed' ? 'fa-times' :
                                    pipeline.status === 'running' ? 'fa-spinner fa-spin' : 'fa-clock'
                                  } me-1`}></i>
                                  {pipeline.status}
                                </Badge>
                              </td>
                              <td>
                                <Badge bg="secondary">{pipeline.ref}</Badge>
                              </td>
                              <td>{moment(pipeline.created_at).fromNow()}</td>
                              <td>
                                {pipeline.duration ? `${Math.round(pipeline.duration / 60)}m` : 'N/A'}
                              </td>
                              <td>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => window.open(pipeline.web_url, '_blank')}
                                >
                                  <i className="fas fa-external-link-alt"></i>
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}

            {/* Team Members and Recent Commits */}
            <Row>
              <Col md={6}>
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">
                      <i className="fas fa-users me-2"></i>
                      Team Members
                    </h5>
                  </Card.Header>
                  <Card.Body className="p-0">
                    {members.length > 0 ? (
                      <Table responsive>
                        <tbody>
                          {members.slice(0, 10).map(member => (
                            <tr key={member.id}>
                              <td>
                                <div className="d-flex align-items-center">
                                  <img 
                                    src={member.avatar_url} 
                                    alt={member.name}
                                    width="30" 
                                    height="30" 
                                    className="rounded-circle me-2"
                                  />
                                  <div>
                                    <strong>{member.name}</strong>
                                    <br />
                                    <small className="text-muted">@{member.username}</small>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <Badge bg="info">
                                  {getAccessLevelName(member.access_level)}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : (
                      <div className="text-center p-3 text-muted">
                        No members data available
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">
                      <i className="fas fa-history me-2"></i>
                      Recent Commits
                    </h5>
                  </Card.Header>
                  <Card.Body className="p-0">
                    {commits.length > 0 ? (
                      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {commits.slice(0, 8).map(commit => (
                          <div key={commit.id} className="border-bottom p-3">
                            <div className="d-flex align-items-start">
                              <img 
                                src={commit.author_email ? `https://www.gravatar.com/avatar/${btoa(commit.author_email)}?d=identicon&s=30` : '/default-avatar.png'} 
                                alt={commit.author_name}
                                width="30" 
                                height="30" 
                                className="rounded-circle me-2"
                              />
                              <div className="flex-grow-1">
                                <div className="fw-bold">{commit.title}</div>
                                <small className="text-muted">
                                  by {commit.author_name} • {moment(commit.created_at).fromNow()}
                                </small>
                                <div className="mt-1">
                                  <code className="small">{commit.short_id}</code>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-3 text-muted">
                        No recent commits available
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </div>
        ) : (
          <Card>
            <Card.Body className="text-center py-5">
              <i className="fas fa-chart-line fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">Analytics not available</h5>
              <p className="text-muted">Unable to load analytics for this project</p>
            </Card.Body>
          </Card>
        )
      ) : (
        <Card>
          <Card.Body className="text-center py-5">
            <i className="fas fa-chart-line fa-3x text-muted mb-3"></i>
            <h5 className="text-muted">Select a project to view analytics</h5>
            <p className="text-muted">Choose a project from the dropdown above to see comprehensive analytics</p>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default Analytics;
