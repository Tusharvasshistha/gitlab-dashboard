import React, { useState } from 'react';
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';

const Configuration = ({ onConfigured }) => {
  const [formData, setFormData] = useState({
    gitlab_url: 'https://gitlab.com',
    access_token: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMessage({ 
          type: 'success', 
          text: `Configuration saved successfully! Welcome, ${result.user?.name || result.user?.username || 'User'}!` 
        });
        setTimeout(() => {
          onConfigured();
        }, 1500);
      } else {
        setMessage({ 
          type: 'danger', 
          text: result.error || 'Failed to save configuration' 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'danger', 
        text: `Network error: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="config-form">
      <Card>
        <Card.Header className="text-center bg-primary text-white">
          <h4 className="mb-0">
            <i className="fab fa-gitlab me-2"></i>
            GitLab Configuration
          </h4>
        </Card.Header>
        <Card.Body>
          {message.text && (
            <Alert variant={message.type} className="alert-custom">
              <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-2`}></i>
              {message.text}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>
                <i className="fas fa-server me-2"></i>
                GitLab URL
              </Form.Label>
              <Form.Control
                type="url"
                name="gitlab_url"
                value={formData.gitlab_url}
                onChange={handleInputChange}
                placeholder="https://gitlab.com"
                required
                disabled={loading}
              />
              <Form.Text className="text-muted">
                Enter your GitLab instance URL (e.g., https://gitlab.com or your self-hosted instance)
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>
                <i className="fas fa-key me-2"></i>
                Access Token
              </Form.Label>
              <Form.Control
                type="password"
                name="access_token"
                value={formData.access_token}
                onChange={handleInputChange}
                placeholder="Enter your GitLab access token"
                required
                disabled={loading}
              />
              <Form.Text className="text-muted">
                Create a personal access token in GitLab with 'read_api' and 'read_repository' scopes
              </Form.Text>
            </Form.Group>

            <div className="d-grid">
              <Button 
                type="submit" 
                variant="primary" 
                size="lg" 
                disabled={loading}
                className="btn-gradient"
              >
                {loading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Connecting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plug me-2"></i>
                    Connect to GitLab
                  </>
                )}
              </Button>
            </div>
          </Form>

          <hr className="my-4" />

          <div className="text-center">
            <h6 className="text-muted mb-3">Need help getting your access token?</h6>
            <ol className="text-start text-muted small">
              <li>Go to your GitLab instance</li>
              <li>Click on your avatar → Preferences</li>
              <li>Go to "Access Tokens" in the left sidebar</li>
              <li>Create a new token with 'read_api' and 'read_repository' scopes</li>
              <li>Copy the token and paste it above</li>
            </ol>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Configuration;
