# 🚀 GitLab Dashboard - Local Development Guide

## **Quick Start (Choose Your Method)**

### **🎯 Method 1: Automatic Configuration Detection**
The dashboard automatically detects configuration from multiple sources:

```bash
# 1. Install dependencies
pip3 install -r requirements.txt

# 2. Check configuration status
python3 config_helper.py status

# 3. Start the application
python3 app.py
```

### **🎯 Method 2: Environment Variables (Recommended)**
```bash
# Set your GitLab credentials
export GITLAB_URL="https://gitlab.com"
export GITLAB_ACCESS_TOKEN="your-gitlab-token-here"

# Start the application
python3 app.py
```

### **🎯 Method 3: .env File (Development)**
```bash
# Create .env file from template
cp .env.template .env

# Edit .env with your credentials
nano .env

# Start the application
python3 app.py
```

### **🎯 Method 4: Interactive Setup**
```bash
# Run the setup script
./setup.sh

# Follow the prompts
```

## **📋 Configuration Priority System**

The system checks configuration sources in this order:

1. **🌐 Environment Variables** (highest priority)
2. **📄 .env file** 
3. **⚙️ config.json file**
4. **🗄️ Database** (previous UI configuration)
5. **📝 .env.template** (fallback defaults)
6. **🖥️ Session** (UI configuration)

## **🔧 Configuration Files Explained**

### **.env.template** → **Fallback Defaults**
```bash
# Template with placeholder values
GITLAB_URL=https://gitlab.com
GITLAB_ACCESS_TOKEN=your-gitlab-access-token-here
```

**✅ Answer to your question:** Yes! If you put **real values** in `.env.template`, the system will use them as fallback defaults when no other configuration is found.

### **.env** → **Your Configuration**
```bash
# Your actual configuration
GITLAB_URL=https://gitlab.com
GITLAB_ACCESS_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
FLASK_DEBUG=true
FLASK_PORT=5000
```

### **config.json** → **Alternative Configuration**
```json
{
  "gitlab": {
    "url": "https://gitlab.com",
    "access_token": "glpat-xxxxxxxxxxxxxxxxxxxx"
  },
  "app": {
    "debug": true,
    "port": 5000
  }
}
```

## **🎯 Smart Template Fallback**

The enhanced configuration system now supports using `.env.template` as fallback:

```python
# If you put real values in .env.template:
GITLAB_URL=https://your-company-gitlab.com
GITLAB_ACCESS_TOKEN=glpat-real-token-here

# The system will automatically use these values
# when no .env file or environment variables exist
```

## **🔍 Check Configuration Status**

```bash
# Check all configuration sources
python3 config_helper.py status

# Output shows:
# ✅ Environment Variables: Configured
# ✅ .env file: Configured  
# ❌ config.json: Not found
# ✅ .env.template: Available
```

## **🏃‍♂️ Running the Application**

### **Development Mode:**
```bash
python3 app.py
# Runs on http://127.0.0.1:5000
```

### **Production Mode:**
```bash
export FLASK_DEBUG=false
export FLASK_HOST=0.0.0.0
python3 app.py
# Runs on http://0.0.0.0:5000
```

### **Custom Port:**
```bash
export FLASK_PORT=8080
python3 app.py
# Runs on http://127.0.0.1:8080
```

## **🔒 Security Best Practices**

### **For Development:**
- ✅ Use `.env` file (add to `.gitignore`)
- ✅ Keep tokens out of source code
- ✅ Use development GitLab instances

### **For Production:**
- ✅ Use environment variables
- ✅ Use secrets management (Kubernetes, Docker)
- ✅ Rotate tokens regularly
- ❌ Never commit real tokens to git

## **🐛 Troubleshooting**

### **Issue: "GitLab not configured"**
```bash
# Check configuration status
python3 config_helper.py status

# Common solutions:
# 1. Set environment variables
export GITLAB_URL="https://gitlab.com"
export GITLAB_ACCESS_TOKEN="your-token"

# 2. Create .env file
cp .env.template .env
# Edit .env with real values

# 3. Use UI configuration
python3 app.py
# Go to http://localhost:5000 and configure
```

### **Issue: "Connection failed"**
```bash
# Test GitLab API directly
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://gitlab.com/api/v4/user

# Check token permissions:
# - read_user
# - read_api  
# - read_repository
```

### **Issue: "No groups found"**
- Verify token has access to groups
- Check if user is member of any groups
- Test with different GitLab instance

## **📁 File Structure**

```
gitlab-dashboard/
├── .env                     # Your config (create from template)
├── .env.template           # Template with defaults
├── .env.demo              # Demo configuration
├── config.json            # Alternative config format
├── config_helper.py       # Configuration helper script
├── setup.sh              # Interactive setup
├── app.py                 # Main application
├── requirements.txt       # Dependencies
└── utils/
    └── enhanced_config.py # Enhanced config manager
```

## **💡 Pro Tips**

### **For Teams:**
1. **Share .env.template** with real company values:
   ```bash
   GITLAB_URL=https://gitlab.company.com
   GITLAB_ACCESS_TOKEN=ask-admin-for-token
   ```

2. **Everyone copies to .env:**
   ```bash
   cp .env.template .env
   # Edit .env with personal token
   ```

3. **No manual UI configuration needed!** ✨

### **For Different Environments:**
```bash
# Development
cp .env.template .env.dev

# Staging  
cp .env.template .env.staging

# Production
cp .env.template .env.prod

# Load specific environment
python3 -c "from dotenv import load_dotenv; load_dotenv('.env.dev')" && python3 app.py
```

## **🚀 Summary**

**Your question:** *"If values don't have .env or environment variables, pick from .env.template required?"*

**Answer:** ✅ **YES!** The enhanced system now supports this workflow:

1. Put **real defaults** in `.env.template`
2. Users get working configuration automatically
3. No manual UI entry required
4. Override with `.env` or environment variables as needed

**Perfect for teams and easy deployment!** 🎉
