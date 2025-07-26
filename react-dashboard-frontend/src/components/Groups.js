import React, { useState } from 'react';
import { Card, Row, Col, Spinner, Alert, Button, Collapse, Badge } from 'react-bootstrap';
import { useQuery } from 'react-query';

const Groups = () => {
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [groupSubgroups, setGroupSubgroups] = useState({}); // Cache for subgroups
  const [loadingSubgroups, setLoadingSubgroups] = useState(new Set());

  // Fetch top-level groups only (fast loading)
  const { data: groups, isLoading, error, refetch } = useQuery(
    'gitlab-groups',
    () => fetch('/api/groups').then(res => res.json()),
    {
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    }
  );

  // Function to load subgroups dynamically
  const loadSubgroups = async (groupId) => {
    if (groupSubgroups[groupId] || loadingSubgroups.has(groupId)) {
      return; // Already loaded or loading
    }

    setLoadingSubgroups(prev => new Set(prev).add(groupId));
    
    try {
      const response = await fetch(`/api/groups/${groupId}/subgroups`);
      const data = await response.json();
      
      if (data.success) {
        setGroupSubgroups(prev => ({
          ...prev,
          [groupId]: data.subgroups || []
        }));
      }
    } catch (error) {
      console.error('Error loading subgroups:', error);
    } finally {
      setLoadingSubgroups(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
    }
  };

  const toggleGroup = (groupId) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
      // Load subgroups when expanding
      loadSubgroups(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const GroupProjects = ({ groupId }) => {
    const { data: projects, isLoading: projectsLoading } = useQuery(
      ['group-projects', groupId],
      () => fetch(`/api/groups/${groupId}/projects`).then(res => res.json()),
      {
        enabled: expandedGroups.has(groupId),
      }
    );

    if (projectsLoading) {
      return (
        <div className="text-center py-3">
          <Spinner animation="border" size="sm" />
          <span className="ms-2">Loading projects...</span>
        </div>
      );
    }

    if (!projects?.success || !projects.projects?.length) {
      return (
        <Alert variant="info" className="mb-0">
          <i className="fas fa-info-circle me-2"></i>
          No projects found in this group
        </Alert>
      );
    }

    return (
      <Row>
        {projects.projects.map(project => (
          <Col md={6} lg={4} key={project.id} className="mb-3">
            <Card className="project-card h-100">
              <Card.Body>
                <h6 className="card-title">
                  <i className={`fas ${
                    project.visibility === 'private' ? 'fa-lock' :
                    project.visibility === 'internal' ? 'fa-shield-alt' : 'fa-globe'
                  } me-2`}></i>
                  {project.name}
                </h6>
                {project.description && (
                  <p className="card-text text-muted small">
                    {project.description.substring(0, 100)}
                    {project.description.length > 100 && '...'}
                  </p>
                )}
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span className="badge bg-secondary me-1">
                      <i className="fas fa-star me-1"></i>
                      {project.star_count || 0}
                    </span>
                    <span className="badge bg-info">
                      <i className="fas fa-code-branch me-1"></i>
                      {project.forks_count || 0}
                    </span>
                  </div>
                  <a 
                    href={project.web_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline-primary"
                  >
                    <i className="fas fa-external-link-alt"></i>
                  </a>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  const renderSubgroups = (subgroups, level = 1) => {
    if (!subgroups || subgroups.length === 0) return null;

    return (
      <div className={`ms-${level * 3} mt-2`}>
        {subgroups.map(subgroup => {
          const currentSubgroups = groupSubgroups[subgroup.id] || [];
          const isLoadingThisGroup = loadingSubgroups.has(subgroup.id);
          const hasSubgroups = currentSubgroups.length > 0 || subgroup.subgroups_count > 0;
          
          return (
            <div key={subgroup.id} className="mb-2">
              <Card className="border-start border-3 border-info">
                <Card.Header className="bg-light py-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      {hasSubgroups && (
                        <Button
                          variant="link"
                          className="p-0 me-2 text-decoration-none"
                          onClick={() => toggleGroup(subgroup.id)}
                          disabled={isLoadingThisGroup}
                        >
                          {isLoadingThisGroup ? (
                            <Spinner animation="border" size="sm" />
                          ) : (
                            <i className={`fas fa-chevron-${expandedGroups.has(subgroup.id) ? 'down' : 'right'}`}></i>
                          )}
                        </Button>
                      )}
                      <div>
                        <h6 className="mb-0">
                          <i className="fas fa-folder me-2 text-info"></i>
                          {subgroup.name}
                          <Badge bg="light" text="dark" className="ms-2">
                            Level {subgroup.level || level}
                          </Badge>
                          {hasSubgroups && (
                            <Badge bg="info" className="ms-2">
                              {subgroup.subgroups_count || currentSubgroups.length} subgroup(s)
                            </Badge>
                          )}
                        </h6>
                        {subgroup.description && (
                          <small className="text-muted">{subgroup.description}</small>
                        )}
                      </div>
                    </div>
                    <div className="d-flex align-items-center">
                      <Badge bg={
                        subgroup.visibility === 'private' ? 'danger' :
                        subgroup.visibility === 'internal' ? 'warning' : 'success'
                      } className="me-2">
                        {subgroup.visibility || 'public'}
                      </Badge>
                      <Button
                        variant="outline-info"
                        size="sm"
                        className="me-2"
                        onClick={() => toggleGroup(subgroup.id)}
                      >
                        <i className="fas fa-eye me-1"></i>
                        View
                      </Button>
                      <a 
                        href={subgroup.web_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-primary"
                      >
                        <i className="fas fa-external-link-alt"></i>
                      </a>
                    </div>
                  </div>
                </Card.Header>
                
                <Collapse in={expandedGroups.has(subgroup.id)}>
                  <Card.Body>
                    {/* Render nested subgroups */}
                    {currentSubgroups.length > 0 && (
                      <div className="mb-3">
                        <h6 className="text-info">
                          <i className="fas fa-sitemap me-2"></i>
                          Subgroups ({currentSubgroups.length})
                        </h6>
                        {renderSubgroups(currentSubgroups, level + 1)}
                      </div>
                    )}
                    
                    {/* Render projects for this subgroup */}
                    <div>
                      <h6 className="text-success">
                        <i className="fas fa-project-diagram me-2"></i>
                        Projects
                      </h6>
                      <GroupProjects groupId={subgroup.id} />
                    </div>
                  </Card.Body>
                </Collapse>
              </Card>
              
              {/* Render nested subgroups outside the card if not expanded */}
              {!expandedGroups.has(subgroup.id) && hasSubgroups && (
                <div className="ms-3 mt-1">
                  <small className="text-muted">
                    <i className="fas fa-folder me-1"></i>
                    {subgroup.subgroups_count || currentSubgroups.length} subgroup(s) - click to expand
                  </small>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="loading-spinner">
        <Spinner animation="border" variant="primary" />
        <span className="ms-3">Loading groups hierarchy...</span>
      </div>
    );
  }

  if (error || !groups?.success) {
    return (
      <Alert variant="danger" className="alert-custom">
        <i className="fas fa-exclamation-triangle me-2"></i>
        Failed to load groups. Please check your GitLab configuration.
        <Button variant="outline-danger" size="sm" className="ms-3" onClick={() => refetch()}>
          <i className="fas fa-redo me-1"></i>
          Retry
        </Button>
      </Alert>
    );
  }

  const countTotalSubgroups = (groups) => {
    let count = 0;
    groups.forEach(group => {
      if (group.subgroups) {
        count += group.subgroups.length;
        count += countTotalSubgroups(group.subgroups);
      }
    });
    return count;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-gradient">
          <i className="fas fa-layer-group me-2"></i>
          GitLab Groups Hierarchy
        </h2>
        <Button variant="outline-primary" onClick={() => refetch()}>
          <i className="fas fa-sync-alt me-1"></i>
          Refresh
        </Button>
      </div>

      {groups.groups && groups.groups.length > 0 ? (
        <div>
          <Alert variant="info" className="alert-custom mb-4">
            <i className="fas fa-info-circle me-2"></i>
            Found {groups.groups.length} top-level group(s) with {countTotalSubgroups(groups.groups)} total subgroup(s). 
            <strong>All groups and projects are loaded (no pagination limits).</strong>
            <br />
            Click on groups to explore their hierarchy and projects.
          </Alert>

          {groups.groups.map(group => {
            const currentSubgroups = groupSubgroups[group.id] || [];
            const isLoadingThisGroup = loadingSubgroups.has(group.id);
            const hasSubgroups = currentSubgroups.length > 0 || group.subgroups_count > 0;
            
            return (
              <Card key={group.id} className="mb-4 shadow-sm">
                <Card.Header className="bg-primary text-white">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      <Button
                        variant="link"
                        className="p-0 me-3 text-white text-decoration-none"
                        onClick={() => toggleGroup(group.id)}
                        disabled={isLoadingThisGroup}
                      >
                        {isLoadingThisGroup ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <i className={`fas fa-chevron-${expandedGroups.has(group.id) ? 'down' : 'right'}`}></i>
                        )}
                      </Button>
                      <div>
                        <h5 className="mb-1">
                          <i className="fas fa-layer-group me-2"></i>
                          {group.name}
                          <Badge bg="light" text="dark" className="ms-2">
                            Top Level
                          </Badge>
                          {hasSubgroups && (
                            <Badge bg="info" className="ms-2">
                              {group.subgroups_count || currentSubgroups.length} subgroup(s)
                            </Badge>
                          )}
                        </h5>
                        {group.description && (
                          <p className="mb-0 small opacity-75">{group.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="d-flex align-items-center">
                      <Badge bg={
                        group.visibility === 'private' ? 'danger' :
                        group.visibility === 'internal' ? 'warning' : 'success'
                      } className="me-2">
                        {group.visibility || 'public'}
                      </Badge>
                      <a 
                        href={group.web_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-light"
                      >
                        <i className="fas fa-external-link-alt"></i>
                      </a>
                    </div>
                  </div>
                </Card.Header>
                
                <Collapse in={expandedGroups.has(group.id)}>
                  <Card.Body>
                    {/* Show subgroups hierarchy */}
                    {currentSubgroups.length > 0 && (
                      <div className="mb-4">
                        <h6 className="text-primary">
                          <i className="fas fa-sitemap me-2"></i>
                          Subgroups Hierarchy ({currentSubgroups.length})
                        </h6>
                        {renderSubgroups(currentSubgroups)}
                      </div>
                    )}
                    
                    {/* Show direct projects */}
                    <div>
                      <h6 className="text-success">
                        <i className="fas fa-project-diagram me-2"></i>
                        Direct Projects
                      </h6>
                      <GroupProjects groupId={group.id} />
                    </div>
                  </Card.Body>
                </Collapse>
              </Card>
            );
          })}
        </div>
      ) : (
        <Alert variant="warning" className="alert-custom">
          <i className="fas fa-exclamation-triangle me-2"></i>
          No groups found. Make sure your GitLab token has access to groups.
        </Alert>
      )}
    </div>
  );
};

export default Groups;
