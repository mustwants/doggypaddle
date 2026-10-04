# DoggyPaddle Admin Login Setup Guide

This guide will walk you through setting up the admin login system and Google Apps Script backend for DoggyPaddle.

## Overview

The admin system uses:
- **Google OAuth** for authentication (only authorized Google accounts can log in)
- **Google Apps Script** as a backend to store products, orders, bookings, etc. in Google Sheets
- **Client-side JavaScript** for the admin interface

## Prerequisites

- A Google account
- Access to Google Cloud Console
- Access to Google Sheets
- Your website deployed (for OAuth authorized origins)

---

## Part 1: Set Up Google OAuth (Required for Admin Login)

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name it "DoggyPaddle Admin" (or any name)
4. Click **Create**

### Step 2: Enable Google Identity Services

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google Identity Services"
3. Click on it and click **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (unless you have Google Workspace)
3. Fill in the required fields:
   - **App name**: DoggyPaddle Admin
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Click **Save and Continue**
5. Skip the scopes section (click **Save and Continue**)
6. Add test users (add Scott@mustwants.com and your email)
7. Click **Save and Continue**

### Step 4: Create OAuth 2.0 Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Select **Web application**
4. Name it "DoggyPaddle Web Client"
5. Under **Authorized JavaScript origins**, add:
   ```
   https://dogpaddle.club
   https://www.dogpaddle.club
   http://localhost:8000
   ```
   (Add any other domains you use)
6. Click **Create**
7. **IMPORTANT**: Copy the **Client ID** (looks like: `123456789-abc123.apps.googleusercontent.com`)
8. Save this Client ID - you'll need it in Part 3

---

## Part 2: Set Up Google Apps Script Backend

### Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "DoggyPaddle Management"
4. Copy the **Sheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
   ```
   The Sheet ID is the long string between `/d/` and `/edit`

### Step 2: Set Up Apps Script

1. In your Google Sheet, go to **Extensions** → **Apps Script**
2. Delete any existing code in the editor
3. Copy the entire contents of `/backend/google-apps-script.gs` from this repository
4. Paste it into the Apps Script editor
5. **IMPORTANT**: On line 36, replace `YOUR_GOOGLE_SHEET_ID_HERE` with your actual Sheet ID from Step 1:
   ```javascript
   const SHEET_ID = 'YOUR_ACTUAL_SHEET_ID';
   ```
6. Click **Save** (or Ctrl/Cmd+S)
7. Name the project "DoggyPaddle Backend"

### Step 3: Initialize the Sheets

1. In the Apps Script editor, select the function dropdown (next to Debug)
2. Select `initializeSheets`
3. Click **Run**
4. You'll see a popup asking for permissions:
   - Click **Review Permissions**
   - Choose your Google account
   - Click **Advanced** → **Go to DoggyPaddle Backend (unsafe)**
   - Click **Allow**
5. Wait for the function to complete (you'll see "Execution completed" in the log)
6. Go back to your Google Sheet - you should now see 6 new tabs:
   - TimeSlots
   - Bookings
   - Waivers
   - Products
   - Orders
   - Photos

### Step 4: Deploy as Web App

This is the **most critical step** for fixing CORS errors!

1. In the Apps Script editor, click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Choose **Web app**
4. Configure the deployment:
   - **Description**: "DoggyPaddle Backend API v1"
   - **Execute as**: **Me** (your email)
   - **Who has access**: **Anyone** ⚠️ **THIS IS CRITICAL!**
     - **MUST be "Anyone"** for CORS to work properly
     - This allows your website to call the API
5. Click **Deploy**
6. Review the permissions again and click **Authorize access**
7. **IMPORTANT**: Copy the **Web App URL**
   ```
   https://script.google.com/macros/s/AKfycbw...LONG_ID.../exec
   ```
8. Save this URL - you'll need it in Part 3

### Step 5: Test the Deployment (Optional)

1. Open the Web App URL in a new browser tab
2. Add `?action=getProducts` to the end:
   ```
   https://script.google.com/macros/s/YOUR_ID/exec?action=getProducts
   ```
3. You should see a JSON response like:
   ```json
   {"status":"success","products":[]}
   ```
4. If you see this, your backend is working!

---

## Part 3: Update Website Configuration

### Update `/scripts/config.js`

Open `/scripts/config.js` and update the following:

1. **Replace the API_ENDPOINT** (line 24):
   ```javascript
   API_ENDPOINT: 'https://script.google.com/macros/s/YOUR_ACTUAL_WEB_APP_ID/exec',
   ```
   Paste your Web App URL from Part 2, Step 4

2. **Replace the Google Client ID** (line 35):
   ```javascript
   GOOGLE_AUTH: {
     clientId: 'YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com',
     allowedAdmins: ['Scott@mustwants.com']
   },
   ```
   Paste your OAuth Client ID from Part 1, Step 4

3. **Add more admin emails** (if needed):
   ```javascript
   allowedAdmins: [
     'Scott@mustwants.com',
     'another-admin@example.com'
   ]
   ```

### Save and Deploy

1. Save the `config.js` file
2. Commit and push your changes to GitHub
3. Your changes will be live once deployed

---

## Part 4: Testing Admin Login

1. Go to your website: `https://dogpaddle.club/store`
2. Scroll to the footer and click **"Admin Dashboard"**
3. Click the **"Sign in with Google"** button
4. Sign in with an authorized admin account (Scott@mustwants.com)
5. You should see the admin panel open!

### If Login Doesn't Work:

**"Popup blocked" or button doesn't appear:**
- Check browser console for errors (F12 → Console tab)
- Make sure the Client ID in `config.js` is correct
- Verify the domain is in "Authorized JavaScript origins"

**"Access denied" after signing in:**
- Make sure the email is in the `allowedAdmins` array in `config.js`
- Email addresses are case-insensitive but must match exactly

**CORS errors when loading products:**
- Make sure you deployed the Apps Script as **"Anyone"** access
- Try creating a NEW deployment (Deploy → New deployment)
- Clear browser cache and try again

---

## Part 5: Adding Sample Data (Optional)

To add sample products for testing:

1. Go to your Google Sheet → Extensions → Apps Script
2. Select the function dropdown
3. Choose `addSampleProducts`
4. Click **Run**
5. Go back to your sheet - you should see sample products in the "Products" tab
6. Refresh your store page - the products should appear!

---

## Security Notes

✅ **What's Secure:**
- Only authorized Google accounts can access admin panel
- Authentication via Google OAuth
- Email verification against allowedAdmins list

⚠️ **What to Know:**
- The Google Apps Script Web App is set to "Anyone" access for CORS
- Anyone can call the API, but only admins can see the admin panel
- For production, consider adding API key authentication to the backend

---

## Troubleshooting Common Issues

### CORS Error: "No 'Access-Control-Allow-Origin' header"

**Cause**: Web App not deployed with "Anyone" access

**Fix**:
1. Go to Apps Script → Deploy → Manage deployments
2. Click Edit (pencil icon)
3. Change "Who has access" to **"Anyone"**
4. Click **Deploy**

OR create a NEW deployment with "Anyone" access

### "YOUR_DEPLOYED_WEBAPP_ID" still showing

**Cause**: `config.js` not updated

**Fix**: Update line 24 in `/scripts/config.js` with your actual Web App URL

### Google Sign-In button not appearing

**Cause**: Invalid or missing Client ID

**Fix**:
1. Check browser console for errors
2. Verify Client ID in `config.js` (line 35)
3. Make sure Google Identity Services library is loading (check line 11 in store HTML)

### Admin panel shows no products

**Cause**: No products in Google Sheet yet

**Fix**: Run `addSampleProducts()` function in Apps Script (see Part 5)

---

## Next Steps After Setup

Once everything is working:

1. ✅ Test admin login with authorized account
2. ✅ Add/edit/delete products from admin panel
3. ✅ Add time slots for booking
4. ✅ Test the booking flow
5. ✅ Review submitted photos
6. ✅ Export booking data

---

## Support

If you encounter issues:
1. Check the browser console (F12 → Console) for error messages
2. Check the Apps Script execution log (View → Execution log)
3. Verify all IDs and URLs are correct in `config.js`
4. Make sure all OAuth origins and Web App access settings are correct

---

**Last Updated**: 2025-11-15
