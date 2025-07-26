#!/bin/bash

# GitLab Dashboard Setup Script
# This script helps users set up the dashboard without manual UI configuration

set -e

echo "🚀 GitLab Dashboard Setup Script"
echo "=================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to generate random secret key
generate_secret_key() {
    if command_exists python3; then
        python3 -c "import secrets; print(secrets.token_urlsafe(32))"
    elif command_exists openssl; then
        openssl rand -base64 32
    else
        echo "$(date +%s | sha256sum | base64 | head -c 32)"
    fi
}

# Function to validate GitLab URL
validate_gitlab_url() {
    local url="$1"
    if [[ ! "$url" =~ ^https?:// ]]; then
        echo "❌ Error: GitLab URL must start with http:// or https://"
        return 1
    fi
    return 0
}

# Function to validate access token
validate_access_token() {
    local token="$1"
    if [[ ${#token} -lt 20 ]]; then
        echo "❌ Error: Access token appears to be too short (minimum 20 characters)"
        return 1
    fi
    return 0
}

# Check if .env already exists
if [[ -f ".env" ]]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

echo ""
echo "📋 Please provide the following information:"

# Get GitLab URL
while true; do
    read -p "GitLab URL (e.g., https://gitlab.com): " GITLAB_URL
    if validate_gitlab_url "$GITLAB_URL"; then
        break
    fi
done

# Get Access Token
while true; do
    read -s -p "GitLab Access Token: " GITLAB_ACCESS_TOKEN
    echo
    if validate_access_token "$GITLAB_ACCESS_TOKEN"; then
        break
    fi
done

# Optional: Get custom port
read -p "Port (default 5000): " FLASK_PORT
FLASK_PORT=${FLASK_PORT:-5000}

# Optional: Get host
read -p "Host (default 0.0.0.0): " FLASK_HOST
FLASK_HOST=${FLASK_HOST:-0.0.0.0}

# Generate secret key
SECRET_KEY=$(generate_secret_key)

echo ""
echo "📝 Creating .env file..."

# Create .env file
cat > .env << EOF
# GitLab Dashboard Configuration
# Generated on $(date)

# GitLab Configuration
GITLAB_URL=$GITLAB_URL
GITLAB_ACCESS_TOKEN=$GITLAB_ACCESS_TOKEN

# Application Configuration
SECRET_KEY=$SECRET_KEY
FLASK_DEBUG=false
FLASK_HOST=$FLASK_HOST
FLASK_PORT=$FLASK_PORT

# Database Configuration
DATABASE_URL=gitlab_dashboard.db

# UI Configuration
SHOW_CONFIG_SECTION=false
DEFAULT_VIEW=dashboard

# Sync Configuration
AUTO_SYNC_ENABLED=false
SYNC_INTERVAL_MINUTES=30

# Logging Configuration
LOG_LEVEL=INFO
EOF

echo "✅ .env file created successfully!"

# Test GitLab connection
echo ""
echo "🔍 Testing GitLab connection..."

if command_exists curl; then
    response=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $GITLAB_ACCESS_TOKEN" "$GITLAB_URL/api/v4/user")
    if [[ "$response" == "200" ]]; then
        echo "✅ GitLab connection successful!"
    else
        echo "⚠️  GitLab connection test failed (HTTP $response). Please verify your URL and token."
    fi
else
    echo "⚠️  curl not found. Skipping connection test."
fi

# Check for Python dependencies
echo ""
echo "📦 Checking dependencies..."

if [[ -f "requirements.txt" ]]; then
    if command_exists pip3; then
        echo "Installing Python dependencies..."
        pip3 install -r requirements.txt
        echo "✅ Dependencies installed!"
    else
        echo "⚠️  pip3 not found. Please install dependencies manually:"
        echo "   pip3 install -r requirements.txt"
    fi
else
    echo "⚠️  requirements.txt not found."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the dashboard:"
echo "  python3 app.py"
echo ""
echo "The dashboard will be available at: http://$FLASK_HOST:$FLASK_PORT"
echo ""
echo "📄 Configuration files created:"
echo "  - .env (your configuration)"
echo "  - .env.template (template for others)"
echo ""
echo "🐳 For Docker deployment:"
echo "  docker-compose up -d"
echo ""
echo "🔧 To reconfigure later:"
echo "  - Edit .env file manually"
echo "  - Or run this script again"
