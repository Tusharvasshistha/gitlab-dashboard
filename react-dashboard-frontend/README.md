# GitLab Dashboard React Frontend

A modern React dashboard for visualizing GitLab data with a clean, responsive interface.

## Features

- 🎨 Modern React 18 with Hooks
- 📱 Responsive Bootstrap 5 design
- 🔄 Real-time data fetching with React Query
- 🎯 Intuitive navigation with React Router
- 📊 Interactive dashboard with statistics
- 🔍 Advanced project search functionality
- 👥 Groups and projects management
- 🔧 Easy GitLab configuration

## Components

### Main Pages
- **Dashboard** - Overview with statistics and quick actions
- **Groups** - Browse GitLab groups with expandable project lists
- **Projects** - Search and view detailed project information
- **Configuration** - Setup GitLab connection

### Features
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Real-time Updates** - Automatic data refresh
- **Search & Filter** - Find projects quickly
- **Pipeline Status** - View CI/CD pipeline information
- **Project Details** - Comprehensive project information

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

The app will open at `http://localhost:3000`

## Configuration

The React app expects the Flask API to be running on `http://localhost:5000`. This is configured in `package.json` with:

```json
"proxy": "http://localhost:5000"
```

## Build for Production

```bash
npm run build
```

This creates an optimized build in the `build` folder.

## Project Structure

```
src/
├── components/
│   ├── Header.js          # Navigation header
│   ├── Sidebar.js         # Side navigation
│   ├── Dashboard.js       # Main dashboard
│   ├── Groups.js          # Groups management
│   ├── Projects.js        # Projects with search
│   └── Configuration.js   # GitLab setup
├── contexts/
│   └── GitLabContext.js   # Global state management
├── App.js                 # Main app component
├── index.js              # App entry point
└── index.css             # Global styles
```

## API Integration

The frontend integrates with the Flask API backend using these endpoints:

- `GET /api/health` - Check API health and configuration
- `POST /api/config` - Configure GitLab connection
- `GET /api/groups` - Fetch GitLab groups
- `GET /api/groups/:id/projects` - Get projects for a group
- `GET /api/search/projects` - Search projects
- `GET /api/projects/:id` - Get project details
- `GET /api/projects/:id/pipelines` - Get project pipelines

## Dependencies

- **React 18** - Modern React with concurrent features
- **React Router** - Client-side routing
- **React Bootstrap** - UI components
- **React Query** - Data fetching and caching
- **React Icons** - Icon library
- **Moment.js** - Date/time formatting
- **Axios** - HTTP client

## Environment Variables

Create a `.env` file in the root directory:

```
REACT_APP_API_URL=http://localhost:5000
```

## Development

To run in development mode with hot reloading:

```bash
npm start
```

The app will automatically reload when you make changes to the source code.

## Deployment

For production deployment:

1. Build the app:
```bash
npm run build
```

2. Serve the built files using a web server like nginx or Apache

3. Make sure the API backend is accessible from your production domain

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
