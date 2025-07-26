import React from 'react';
import { Card, Row, Col, Badge, Table, Spinner, Alert } from 'react-bootstrap';
import { useQuery } from 'react-query';
import moment from 'moment';

const Dashboard = () => {
  // Get dashboard overview data
  const { data: overviewData, isLoading, error } = useQuery(
    'dashboard-overview',
    () => fetch('/api/dashboard/overview').then(res => res.json()),
    {
      refetchInterval: 300000, // Refresh every 5 minutes
    }
  );

  const getIssueStateColor = (state) => {
    return state === 'opened' ? 'success' : 'secondary';
  };

  const getMRStateColor = (state) => {
    switch (state) {
      case 'opened': return 'success';
      case 'merged': return 'primary';
      case 'closed': return 'secondary';
      default: return 'warning';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading your GitLab dashboard...</p>
      </div>
    );
  }

  if (error || !overviewData?.success) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Dashboard</Alert.Heading>
        <p>Unable to load dashboard data. Please check your GitLab configuration.</p>
      </Alert>
    );
  }

  const overview = overviewData.overview;

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-4">
        <h1 className="text-gradient mb-2">
          <i className="fab fa-gitlab me-2"></i>
          Welcome back, {overview.user?.name || 'User'}!
        </h1>
        <p className="text-muted">
          Here's what's happening in your GitLab projects
        </p>
      </div>

      {/* Quick Stats */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center border-primary">
            <Card.Body>
              <i className="fas fa-project-diagram fa-2x text-primary mb-2"></i>
              <h3 className="text-primary">{overview.stats.total_projects}</h3>
              <p className="mb-0">Projects</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-info">
            <Card.Body>
              <i className="fas fa-users fa-2x text-info mb-2"></i>
              <h3 className="text-info">{overview.stats.total_groups}</h3>
              <p className="mb-0">Groups</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-warning">
            <Card.Body>
              <i className="fas fa-exclamation-circle fa-2x text-warning mb-2"></i>
              <h3 className="text-warning">{overview.stats.assigned_issues}</h3>
              <p className="mb-0">Assigned Issues</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-success">
            <Card.Body>
              <i className="fas fa-code-branch fa-2x text-success mb-2"></i>
              <h3 className="text-success">{overview.stats.assigned_mrs}</h3>
              <p className="mb-0">Assigned MRs</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Activity and Projects */}
      <Row>
        {/* Recent Issues */}
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="fas fa-tasks me-2"></i>
                Recent Issues
              </h5>
              <Badge bg="primary">{overview.recent_activity.issues.length}</Badge>
            </Card.Header>
            <Card.Body className="p-0">
              {overview.recent_activity.issues.length > 0 ? (
                <Table responsive>
                  <tbody>
                    {overview.recent_activity.issues.map(issue => (
                      <tr key={issue.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <Badge 
                              bg={getIssueStateColor(issue.state)} 
                              className="me-2"
                            >
                              #{issue.iid}
                            </Badge>
                            <div>
                              <div className="fw-bold">
                                <a 
                                  href={issue.web_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-decoration-none"
                                >
                                  {issue.title}
                                </a>
                              </div>
                              <small className="text-muted">
                                {issue.project?.name} • {moment(issue.updated_at).fromNow()}
                              </small>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center p-4 text-muted">
                  <i className="fas fa-check-circle fa-2x mb-2"></i>
                  <p>No issues assigned to you</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Recent Merge Requests */}
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="fas fa-code-branch me-2"></i>
                Recent Merge Requests
              </h5>
              <Badge bg="primary">{overview.recent_activity.merge_requests.length}</Badge>
            </Card.Header>
            <Card.Body className="p-0">
              {overview.recent_activity.merge_requests.length > 0 ? (
                <Table responsive>
                  <tbody>
                    {overview.recent_activity.merge_requests.map(mr => (
                      <tr key={mr.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <Badge 
                              bg={getMRStateColor(mr.state)} 
                              className="me-2"
                            >
                              !{mr.iid}
                            </Badge>
                            <div>
                              <div className="fw-bold">
                                <a 
                                  href={mr.web_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-decoration-none"
                                >
                                  {mr.title}
                                </a>
                              </div>
                              <small className="text-muted">
                                {mr.project?.name} • {moment(mr.updated_at).fromNow()}
                              </small>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center p-4 text-muted">
                  <i className="fas fa-check-circle fa-2x mb-2"></i>
                  <p>No merge requests assigned to you</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Projects */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-history me-2"></i>
                Recent Projects
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                {overview.recent_projects.map(project => (
                  <Col md={4} key={project.id} className="mb-3">
                    <Card className="h-100 project-card">
                      <Card.Body>
                        <div className="d-flex align-items-start justify-content-between mb-2">
                          <h6 className="fw-bold mb-0">
                            <a 
                              href={project.web_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-decoration-none"
                            >
                              {project.name}
                            </a>
                          </h6>
                          {project.visibility && (
                            <Badge 
                              bg={project.visibility === 'private' ? 'warning' : 
                                  project.visibility === 'internal' ? 'info' : 'success'}
                              size="sm"
                            >
                              {project.visibility}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="small text-muted mb-2">
                          {project.namespace?.name}
                        </p>
                        
                        {project.description && (
                          <p className="small text-muted mb-2" 
                             style={{ 
                               display: '-webkit-box',
                               WebkitLineClamp: 2,
                               WebkitBoxOrient: 'vertical',
                               overflow: 'hidden'
                             }}>
                            {project.description}
                          </p>
                        )}
                        
                        <div className="d-flex justify-content-between align-items-center mt-auto">
                          <small className="text-muted">
                            <i className="fas fa-clock me-1"></i>
                            {moment(project.last_activity_at).fromNow()}
                          </small>
                          <div>
                            {project.star_count > 0 && (
                              <Badge bg="warning" size="sm" className="me-1">
                                <i className="fas fa-star me-1"></i>
                                {project.star_count}
                              </Badge>
                            )}
                            {project.forks_count > 0 && (
                              <Badge bg="info" size="sm">
                                <i className="fas fa-code-branch me-1"></i>
                                {project.forks_count}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-2">
                          <Badge bg="secondary" size="sm">
                            {project.default_branch || 'main'}
                          </Badge>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
