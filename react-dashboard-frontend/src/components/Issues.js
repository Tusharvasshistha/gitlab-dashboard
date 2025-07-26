import React, { useState } from 'react';
import { Card, Row, Col, Badge, Button, Form, Modal, Table, Spinner } from 'react-bootstrap';
import { useQuery } from 'react-query';
import moment from 'moment';

const Issues = () => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [filters, setFilters] = useState({
    state: 'opened',
    assignee_id: '',
    labels: '',
    milestone: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Get all projects for selection
  const { data: allProjects } = useQuery(
    'all-projects',
    () => fetch('/api/projects').then(res => res.json())
  );

  // Get issues for selected project
  const { data: issuesData, isLoading: issuesLoading, refetch: refetchIssues } = useQuery(
    ['project-issues', selectedProject?.id, filters],
    () => {
      if (!selectedProject) return { issues: [], count: 0 };
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      return fetch(`/api/projects/${selectedProject.id}/issues?${params}`).then(res => res.json());
    },
    {
      enabled: !!selectedProject,
    }
  );

  // Get project members for assignee filter
  const { data: membersData } = useQuery(
    ['project-members', selectedProject?.id],
    () => selectedProject ? fetch(`/api/projects/${selectedProject.id}/members`).then(res => res.json()) : null,
    {
      enabled: !!selectedProject,
    }
  );

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      state: 'opened',
      assignee_id: '',
      labels: '',
      milestone: ''
    });
  };

  const getIssuePriorityColor = (labels) => {
    const priority = labels?.find(label => label.name?.toLowerCase().includes('priority'));
    if (!priority) return 'secondary';
    
    const name = priority.name.toLowerCase();
    if (name.includes('high') || name.includes('critical')) return 'danger';
    if (name.includes('medium')) return 'warning';
    if (name.includes('low')) return 'info';
    return 'secondary';
  };

  const getStateColor = (state) => {
    return state === 'opened' ? 'success' : 'secondary';
  };

  const projects = allProjects?.projects || [];
  const issues = issuesData?.issues || [];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-gradient">
          <i className="fas fa-exclamation-circle me-2"></i>
          Issues Management
        </h2>
        <div className="d-flex gap-2">
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <i className="fas fa-filter me-1"></i>
            Filters
          </Button>
          {selectedProject && (
            <Button 
              variant="outline-success" 
              size="sm"
              onClick={() => refetchIssues()}
              disabled={issuesLoading}
            >
              <i className="fas fa-sync me-1"></i>
              Refresh
            </Button>
          )}
        </div>
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

      {/* Filters Panel */}
      {showFilters && (
        <Card className="mb-4">
          <Card.Header>
            <h6 className="mb-0">
              <i className="fas fa-sliders-h me-2"></i>
              Filter Issues
            </h6>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>State</Form.Label>
                  <Form.Select
                    value={filters.state}
                    onChange={(e) => handleFilterChange('state', e.target.value)}
                  >
                    <option value="opened">Open</option>
                    <option value="closed">Closed</option>
                    <option value="all">All</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Assignee</Form.Label>
                  <Form.Select
                    value={filters.assignee_id}
                    onChange={(e) => handleFilterChange('assignee_id', e.target.value)}
                  >
                    <option value="">All Assignees</option>
                    {membersData?.members?.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Labels</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., bug,enhancement"
                    value={filters.labels}
                    onChange={(e) => handleFilterChange('labels', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Actions</Form.Label>
                  <div>
                    <Button variant="outline-secondary" size="sm" onClick={resetFilters}>
                      Reset
                    </Button>
                  </div>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Issues List */}
      {selectedProject ? (
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              Issues for {selectedProject.name}
            </h5>
            <Badge bg="primary">{issuesData?.count || 0} issues</Badge>
          </Card.Header>
          <Card.Body className="p-0">
            {issuesLoading ? (
              <div className="text-center p-4">
                <Spinner animation="border" />
                <p className="mt-2">Loading issues...</p>
              </div>
            ) : issues.length === 0 ? (
              <div className="text-center p-4 text-muted">
                <i className="fas fa-inbox fa-3x mb-3"></i>
                <p>No issues found with current filters</p>
              </div>
            ) : (
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>State</th>
                    <th>Assignee</th>
                    <th>Labels</th>
                    <th>Created</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map(issue => (
                    <tr key={issue.id}>
                      <td>
                        <a 
                          href={issue.web_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-decoration-none"
                        >
                          #{issue.iid}
                        </a>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          {issue.title}
                          {issue.milestone && (
                            <Badge bg="info" className="ms-2" size="sm">
                              {issue.milestone.title}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td>
                        <Badge bg={getStateColor(issue.state)}>
                          {issue.state}
                        </Badge>
                      </td>
                      <td>
                        {issue.assignee ? (
                          <div className="d-flex align-items-center">
                            <img 
                              src={issue.assignee.avatar_url} 
                              alt={issue.assignee.name}
                              width="20" 
                              height="20" 
                              className="rounded-circle me-2"
                            />
                            {issue.assignee.name}
                          </div>
                        ) : (
                          <span className="text-muted">Unassigned</span>
                        )}
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {issue.labels?.slice(0, 3).map(label => (
                            <Badge 
                              key={label} 
                              style={{ backgroundColor: `#${getIssuePriorityColor([{name: label}])}` }}
                              className="small"
                            >
                              {label}
                            </Badge>
                          ))}
                          {issue.labels?.length > 3 && (
                            <Badge bg="secondary" className="small">
                              +{issue.labels.length - 3}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td>{moment(issue.created_at).format('MMM D, YYYY')}</td>
                      <td>{moment(issue.updated_at).fromNow()}</td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => {
                            setSelectedIssue(issue);
                            setShowModal(true);
                          }}
                        >
                          <i className="fas fa-eye"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      ) : (
        <Card>
          <Card.Body className="text-center py-5">
            <i className="fas fa-project-diagram fa-3x text-muted mb-3"></i>
            <h5 className="text-muted">Select a project to view issues</h5>
            <p className="text-muted">Choose a project from the dropdown above to start managing issues</p>
          </Card.Body>
        </Card>
      )}

      {/* Issue Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Issue #{selectedIssue?.iid}: {selectedIssue?.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedIssue && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>State:</strong>
                  <Badge bg={getStateColor(selectedIssue.state)} className="ms-2">
                    {selectedIssue.state}
                  </Badge>
                </Col>
                <Col md={6}>
                  <strong>Author:</strong> {selectedIssue.author?.name}
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Assignee:</strong> {selectedIssue.assignee?.name || 'Unassigned'}
                </Col>
                <Col md={6}>
                  <strong>Created:</strong> {moment(selectedIssue.created_at).format('MMMM D, YYYY')}
                </Col>
              </Row>

              {selectedIssue.milestone && (
                <Row className="mb-3">
                  <Col>
                    <strong>Milestone:</strong> {selectedIssue.milestone.title}
                  </Col>
                </Row>
              )}

              {selectedIssue.labels?.length > 0 && (
                <Row className="mb-3">
                  <Col>
                    <strong>Labels:</strong>
                    <div className="mt-1">
                      {selectedIssue.labels.map(label => (
                        <Badge key={label} bg="secondary" className="me-1">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </Col>
                </Row>
              )}

              <hr />
              
              <div>
                <strong>Description:</strong>
                <div 
                  className="mt-2 p-3 bg-light rounded"
                  dangerouslySetInnerHTML={{ 
                    __html: selectedIssue.description || '<em>No description provided</em>' 
                  }}
                />
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
          <Button 
            variant="primary" 
            onClick={() => window.open(selectedIssue?.web_url, '_blank')}
          >
            <i className="fas fa-external-link-alt me-1"></i>
            View in GitLab
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Issues;
