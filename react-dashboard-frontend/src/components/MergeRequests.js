import React, { useState } from 'react';
import { Card, Row, Col, Badge, Button, Form, Modal, Table, Spinner } from 'react-bootstrap';
import { useQuery } from 'react-query';
import moment from 'moment';

const MergeRequests = () => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [stateFilter, setStateFilter] = useState('opened');
  const [selectedMR, setSelectedMR] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Get all projects for selection
  const { data: allProjects } = useQuery(
    'all-projects',
    () => fetch('/api/projects').then(res => res.json())
  );

  // Get merge requests for selected project
  const { data: mrData, isLoading: mrLoading, refetch: refetchMRs } = useQuery(
    ['project-merge-requests', selectedProject?.id, stateFilter],
    () => {
      if (!selectedProject) return { merge_requests: [], count: 0 };
      return fetch(`/api/projects/${selectedProject.id}/merge_requests?state=${stateFilter}`).then(res => res.json());
    },
    {
      enabled: !!selectedProject,
    }
  );

  const getMRStateColor = (state) => {
    switch (state) {
      case 'opened': return 'success';
      case 'merged': return 'primary';
      case 'closed': return 'secondary';
      default: return 'warning';
    }
  };

  const getMRStateIcon = (state) => {
    switch (state) {
      case 'opened': return 'fa-code-branch';
      case 'merged': return 'fa-check-circle';
      case 'closed': return 'fa-times-circle';
      default: return 'fa-question-circle';
    }
  };

  const getApprovalStatus = (mr) => {
    if (!mr.approvals_before_merge) return { text: 'No approvals required', color: 'success' };
    
    const required = mr.approvals_before_merge;
    const approved = mr.upvotes || 0;
    
    if (approved >= required) {
      return { text: `Approved (${approved}/${required})`, color: 'success' };
    } else {
      return { text: `Needs approval (${approved}/${required})`, color: 'warning' };
    }
  };

  const projects = allProjects?.projects || [];
  const mergeRequests = mrData?.merge_requests || [];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-gradient">
          <i className="fas fa-code-branch me-2"></i>
          Merge Requests
        </h2>
        {selectedProject && (
          <Button 
            variant="outline-success" 
            size="sm"
            onClick={() => refetchMRs()}
            disabled={mrLoading}
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
          <Row>
            <Col md={8}>
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
            </Col>
            <Col md={4}>
              <Form.Select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
              >
                <option value="opened">Open MRs</option>
                <option value="merged">Merged MRs</option>
                <option value="closed">Closed MRs</option>
                <option value="all">All MRs</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Merge Requests List */}
      {selectedProject ? (
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              Merge Requests for {selectedProject.name}
            </h5>
            <Badge bg="primary">{mrData?.count || 0} merge requests</Badge>
          </Card.Header>
          <Card.Body className="p-0">
            {mrLoading ? (
              <div className="text-center p-4">
                <Spinner animation="border" />
                <p className="mt-2">Loading merge requests...</p>
              </div>
            ) : mergeRequests.length === 0 ? (
              <div className="text-center p-4 text-muted">
                <i className="fas fa-code-branch fa-3x mb-3"></i>
                <p>No merge requests found</p>
              </div>
            ) : (
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>State</th>
                    <th>Author</th>
                    <th>Assignee</th>
                    <th>Source → Target</th>
                    <th>Approvals</th>
                    <th>Pipeline</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mergeRequests.map(mr => {
                    const approvalStatus = getApprovalStatus(mr);
                    return (
                      <tr key={mr.id}>
                        <td>
                          <a 
                            href={mr.web_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-decoration-none"
                          >
                            !{mr.iid}
                          </a>
                        </td>
                        <td>
                          <div>
                            {mr.title}
                            {mr.draft && (
                              <Badge bg="warning" className="ms-2" size="sm">
                                Draft
                              </Badge>
                            )}
                            {mr.work_in_progress && (
                              <Badge bg="warning" className="ms-2" size="sm">
                                WIP
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td>
                          <Badge bg={getMRStateColor(mr.state)}>
                            <i className={`fas ${getMRStateIcon(mr.state)} me-1`}></i>
                            {mr.state}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <img 
                              src={mr.author.avatar_url} 
                              alt={mr.author.name}
                              width="20" 
                              height="20" 
                              className="rounded-circle me-2"
                            />
                            {mr.author.name}
                          </div>
                        </td>
                        <td>
                          {mr.assignee ? (
                            <div className="d-flex align-items-center">
                              <img 
                                src={mr.assignee.avatar_url} 
                                alt={mr.assignee.name}
                                width="20" 
                                height="20" 
                                className="rounded-circle me-2"
                              />
                              {mr.assignee.name}
                            </div>
                          ) : (
                            <span className="text-muted">Unassigned</span>
                          )}
                        </td>
                        <td>
                          <small>
                            <Badge bg="info" className="me-1">{mr.source_branch}</Badge>
                            <i className="fas fa-arrow-right mx-1"></i>
                            <Badge bg="success">{mr.target_branch}</Badge>
                          </small>
                        </td>
                        <td>
                          <Badge bg={approvalStatus.color} size="sm">
                            {approvalStatus.text}
                          </Badge>
                        </td>
                        <td>
                          {mr.pipeline ? (
                            <Badge bg={mr.pipeline.status === 'success' ? 'success' : 
                                      mr.pipeline.status === 'failed' ? 'danger' : 
                                      mr.pipeline.status === 'running' ? 'primary' : 'warning'}>
                              <i className={`fas ${
                                mr.pipeline.status === 'success' ? 'fa-check' :
                                mr.pipeline.status === 'failed' ? 'fa-times' :
                                mr.pipeline.status === 'running' ? 'fa-spinner fa-spin' : 'fa-clock'
                              } me-1`}></i>
                              {mr.pipeline.status}
                            </Badge>
                          ) : (
                            <span className="text-muted">No pipeline</span>
                          )}
                        </td>
                        <td>{moment(mr.created_at).format('MMM D')}</td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                              setSelectedMR(mr);
                              setShowModal(true);
                            }}
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      ) : (
        <Card>
          <Card.Body className="text-center py-5">
            <i className="fas fa-code-branch fa-3x text-muted mb-3"></i>
            <h5 className="text-muted">Select a project to view merge requests</h5>
            <p className="text-muted">Choose a project from the dropdown above to start managing merge requests</p>
          </Card.Body>
        </Card>
      )}

      {/* Merge Request Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            MR !{selectedMR?.iid}: {selectedMR?.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedMR && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>State:</strong>
                  <Badge bg={getMRStateColor(selectedMR.state)} className="ms-2">
                    <i className={`fas ${getMRStateIcon(selectedMR.state)} me-1`}></i>
                    {selectedMR.state}
                  </Badge>
                </Col>
                <Col md={6}>
                  <strong>Author:</strong> {selectedMR.author?.name}
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Assignee:</strong> {selectedMR.assignee?.name || 'Unassigned'}
                </Col>
                <Col md={6}>
                  <strong>Created:</strong> {moment(selectedMR.created_at).format('MMMM D, YYYY')}
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <strong>Source Branch:</strong>
                  <Badge bg="info" className="ms-2">{selectedMR.source_branch}</Badge>
                </Col>
                <Col md={6}>
                  <strong>Target Branch:</strong>
                  <Badge bg="success" className="ms-2">{selectedMR.target_branch}</Badge>
                </Col>
              </Row>

              {selectedMR.pipeline && (
                <Row className="mb-3">
                  <Col>
                    <strong>Pipeline Status:</strong>
                    <Badge 
                      bg={selectedMR.pipeline.status === 'success' ? 'success' : 
                          selectedMR.pipeline.status === 'failed' ? 'danger' : 'warning'}
                      className="ms-2"
                    >
                      {selectedMR.pipeline.status}
                    </Badge>
                  </Col>
                </Row>
              )}

              <Row className="mb-3">
                <Col>
                  <strong>Changes:</strong>
                  <div className="mt-2">
                    <Badge bg="success" className="me-2">
                      +{selectedMR.changes_count || 0} additions
                    </Badge>
                    {selectedMR.user_notes_count > 0 && (
                      <Badge bg="info" className="me-2">
                        {selectedMR.user_notes_count} comments
                      </Badge>
                    )}
                    {selectedMR.upvotes > 0 && (
                      <Badge bg="primary" className="me-2">
                        {selectedMR.upvotes} 👍
                      </Badge>
                    )}
                    {selectedMR.downvotes > 0 && (
                      <Badge bg="danger" className="me-2">
                        {selectedMR.downvotes} 👎
                      </Badge>
                    )}
                  </div>
                </Col>
              </Row>

              <hr />
              
              <div>
                <strong>Description:</strong>
                <div 
                  className="mt-2 p-3 bg-light rounded"
                  style={{ maxHeight: '200px', overflowY: 'auto' }}
                  dangerouslySetInnerHTML={{ 
                    __html: selectedMR.description || '<em>No description provided</em>' 
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
            onClick={() => window.open(selectedMR?.web_url, '_blank')}
          >
            <i className="fas fa-external-link-alt me-1"></i>
            View in GitLab
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MergeRequests;
