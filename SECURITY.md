# Security Guidelines

## 🔒 Important Security Considerations

### GitLab Access Tokens
- **Never commit actual tokens to version control**
- Use environment variables or configuration files that are git-ignored
- Rotate tokens regularly
- Use minimum required permissions (typically `api` scope)

### Files to Keep Secure
1. `.env` - Environment variables (git-ignored)
2. `gitlab_dashboard.db` - Database file (git-ignored)
3. Any custom configuration files with credentials

### Safe Setup Process

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit .env with your actual credentials:**
   ```bash
   # .env file
   GITLAB_URL=https://gitlab.com
   GITLAB_ACCESS_TOKEN=glpat-your-actual-token-here
   SECRET_KEY=your-secure-random-key
   ```

3. **Verify .env is git-ignored:**
   ```bash
   git status
   # .env should NOT appear in the list
   ```

### Postman Collection Setup

1. **Import the collection** (`GitLab_Dashboard_API.postman_collection.json`)
2. **Update variables** in Postman environment:
   - Set `access_token` to your actual GitLab token
   - Update `base_url` if using different host/port

### Production Deployment

- Use environment variables or secure key management
- Enable HTTPS/TLS encryption
- Restrict network access to the application
- Regular security updates and token rotation
- Monitor access logs

### What's Safe to Commit

✅ **Safe:**
- Application code
- Templates and static files
- Documentation
- .env.example (with placeholders)
- Postman collection (with placeholders)

❌ **Never commit:**
- Actual access tokens
- .env files with real credentials
- Database files with sensitive data
- Any files containing real API keys

---

**Remember:** Security is a shared responsibility. Always review your commits before pushing!
