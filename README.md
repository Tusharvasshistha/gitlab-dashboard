# GitLab Dashboard

A comprehensive web-based dashboard for viewing GitLab groups, subgroups, and projects using GitLab API endpoints.

## Features

- **Hierarchical View**: Display groups, subgroups, and their associated projects in a clean, organized structure
- **Real-time Data**: Fetches live data from GitLab using REST API endpoints
- **Interactive UI**: Collapsible sections for better navigation and user experience
- **Statistics**: Shows total counts of groups, subgroups, and projects
- **Project Details**: Displays project visibility, stars, forks, and last activity
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Lazy Loading**: Subgroup projects are loaded on-demand for better performance
- **Local Storage**: Saves your GitLab URL and access token for convenience

## GitLab API Endpoints Used

This dashboard utilizes the following GitLab API v4 endpoints:

- `GET /api/v4/groups?top_level_only=true&per_page=100` - Get top-level groups
- `GET /api/v4/groups/{id}/subgroups?per_page=100` - Get subgroups of a specific group
- `GET /api/v4/groups/{id}/projects?include_subgroups=false&per_page=100` - Get projects in a group

## Setup Instructions

### Prerequisites

1. **GitLab Access Token**: You need a GitLab Personal Access Token with appropriate permissions
   - Go to GitLab → Profile → Access Tokens
   - Create a token with `read_api` scope
   - Copy the token (you'll need it for the dashboard)

### Installation

1. **Clone or Download**: Get the dashboard files to your local machine

2. **Serve the Files**: Since the dashboard uses modern JavaScript features and makes API calls, you need to serve it through a web server (not just open the HTML file directly)

   **Option 1: Using Python (if you have Python installed)**
   ```bash
   # Navigate to the dashboard directory
   cd gitlab-dashboard
   
   # Start a simple HTTP server
   python3 -m http.server 8000
   
   # Open http://localhost:8000 in your browser
   ```

   **Option 2: Using Node.js (if you have Node.js installed)**
   ```bash
   # Install a simple server globally
   npm install -g http-server
   
   # Navigate to the dashboard directory and start server
   cd gitlab-dashboard
   http-server -p 8000
   
   # Open http://localhost:8000 in your browser
   ```

   **Option 3: Using Live Server (VS Code Extension)**
   - Install the "Live Server" extension in VS Code
   - Right-click on `index.html` and select "Open with Live Server"

### Configuration

1. **Open the Dashboard**: Navigate to the served URL in your web browser

2. **Enter Configuration**:
   - **GitLab URL**: Enter your GitLab instance URL (e.g., `https://gitlab.com` for GitLab.com)
   - **Access Token**: Enter your GitLab Personal Access Token

3. **Load Dashboard**: Click "Load Dashboard" to fetch and display your GitLab structure

## Usage

1. **Navigation**: 
   - Click on group headers to expand/collapse their contents
   - Subgroup projects are loaded when you expand a subgroup (lazy loading)

2. **Project Information**:
   - Click on project names to open them in GitLab
   - View project visibility, star count, fork count, and last activity
   - See project descriptions and IDs

3. **Statistics**:
   - View real-time counts of total groups, subgroups, and projects
   - See when the dashboard was last updated

## File Structure

```
gitlab-dashboard/
├── index.html          # Main HTML structure
├── styles.css          # CSS styling and animations
├── script.js           # JavaScript functionality and API calls
└── README.md          # This documentation
```

## Features Breakdown

### 🎯 Core Functionality
- Fetches GitLab data using REST API endpoints
- Displays hierarchical structure (Groups → Subgroups → Projects)
- Real-time statistics and counts

### 🎨 User Interface
- Modern, responsive design using Bootstrap 5
- Font Awesome icons for visual elements
- Smooth animations and transitions
- Collapsible sections for better organization

### ⚡ Performance
- Lazy loading for subgroup projects
- Efficient API calls with pagination
- Local storage for configuration persistence

### 🔒 Security
- Secure token handling
- HTTPS-ready for production use
- No server-side storage of credentials

## Troubleshooting

### Common Issues

1. **"No groups found" Error**:
   - Verify your access token has the correct permissions
   - Check if you have access to any groups in your GitLab instance

2. **CORS Errors**:
   - Make sure you're serving the files through a web server
   - Don't open the HTML file directly in the browser

3. **API Rate Limiting**:
   - GitLab has API rate limits; if you hit them, wait a few minutes and try again

4. **Self-hosted GitLab Issues**:
   - Ensure your GitLab instance is accessible from your browser
   - Check if HTTPS is properly configured

## Customization

### Modifying the Dashboard

You can customize the dashboard by editing:

- **`styles.css`**: Change colors, layout, animations
- **`script.js`**: Modify API calls, add new features, change data processing
- **`index.html`**: Update the structure, add new sections

### Adding New Features

Some ideas for enhancements:
- Search functionality for projects/groups
- Project filtering by language or activity
- Export functionality for project lists
- Integration with GitLab issues or merge requests
- Dark mode toggle

## API Reference

### Authentication
All API calls use Bearer token authentication:
```javascript
headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
}
```

### Key Endpoints
- **Groups**: `/api/v4/groups` - List all groups
- **Subgroups**: `/api/v4/groups/{id}/subgroups` - List subgroups
- **Projects**: `/api/v4/groups/{id}/projects` - List group projects

For complete API documentation, visit: [GitLab API Documentation](https://docs.gitlab.com/ee/api/)

## License

This project is open source. Feel free to modify and distribute as needed.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify your GitLab API access and permissions
3. Ensure you're serving the files through a proper web server
