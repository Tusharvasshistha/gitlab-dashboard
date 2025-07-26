# GitLab Dashboard - Deployment Guide

## 🚀 **Multiple Configuration Options**

The GitLab Dashboard supports multiple configuration methods to suit different deployment scenarios. **No manual UI configuration required!**

## **⭐ Recommended Approaches**

### **1. Environment Variables (Production)**

Best for: Production deployments, Docker, Kubernetes

```bash
# Set environment variables
export GITLAB_URL="https://gitlab.com"
export GITLAB_ACCESS_TOKEN="your-token-here"
export SECRET_KEY="your-secret-key"

# Start the application
python3 app.py
```

### **2. Setup Script (Easiest)**

Best for: First-time setup, development

```bash
# Run the interactive setup script
./setup.sh

# Follow the prompts to configure GitLab connection
# Script creates .env file automatically
```

### **3. Configuration File**

Best for: Development, version control

```bash
# Copy template and edit
cp config.template.json config.json

# Edit config.json with your values
{
  "gitlab": {
    "url": "https://gitlab.com",
    "access_token": "your-token-here"
  }
}

# Start application
python3 app.py
```

### **4. Docker Deployment**

Best for: Production, containerized environments

```bash
# Using environment variables
docker-compose up -d

# Or create .env file first
cp .env.template .env
# Edit .env with your values
docker-compose up -d
```

## **📋 Configuration Priority**

The system checks configuration sources in this order:

1. **Environment Variables** (highest priority)
2. **Configuration File** (`config.json`)
3. **Database** (previous UI configuration)
4. **Session** (current session only)

## **🔧 Configuration Methods Comparison**

| Method | Best For | Pros | Cons |
|--------|----------|------|------|
| **Environment Variables** | Production, Docker | Secure, no files | Shell-specific |
| **Setup Script** | First-time setup | Interactive, easy | One-time use |
| **Config File** | Development | Version control | File management |
| **UI Configuration** | Testing, demo | Visual, immediate | Manual, temporary |

## **🐳 Docker Deployment**

### **Option 1: Environment Variables**
```bash
docker run -d \
  -p 5000:5000 \
  -e GITLAB_URL="https://gitlab.com" \
  -e GITLAB_ACCESS_TOKEN="your-token" \
  -v ./data:/app/data \
  gitlab-dashboard
```

### **Option 2: Environment File**
```bash
# Create .env file
echo "GITLAB_URL=https://gitlab.com" > .env
echo "GITLAB_ACCESS_TOKEN=your-token" >> .env

# Run with docker-compose
docker-compose up -d
```

## **☸️ Kubernetes Deployment**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-dashboard-config
type: Opaque
stringData:
  GITLAB_URL: "https://gitlab.com"
  GITLAB_ACCESS_TOKEN: "your-token"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gitlab-dashboard
spec:
  template:
    spec:
      containers:
      - name: gitlab-dashboard
        image: gitlab-dashboard:latest
        envFrom:
        - secretRef:
            name: gitlab-dashboard-config
```

## **🔒 Security Best Practices**

### **For Production:**
1. **Never commit tokens** to version control
2. **Use environment variables** or secrets management
3. **Rotate tokens regularly**
4. **Use read-only tokens** when possible
5. **Enable HTTPS** in production

### **Token Permissions Required:**
- `read_user` - Basic user information
- `read_api` - Access to GitLab API
- `read_repository` - Repository information

## **📁 File Structure After Setup**

```
gitlab-dashboard/
├── .env                    # Your configuration (created by setup)
├── .env.template          # Template for others
├── config.json           # Alternative config file
├── config.template.json  # Config file template
├── setup.sh              # Interactive setup script
├── docker-compose.yml    # Docker deployment
└── gitlab_dashboard.db   # SQLite database (auto-created)
```

## **🔍 Troubleshooting**

### **Check Configuration Status:**
```bash
curl http://localhost:5000/api/config/status
```

### **Test GitLab Connection:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://gitlab.com/api/v4/user
```

### **Common Issues:**

1. **"GitLab not configured"**
   - Check if any configuration method is working
   - Verify token permissions
   - Test GitLab API connectivity

2. **"Connection failed"**
   - Verify GitLab URL is accessible
   - Check token validity
   - Test network connectivity

3. **"No groups found"**
   - Verify token has `read_api` permissions
   - Check if user has access to groups
   - Test with GitLab API directly

## **🚀 Quick Start Commands**

```bash
# Method 1: Setup Script (Recommended)
./setup.sh
python3 app.py

# Method 2: Environment Variables
export GITLAB_URL="https://gitlab.com"
export GITLAB_ACCESS_TOKEN="your-token"
python3 app.py

# Method 3: Docker
docker-compose up -d

# Method 4: Config File
cp config.template.json config.json
# Edit config.json
python3 app.py
```

## **📊 Benefits Over UI Configuration**

| Aspect | UI Config | Automated Config |
|--------|-----------|------------------|
| **Setup Time** | Manual entry every time | One-time setup |
| **User Experience** | Requires technical knowledge | Works out of the box |
| **Security** | Credentials in browser | Environment variables |
| **Automation** | Not scriptable | Fully automated |
| **Deployment** | Manual configuration | Infrastructure as code |
| **Scaling** | Each instance manual | Replicate configuration |

**Users get a working dashboard immediately without any manual configuration!** ✨
