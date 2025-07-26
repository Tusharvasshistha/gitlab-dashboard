# GitLab Dashboard Full-Stack Application

A comprehensive GitLab dashboard solution with Flask API backend and React frontend for enhanced project management, issue tracking, and team collaboration.

## 🏗️ Project Structure

```
gitlab-dashboard/
├── flask-api-backend/          # Flask API Backend
│   ├── app.py                  # Main Flask application
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example           # Environment variables template
│   └── setup.sh               # Backend setup script
├── react-dashboard-frontend/   # React Frontend
│   ├── src/                   # React source code
│   ├── public/                # Public assets
│   ├── package.json           # Node.js dependencies
│   └── setup.sh               # Frontend setup script
├── .gitlab-ci.yml             # GitLab CI/CD pipeline
└── README_FULLSTACK.md        # This file
```

## 🚀 Features

### Flask API Backend
- **GitLab Integration**: Complete GitLab v4 API integration
- **Project Management**: Groups, projects, and hierarchy management
- **Issue Tracking**: Comprehensive issue management and analytics
- **Merge Requests**: MR tracking and approval workflows
- **Analytics**: Advanced project and team analytics
- **Team Management**: Member management and permissions
- **Real-time Data**: Live GitLab data synchronization

### React Frontend
- **Modern UI**: Bootstrap 5 with responsive design
- **Interactive Dashboard**: Real-time project insights
- **Advanced Filtering**: Multi-level filtering and search
- **Analytics Visualization**: Charts and statistics
- **Issue Management**: Complete issue lifecycle management
- **Merge Request Tracking**: MR status and approval tracking
- **Team Collaboration**: Team member management interface

## 🛠️ Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18.14.0+
- GitLab Personal Access Token
- Git

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd flask-api-backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your GitLab token and settings
   ```

5. **Run the backend:**
   ```bash
   python app.py
   ```

   Backend will be available at: `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd react-dashboard-frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Start development server:**
   ```bash
   npm start
   ```

   Frontend will be available at: `http://localhost:3000`

## 🔧 Configuration

### Backend Configuration (.env)
```env
GITLAB_URL=https://gitlab.com
GITLAB_TOKEN=glpat-your-personal-access-token
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key
```

### Frontend Configuration
The frontend is configured to proxy API requests to `http://localhost:5000` during development.

## 📊 API Endpoints

### Core Endpoints
- `GET /api/dashboard/overview` - Dashboard overview data
- `GET /api/groups` - All groups with hierarchy
- `GET /api/projects` - All projects with pagination
- `GET /api/projects/<id>/analytics` - Project analytics
- `GET /api/projects/<id>/issues` - Project issues
- `GET /api/projects/<id>/merge-requests` - Project merge requests
- `GET /api/projects/<id>/members` - Project team members

### Advanced Features
- Issues management with filtering and search
- Merge request tracking and approval workflows
- Team member management and permissions
- Advanced analytics and reporting
- Real-time data synchronization

## 🚀 GitLab CI/CD

This project includes a comprehensive GitLab CI/CD pipeline with:

### Pipeline Stages
1. **Build**: Dependencies installation and compilation
2. **Test**: Automated testing for both frontend and backend
3. **Deploy**: Staging and production deployment

### Pipeline Features
- Separate jobs for backend and frontend
- Caching for faster builds
- Artifact management
- Environment-specific deployments
- Manual deployment gates
- Test coverage reporting

### Running the Pipeline
The pipeline automatically triggers on:
- Push to `main` branch (production)
- Push to `develop` branch (staging)
- Merge requests (testing)

## 🏃‍♂️ Development Workflow

### Local Development
1. Start backend server: `cd flask-api-backend && python app.py`
2. Start frontend dev server: `cd react-dashboard-frontend && npm start`
3. Access application at `http://localhost:3000`

### Code Structure

#### Backend (Flask)
- `app.py`: Main Flask application with all API endpoints
- Routes organized by functionality (groups, projects, issues, etc.)
- GitLab API integration with error handling
- CORS configuration for frontend integration

#### Frontend (React)
- Component-based architecture
- React Query for data fetching and caching
- React Router for navigation
- Bootstrap 5 for responsive UI
- Modular component structure

## 🔒 Security Features

- Environment variable configuration
- GitLab token security
- CORS configuration
- Input validation and sanitization
- Error handling and logging

## 📈 Performance Optimizations

- React Query caching
- Pagination for large datasets
- Lazy loading of components
- Optimized API calls
- Database query optimization

## 🧪 Testing

### Backend Testing
```bash
cd flask-api-backend
source venv/bin/activate
python -m pytest
```

### Frontend Testing
```bash
cd react-dashboard-frontend
npm test
```

## 📦 Production Deployment

### Using GitLab CI/CD
1. Configure GitLab runners
2. Set environment variables in GitLab
3. Push to `main` branch
4. Manually trigger production deployment

### Manual Deployment
1. Build frontend: `npm run build`
2. Configure production environment variables
3. Deploy to your hosting platform

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a merge request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the GitLab repository
- Check the documentation
- Review the API endpoints

---

**Tech Stack:**
- Backend: Flask, Python 3.9+, GitLab API v4
- Frontend: React 18, Bootstrap 5, React Query
- CI/CD: GitLab CI/CD
- Development: Node.js 18+, Python virtual environments
