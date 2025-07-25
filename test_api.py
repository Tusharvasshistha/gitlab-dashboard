#!/usr/bin/env python3
"""
Quick test script to verify GitLab API functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import GitLabAPI

def test_gitlab_api():
    """Test GitLab API connection"""
    
    # Example configuration - REPLACE WITH YOUR ACTUAL VALUES
    gitlab_url = "https://gitlab.com"
    access_token = "your-gitlab-access-token-here"  # Replace with your actual token
    
    # Better: Load from environment variables
    # gitlab_url = os.getenv('GITLAB_URL', 'https://gitlab.com')
    # access_token = os.getenv('GITLAB_ACCESS_TOKEN')
    # 
    # if not access_token:
    #     print("❌ No access token found. Set GITLAB_ACCESS_TOKEN environment variable.")
    #     return
    
    print("🧪 Testing GitLab API Connection...")
    print(f"GitLab URL: {gitlab_url}")
    print(f"Token: {access_token[:20]}...")
    
    try:
        # Initialize API
        api = GitLabAPI(gitlab_url, access_token)
        print("✅ GitLabAPI instance created successfully")
        
        # Test connection
        result = api.test_connection()
        print(f"🔗 Connection test result: {result}")
        
        if result['success']:
            print("✅ Connection successful!")
            
            # Test get_groups
            print("\n📁 Testing get_groups()...")
            groups_result = api.get_groups()
            print(f"Groups result: success={groups_result['success']}, count={len(groups_result.get('groups', []))}")
            
            if groups_result['success'] and groups_result['groups']:
                first_group = groups_result['groups'][0]
                print(f"First group: {first_group.get('name', 'Unknown')} (ID: {first_group.get('id')})")
                
                # Test get_subgroups
                print(f"\n📂 Testing get_subgroups for group {first_group.get('id')}...")
                subgroups_result = api.get_subgroups(first_group['id'])
                print(f"Subgroups result: success={subgroups_result['success']}, count={len(subgroups_result.get('subgroups', []))}")
                
                # Test get_group_projects
                print(f"\n📋 Testing get_group_projects for group {first_group.get('id')}...")
                projects_result = api.get_group_projects(first_group['id'])
                print(f"Projects result: success={projects_result['success']}, count={len(projects_result.get('projects', []))}")
        else:
            print(f"❌ Connection failed: {result.get('error')}")
            
    except Exception as e:
        print(f"❌ Test failed with exception: {str(e)}")
        return False
    
    print("\n🎉 All tests completed!")
    return True

if __name__ == "__main__":
    test_gitlab_api()
