# Google Workspace Admin SDK Setup Guide

## Overview
This guide covers the setup of Google Admin SDK integration for automated Google Workspace account creation for therapists.

## Required Environment Variables

Add these environment variables to your Replit secrets or `.env` file:

```bash
# Google Workspace Configuration
GOOGLE_WORKSPACE_DOMAIN=hive-wellness.co.uk
GOOGLE_ADMIN_EMAIL=support@hive-wellness.co.uk
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
GOOGLE_WORKSPACE_OU=/Therapists
```

## Google Cloud Console Setup

### 1. Enable Required APIs
In Google Cloud Console, enable these APIs:
- Admin SDK API
- Calendar API  
- Gmail API
- Google Drive API (optional)

### 2. Create Service Account
1. Go to IAM & Admin > Service Accounts
2. Create new service account
3. Grant these roles:
   - Project Editor (or custom role with necessary permissions)
4. Create and download JSON key file

### 3. Configure Domain-Wide Delegation
1. In service account details, enable "Domain-wide delegation"
2. Note the client ID
3. Go to Google Workspace Admin Console
4. Navigate to Security > API Controls > Domain-wide delegation
5. Add the service account with these scopes:

```
https://www.googleapis.com/auth/admin.directory.user
https://www.googleapis.com/auth/admin.directory.group
https://www.googleapis.com/auth/admin.directory.orgunit
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/gmail.send
```

## Required Google Workspace Permissions

The service account needs these Admin SDK permissions:
- **User Management**: Create, read, update, delete users
- **Group Management**: Add users to groups (optional)
- **Calendar Management**: Create and manage calendars
- **Email Management**: Send welcome emails

## Organization Unit Setup

1. In Google Workspace Admin Console, go to Directory > Organizational units
2. Create an organizational unit called "Therapists" 
3. Configure appropriate settings for therapist accounts:
   - Password policy
   - 2-step verification requirements
   - App access permissions

## Testing the Integration

### 1. Environment Check
```bash
curl -X GET "https://your-app.replit.app/api/google-workspace/environment-check" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Authentication Test
```bash
curl -X GET "https://your-app.replit.app/api/google-workspace/test-auth" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Create Test Account
```bash
curl -X POST "https://your-app.replit.app/api/google-workspace/create-account" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "firstName": "Test",
    "lastName": "Therapist", 
    "email": "test@example.com"
  }'
```

## Database Schema

The following fields are added to the `therapist_profiles` table:

```sql
-- Google Workspace Integration Fields
google_workspace_email VARCHAR(255),
google_calendar_id VARCHAR(255),
workspace_account_created BOOLEAN DEFAULT false,
workspace_created_at TIMESTAMP,
workspace_account_status VARCHAR(50) DEFAULT 'pending',
workspace_temp_password VARCHAR(255),
workspace_last_login TIMESTAMP,
calendar_permissions_configured BOOLEAN DEFAULT false,
workspace_account_notes TEXT
```

## API Endpoints

### Authentication & Testing
- `GET /api/google-workspace/environment-check` - Check environment configuration
- `GET /api/google-workspace/test-auth` - Test Google Admin SDK authentication
- `POST /api/google-workspace/initialize` - Initialize/reinitialize services

### Account Management  
- `POST /api/google-workspace/create-account` - Create therapist workspace account
- `DELETE /api/google-workspace/delete-account` - Delete therapist workspace account
- `GET /api/google-workspace/account-status/:email` - Get account status

## Security Considerations

### Credential Security
- Store Google service account key in Replit secrets
- Use environment variables for configuration
- Never log or expose service account credentials

### API Rate Limiting
- Google Admin SDK has rate limits
- Implement exponential backoff for retries
- Monitor API quota usage

### Audit Logging
- Log all account creation/deletion operations
- Track which admin performed operations
- Store operation timestamps and results

### Error Handling
- Handle Google API errors gracefully
- Provide meaningful error messages
- Implement rollback for partial failures

## Troubleshooting

### Common Issues

1. **403 Forbidden**: Domain-wide delegation not configured
   - Verify service account has domain-wide delegation enabled
   - Check scopes are properly configured in Admin Console

2. **404 Not Found**: User or organizational unit doesn't exist
   - Verify organizational unit path is correct
   - Check if target user already exists

3. **429 Rate Limited**: Too many API requests
   - Implement exponential backoff
   - Check API quota limits

4. **Authentication Failed**: Service account issues
   - Verify service account key is valid
   - Check if service account has required permissions

### Debug Commands

```bash
# Check environment
node -e "console.log(JSON.stringify({
  domain: process.env.GOOGLE_WORKSPACE_DOMAIN,
  admin: process.env.GOOGLE_ADMIN_EMAIL,
  hasKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY
}, null, 2))"

# Test service account
curl -X GET "https://your-app.replit.app/api/google-workspace/test-auth"
```

## Workflow Integration

### Therapist Onboarding
1. Admin approves therapist application
2. System creates Google Workspace account
3. Dedicated calendar is created
4. Welcome email sent with credentials
5. Therapist completes setup and password change

### Account Lifecycle
- **Active**: Normal operation, can book appointments
- **Suspended**: Temporary suspension, account disabled
- **Deleted**: Permanent removal, account and data deleted

## Next Steps

After basic integration is working:
1. Integrate with therapist onboarding workflow
2. Add automatic calendar permission management
3. Implement group-based organization
4. Add calendar conflict detection across therapists
5. Set up automated backup and monitoring