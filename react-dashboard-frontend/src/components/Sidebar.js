import React from 'react';
import { Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ collapsed }) => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  if (collapsed) {
    return (
      <div className="sidebar d-flex flex-column align-items-center py-3">
        <Nav className="flex-column">
          <Nav.Link 
            as={Link} 
            to="/" 
            className={`text-center ${isActive('/') ? 'active' : ''}`}
            title="Dashboard"
          >
            <i className="fas fa-tachometer-alt fa-lg"></i>
          </Nav.Link>
          <Nav.Link 
            as={Link} 
            to="/groups" 
            className={`text-center ${isActive('/groups') ? 'active' : ''}`}
            title="Groups"
          >
            <i className="fas fa-layer-group fa-lg"></i>
          </Nav.Link>
          <Nav.Link 
            as={Link} 
            to="/projects" 
            className={`text-center ${isActive('/projects') ? 'active' : ''}`}
            title="Projects"
          >
            <i className="fas fa-project-diagram fa-lg"></i>
          </Nav.Link>
          <Nav.Link 
            as={Link} 
            to="/issues" 
            className={`text-center ${isActive('/issues') ? 'active' : ''}`}
            title="Issues"
          >
            <i className="fas fa-exclamation-circle fa-lg"></i>
          </Nav.Link>
          <Nav.Link 
            as={Link} 
            to="/merge-requests" 
            className={`text-center ${isActive('/merge-requests') ? 'active' : ''}`}
            title="Merge Requests"
          >
            <i className="fas fa-code-branch fa-lg"></i>
          </Nav.Link>
          <Nav.Link 
            as={Link} 
            to="/analytics" 
            className={`text-center ${isActive('/analytics') ? 'active' : ''}`}
            title="Analytics"
          >
            <i className="fas fa-chart-line fa-lg"></i>
          </Nav.Link>
          <Nav.Link 
            as={Link} 
            to="/config" 
            className={`text-center ${isActive('/config') ? 'active' : ''}`}
            title="Configuration"
          >
            <i className="fas fa-cog fa-lg"></i>
          </Nav.Link>
        </Nav>
      </div>
    );
  }

  return (
    <div className="sidebar">
      <div className="p-3">
        <h6 className="text-light mb-3">
          <i className="fas fa-compass me-2"></i>
          Navigation
        </h6>
        <Nav className="flex-column">
          <Nav.Link 
            as={Link} 
            to="/" 
            className={isActive('/') ? 'active' : ''}
          >
            <i className="fas fa-tachometer-alt me-2"></i>
            Dashboard
          </Nav.Link>
          <Nav.Link 
            as={Link} 
            to="/groups" 
            className={isActive('/groups') ? 'active' : ''}
          >
            <i className="fas fa-layer-group me-2"></i>
            Groups
          </Nav.Link>
          <Nav.Link 
            as={Link} 
            to="/projects" 
            className={isActive('/projects') ? 'active' : ''}
          >
            <i className="fas fa-project-diagram me-2"></i>
            Projects
          </Nav.Link>
        </Nav>
      </div>
      
      <hr className="mx-3" style={{ borderColor: '#495057' }} />
      
      <div className="p-3">
        <h6 className="text-light mb-3">
          <i className="fas fa-tasks me-2"></i>
          Development
        </h6>
        <Nav className="flex-column">
          <Nav.Link 
            as={Link} 
            to="/issues" 
            className={isActive('/issues') ? 'active' : ''}
          >
            <i className="fas fa-exclamation-circle me-2"></i>
            Issues
          </Nav.Link>
          <Nav.Link 
            as={Link} 
            to="/merge-requests" 
            className={isActive('/merge-requests') ? 'active' : ''}
          >
            <i className="fas fa-code-branch me-2"></i>
            Merge Requests
          </Nav.Link>
          <Nav.Link 
            as={Link} 
            to="/analytics" 
            className={isActive('/analytics') ? 'active' : ''}
          >
            <i className="fas fa-chart-line me-2"></i>
            Analytics
          </Nav.Link>
        </Nav>
      </div>
      
      <hr className="mx-3" style={{ borderColor: '#495057' }} />
      
      <div className="p-3">
        <h6 className="text-light mb-3">
          <i className="fas fa-tools me-2"></i>
          Settings
        </h6>
        <Nav className="flex-column">
          <Nav.Link 
            as={Link} 
            to="/config" 
            className={isActive('/config') ? 'active' : ''}
          >
            <i className="fas fa-cog me-2"></i>
            Configuration
          </Nav.Link>
        </Nav>
      </div>
    </div>
  );
};

export default Sidebar;
