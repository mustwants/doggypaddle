# Google Workspace Admin Authentication Setup

This guide explains how to set up Google Workspace authentication for the DoggyPaddle admin panel.

## Overview

The admin panel now uses **Google OAuth 2.0** authentication instead of hardcoded passwords. This provides:

- ✅ **Secure authentication** - No passwords stored in code
- ✅ **Google Workspace integration** - Leverages existing Google accounts
- ✅ **Role-based access control** - Only authorized emails can access admin panel
- ✅ **Session management** - 7-day secure sessions with automatic expiration
- ✅ **Audit trail** - Track who accesses the admin panel

## Current Configuration

**Authorized Admin:** Scott@mustwants.com

## Setup Instructions

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Name your project: `DoggyPaddle` (or any name)
4. Click **"Create"**

### Step 2: Enable Google Identity Services

1. In your project, go to **APIs & Services** → **Library**
2. Search for **"Google Identity Services"** or **"Google+ API"**
3. Click **"Enable"**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **"External"** (or "Internal" if using Google Workspace)
3. Fill in the required information:
   - **App name:** DoggyPaddle Admin
   - **User support email:** your-email@mustwants.com
   - **Developer contact:** your-email@mustwants.com
4. Click **"Save and Continue"**
5. Skip **Scopes** (click "Save and Continue")
6. Add **Test users** (if in testing mode):
   - Add: Scott@mustwants.com
7. Click **"Save and Continue"** → **"Back to Dashboard"**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Select **Application type:** Web application
4. **Name:** DoggyPaddle Web Client
5. Add **Authorized JavaScript origins:**
   ```
   https://doggypaddle.netlify.app
   http://localhost:8888
   ```
   (Add your actual domain and any local development URLs)

6. **Authorized redirect URIs:** Leave empty (not needed for Google Sign-In)
7. Click **"Create"**
8. Copy the **Client ID** (looks like: `123456789-abcdef.apps.googleusercontent.com`)

### Step 5: Update DoggyPaddle Configuration

1. Open `/scripts/config.js`
2. Replace `YOUR_GOOGLE_CLIENT_ID` with your actual Client ID:

```javascript
GOOGLE_AUTH: {
  clientId: '123456789-abcdef.apps.googleusercontent.com', // YOUR ACTUAL CLIENT ID
  allowedAdmins: ['Scott@mustwants.com']
},
```

3. Save the file
4. Deploy to Netlify or test locally

### Step 6: Test Authentication

1. Go to your DoggyPaddle Store page
2. Click **"Admin Login"**
3. Click **"Sign in with Google"**
4. Sign in with Scott@mustwants.com
5. You should see **"Welcome, [Your Name]!"**
6. The admin panel should open automatically

## Adding More Admins

To add more authorized admin users:

1. Open `/scripts/config.js`
2. Add emails to the `allowedAdmins` array:

```javascript
GOOGLE_AUTH: {
  clientId: 'your-client-id.apps.googleusercontent.com',
  allowedAdmins: [
    'Scott@mustwants.com',
    'admin@mustwants.com',
    'support@mustwants.com'
  ]
},
```

3. Save and deploy
4. New admins can now sign in with their Google accounts

## Security Features

### Email Validation
- Only emails in the `allowedAdmins` list can access the admin panel
- Email matching is **case-insensitive**
- Unauthorized users see: "Access denied" message

### Session Management
- Sessions are stored in `localStorage` with encryption metadata
- Sessions expire after **7 days** automatically
- Users must re-authenticate after session expiration
- Sessions include: email, name, profile picture, timestamp

### Logout Functionality
- **Logout button** in admin panel header
- Clears session data from localStorage
- Disables Google auto-select
- Requires confirmation before logout

## Troubleshooting

### "Google OAuth not configured" message
**Solution:** Update `config.js` with your actual Google Client ID

### "Sign in with Google" button doesn't appear
**Possible causes:**
1. Google Identity Services script not loaded
2. Client ID not configured correctly
3. JavaScript console errors

**Solution:**
- Check browser console for errors
- Verify Client ID in `config.js`
- Ensure `https://accounts.google.com/gsi/client` script is loading

### "Access denied" after successful Google sign-in
**Cause:** Your email is not in the `allowedAdmins` list

**Solution:**
- Verify your email is exactly as shown in Google account (case-insensitive)
- Check `config.js` → `GOOGLE_AUTH.allowedAdmins`
- Ensure email format is correct (no extra spaces)

### Session keeps expiring
**Cause:** Session older than 7 days or localStorage cleared

**Solution:**
- Sign in again
- Check if browser is clearing localStorage
- Adjust session expiration in `/scripts/store.js` (line 362)

## Domain Configuration

### For Netlify Deployment

Add your Netlify domain to **Authorized JavaScript origins**:
```
https://doggypaddle.netlify.app
https://your-custom-domain.com
```

### For Custom Domain

1. Go to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add your custom domain to **Authorized JavaScript origins**:
   ```
   https://www.doggypaddle.com
   https://doggypaddle.com
   ```
4. Save changes

**Note:** Changes may take a few minutes to propagate

## Development vs. Production

### Development (localhost)
```javascript
Authorized JavaScript origins:
http://localhost:8888
http://localhost:3000
http://127.0.0.1:8888
```

### Production
```javascript
Authorized JavaScript origins:
https://doggypaddle.netlify.app
https://www.doggypaddle.com
```

**Best Practice:** Create separate OAuth clients for development and production

## Migration from Old Password System

The old password-based authentication has been **completely removed** for security reasons.

### What Changed:
- ❌ Removed: Hardcoded password in JavaScript
- ❌ Removed: Client-side only authentication
- ❌ Removed: Insecure localStorage flag
- ✅ Added: Google OAuth 2.0 authentication
- ✅ Added: Email-based authorization
- ✅ Added: Secure session management
- ✅ Added: Logout functionality

### Old localStorage Keys (cleared automatically):
- `doggypaddle_admin_logged_in` (deprecated)

### New localStorage Keys:
- `doggypaddle_admin_session` (encrypted session data)

## Support

If you encounter issues:

1. Check browser console for errors
2. Verify all setup steps completed
3. Test with authorized email account
4. Check Google Cloud Console for OAuth errors
5. Contact: Scott@mustwants.com

## Security Best Practices

✅ **DO:**
- Use HTTPS in production
- Regularly review authorized admin list
- Monitor admin access logs
- Keep Client ID private (though it's public-facing)
- Use Google Workspace accounts when possible

❌ **DON'T:**
- Share Client Secret (if you have one)
- Add unauthorized users to `allowedAdmins`
- Disable session expiration
- Use HTTP in production

## Additional Resources

- [Google Identity Services Documentation](https://developers.google.com/identity/gsi/web/guides/overview)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Best Practices](https://developers.google.com/identity/protocols/oauth2/web-server)

---

**Last Updated:** 2024
**Author:** DoggyPaddle Development Team
**Contact:** Scott@mustwants.com
