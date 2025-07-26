import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Header = ({ toggleSidebar, isConfigured }) => {
  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="dashboard-header">
      <Container fluid>
        <div className="d-flex align-items-center">
          {isConfigured && (
            <Button 
              variant="outline-light" 
              className="me-3 d-md-none"
              onClick={toggleSidebar}
            >
              <i className="fas fa-bars"></i>
            </Button>
          )}
          <Navbar.Brand as={Link} to="/" className="text-gradient fw-bold">
            <i className="fab fa-gitlab me-2"></i>
            GitLab Dashboard
          </Navbar.Brand>
        </div>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            {isConfigured && (
              <>
                <Nav.Link as={Link} to="/">
                  <i className="fas fa-tachometer-alt me-1"></i>
                  Dashboard
                </Nav.Link>
                <Nav.Link as={Link} to="/groups">
                  <i className="fas fa-layer-group me-1"></i>
                  Groups
                </Nav.Link>
                <Nav.Link as={Link} to="/projects">
                  <i className="fas fa-project-diagram me-1"></i>
                  Projects
                </Nav.Link>
              </>
            )}
            <Nav.Link as={Link} to="/config">
              <i className="fas fa-cog me-1"></i>
              {isConfigured ? 'Settings' : 'Configure'}
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
