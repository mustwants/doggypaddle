# DoggyPaddle Backend Setup Guide

This guide will help you set up the Google Apps Script backend for your DoggyPaddle website to fix CORS errors and enable photo submissions.

## Prerequisites

- A Google account
- Access to Google Sheets and Google Apps Script

## Step-by-Step Setup

### 1. Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click "Blank" to create a new spreadsheet
3. Name it "DoggyPaddle Management"
4. Copy the Sheet ID from the URL:
   - The URL will look like: `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit`
   - Copy the long string between `/d/` and `/edit` (this is your Sheet ID)

### 2. Set Up Google Apps Script

1. In your Google Sheet, go to **Extensions > Apps Script**
2. You'll see a code editor with some default code
3. **Delete all the default code**
4. Open the file `google-apps-script.gs` from this folder
5. **Copy all the code** from `google-apps-script.gs`
6. **Paste it** into the Google Apps Script editor
7. Find the line that says `const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';` (around line 36)
8. Replace `'YOUR_GOOGLE_SHEET_ID_HERE'` with your actual Sheet ID (keep the quotes)
9. Click the **Save** button (disk icon) or press `Ctrl+S` / `Cmd+S`
10. Name your project "DoggyPaddle Backend" when prompted

### 3. Initialize the Database Sheets

1. In the Google Apps Script editor, find the function dropdown (it says "Select function")
2. Select **`initializeSheets`** from the dropdown
3. Click the **Run** button (play icon)
4. You'll see a popup asking for authorization:
   - Click "Review Permissions"
   - Choose your Google account
   - Click "Advanced" then "Go to DoggyPaddle Backend (unsafe)"
   - Click "Allow"
5. Check your Google Sheet - you should now see 6 new tabs: TimeSlots, Bookings, Waivers, Products, Orders, and Photos

### 4. Deploy as Web App

1. In the Google Apps Script editor, click **Deploy > New deployment**
2. Click the **gear icon** next to "Select type"
3. Choose **"Web app"**
4. Configure the deployment settings:
   - **Description**: "DoggyPaddle Backend API v1"
   - **Execute as**: Select **"Me"** (your email)
   - **Who has access**: Select **"Anyone"** ⚠️ **CRITICAL: Must be "Anyone" for CORS to work!**
5. Click **Deploy**
6. You may need to authorize again - follow the same steps as in Step 3
7. **Copy the Web App URL** - it will look like:
   ```
   https://script.google.com/macros/s/AKfycbw...LONG_ID.../exec
   ```
   Save this URL - you'll need it in the next step!

### 5. Update Your Website Configuration

1. Open the file `/scripts/config.js` in your DoggyPaddle website
2. Find the line:
   ```javascript
   API_ENDPOINT: 'https://script.google.com/macros/s/YOUR_DEPLOYED_WEBAPP_ID/exec',
   ```
3. Replace the entire URL with your actual Web App URL from Step 4
4. Save the file
5. If your website is deployed (on Netlify, etc.), you'll need to push this change and redeploy

### 6. Test Your Setup

1. Open your DoggyPaddle website
2. Go to the Photos page
3. Try uploading a photo
4. If everything is set up correctly, the photo should upload successfully without CORS errors!

## Important Notes About Updates

### After Making Code Changes

If you ever need to update the Google Apps Script code:

1. Make your changes in the Google Apps Script editor
2. **Save the changes** (Ctrl+S / Cmd+S)
3. Go to **Deploy > Manage deployments**
4. Click **"New deployment"** (don't use "Edit" on existing deployment)
5. Follow the same deployment steps as before
6. **Update your config.js** with the new Web App URL
7. Redeploy your website if needed

⚠️ **Important**: Always create a NEW deployment after making changes. Simply editing an existing deployment may not update the live version immediately.

## Troubleshooting

### CORS Errors Still Appearing

If you're still seeing CORS errors after setup:

1. **Check "Who has access" setting**:
   - Go to Deploy > Manage deployments
   - Make sure it's set to "Anyone"
   - If not, create a new deployment with the correct setting

2. **Verify the URL in config.js**:
   - Make sure the URL ends with `/exec`
   - Make sure there are no extra spaces or quotes
   - Make sure you're using the most recent deployment URL

3. **Clear browser cache**:
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Or clear your browser cache completely

4. **Create a fresh deployment**:
   - Sometimes Google Apps Script caches the old version
   - Create a brand new deployment and use that URL

### "Failed to fetch" Errors

1. Check that your Sheet ID is correct in the script
2. Make sure you ran `initializeSheets` function
3. Verify that the script has permission to access your Google Sheet

### Photos Not Appearing in Gallery

1. Open your Google Sheet and check the "Photos" tab
2. Verify that photos are being saved (check for new rows)
3. Make sure the photo status is "approved" for it to show in the public gallery
4. Check the browser console for any JavaScript errors

## Testing with Sample Data

You can add sample data to test the system:

1. In Google Apps Script editor, select **`addSampleSlots`** from the function dropdown
2. Click Run to add sample time slots
3. Select **`addSampleProducts`** and run it to add sample products

## Need Help?

If you're still experiencing issues:

1. Check the browser console (F12) for detailed error messages
2. Check the Google Apps Script execution logs (View > Logs in the script editor)
3. Verify all steps were completed exactly as described
4. Make sure you're using the latest version of the code from this repository

## Security Note

This setup uses `Access-Control-Allow-Origin: *` which allows requests from any domain. For production use with sensitive data, you should:

1. Modify the `addCORSHeaders` function in the script
2. Replace `'*'` with your specific domain: `'https://doggypaddle.netlify.app'`
3. Create a new deployment after making this change

Example:
```javascript
function addCORSHeaders(output) {
  output.setHeader('Access-Control-Allow-Origin', 'https://doggypaddle.netlify.app');
  // ... rest of the headers
}
```
