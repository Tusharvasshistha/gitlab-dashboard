#!/bin/bash

echo "🚀 Setting up React Dashboard Frontend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "🌐 Download from: https://nodejs.org/"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "✅ React Dashboard Frontend setup complete!"
echo ""
echo "🏃‍♂️ To run the frontend:"
echo "1. npm start"
echo ""
echo "🌐 The app will be available at: http://localhost:3000"
echo "📡 Make sure the Flask API backend is running on http://localhost:5000"
