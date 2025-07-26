import React, { createContext, useContext, useState, useEffect } from 'react';

const GitLabContext = createContext();

export const useGitLab = () => {
  const context = useContext(GitLabContext);
  if (!context) {
    throw new Error('useGitLab must be used within a GitLabProvider');
  }
  return context;
};

export const GitLabProvider = ({ children }) => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
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
    } finally {
      setLoading(false);
    }
  };

  const configure = async (gitlabUrl, accessToken) => {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gitlab_url: gitlabUrl,
          access_token: accessToken
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setIsConfigured(true);
        setUser(result.user);
        return { success: true, user: result.user };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    isConfigured,
    loading,
    user,
    configure,
    checkConfiguration
  };

  return (
    <GitLabContext.Provider value={value}>
      {children}
    </GitLabContext.Provider>
  );
};
