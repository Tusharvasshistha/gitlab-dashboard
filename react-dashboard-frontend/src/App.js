import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/DashboardNew';
import Groups from './components/Groups';
import Projects from './components/Projects';
import Issues from './components/Issues';
import MergeRequests from './components/MergeRequests';
import Analytics from './components/Analytics';
import Configuration from './components/Configuration';
import { GitLabProvider } from './contexts/GitLabContext';

function App() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Check if GitLab is configured on app load
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setIsConfigured(data.gitlab_configured);
    } catch (error) {
      console.error('Error checking configuration:', error);
      setIsConfigured(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <GitLabProvider>
      <div className="App">
        <Header 
          toggleSidebar={toggleSidebar}
          isConfigured={isConfigured}
        />
        
        <Container fluid>
          <Row>
            {isConfigured && (
              <Col 
                md={sidebarCollapsed ? 1 : 3} 
                lg={sidebarCollapsed ? 1 : 2} 
                className="p-0"
              >
                <Sidebar collapsed={sidebarCollapsed} />
              </Col>
            )}
            
            <Col 
              md={isConfigured ? (sidebarCollapsed ? 11 : 9) : 12}
              lg={isConfigured ? (sidebarCollapsed ? 11 : 10) : 12}
            >
              <div className="p-3">
                {!isConfigured ? (
                  <Configuration onConfigured={() => setIsConfigured(true)} />
                ) : (
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/groups" element={<Groups />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/issues" element={<Issues />} />
                    <Route path="/merge-requests" element={<MergeRequests />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/config" element={<Configuration onConfigured={() => setIsConfigured(true)} />} />
                  </Routes>
                )}
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </GitLabProvider>
  );
}

export default App;
