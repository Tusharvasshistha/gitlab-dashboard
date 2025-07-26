#!/bin/bash

echo "🚀 Setting up Flask API Backend..."

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📄 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your GitLab URL and access token"
fi

echo "✅ Flask API Backend setup complete!"
echo ""
echo "🏃‍♂️ To run the backend:"
echo "1. source venv/bin/activate"
echo "2. python app.py"
echo ""
echo "🌐 The API will be available at: http://localhost:5000"
