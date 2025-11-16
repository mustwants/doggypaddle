# Google Apps Script Deployment Guide - Fix CORS Errors

## 🚨 Current Issue

You're seeing this CORS error:
```
Access to fetch at 'https://script.google.com/macros/s/.../exec?action=getProducts'
from origin 'https://dogpaddle.club' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

This happens because:
1. The Apps Script code needs to explicitly set CORS headers using `.setHeader()`
2. The updated code with proper CORS headers hasn't been deployed yet
3. OR a `doOptions()` function is missing to handle CORS preflight requests

---

## ✅ Step-by-Step Deployment Instructions

### Step 1: Open Google Apps Script Editor

1. Go to your Google Sheet: https://docs.google.com/spreadsheets/d/1q7yUDjuVSwXfL9PJUTny0oy5Nr5jlVKsdyik2-vTL8I/edit
2. Click **Extensions → Apps Script**

### Step 2: Update the Script Code

Copy the updated code from one of these files:
- For custom sheet: `/backend/google-apps-script-custom.gs`
- For full backend: `/backend/google-apps-script.gs`

**IMPORTANT:** Make sure the code includes the updated `createResponse()` function WITH proper CORS headers:

```javascript
// Helper: Create JSON response with CORS headers
function createResponse(data) {
  const jsonOutput = JSON.stringify(data);

  return ContentService
    .createTextOutput(jsonOutput)
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', 'https://dogpaddle.club')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
```

**AND** make sure you have the `doOptions()` function for CORS preflight:

```javascript
// Handle CORS preflight (OPTIONS) requests
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', 'https://dogpaddle.club')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '86400');
}
```

### Step 3: Save the Project

1. Click the **Save** icon (💾) or press `Ctrl+S` / `Cmd+S`
2. Wait for "All changes saved" message

### Step 4: Create a NEW Deployment (RECOMMENDED)

**Option A: Create Completely New Deployment** (Most Reliable)

1. Click **Deploy → New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Choose **Web app**
4. Configure the deployment:
   ```
   Description: DoggyPaddle API v2 (November 2025 Fix)
   Execute as: Me ([your email])
   Who has access: Anyone
   ```
5. **CRITICAL:** Make sure "Who has access" is set to **"Anyone"** (not "Anyone with a Google account")
6. Click **Deploy**
7. Click **Authorize access** and grant permissions
8. **Copy the new Web App URL**
9. Update `/scripts/config.js` with the new URL

**Option B: Update Existing Deployment** (Faster but may have caching issues)

1. Click **Deploy → Manage deployments**
2. Find your active deployment
3. Click the **Edit** icon (pencil ✏️)
4. Verify "Who has access" is set to **"Anyone"**
5. Click **Deploy**
6. When prompted, click **Update** (not "Create new version")

### Step 5: Test the Endpoint

Open this URL in your browser (replace with your actual deployment ID):
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getAllSlots
```

**Expected Response:**
```json
{
  "status": "success",
  "slots": [...]
}
```

**If you see HTML instead of JSON:** The deployment settings are wrong. Go back to Step 4 and ensure "Who has access" is "Anyone".

### Step 6: Update Your Website Config

Edit `/scripts/config.js` and update the `API_ENDPOINT`:

```javascript
API_ENDPOINT: 'https://script.google.com/macros/s/YOUR_NEW_DEPLOYMENT_ID/exec',
```

### Step 7: Clear Browser Cache

1. Open your website: https://dogpaddle.club
2. Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac) to hard refresh
3. Open DevTools (F12) → Console
4. Check for errors

---

## 🔍 Troubleshooting

### Issue 1: Still Getting CORS Errors

**Symptoms:**
```
No 'Access-Control-Allow-Origin' header is present
```

**Solutions:**

1. **Verify Deployment Settings:**
   - Go to **Deploy → Manage deployments**
   - Click the active deployment
   - Confirm "Who has access" = **"Anyone"** (not "Anyone with a Google account")

2. **Create a Brand New Deployment:**
   - Sometimes Google Apps Script caches old deployments
   - Follow "Option A" in Step 4 above
   - Use the new URL

3. **Check Script Permissions:**
   - Make sure you clicked "Authorize access" during deployment
   - The script needs permission to run as you

### Issue 2: Getting HTML Response Instead of JSON

**Symptoms:**
- Browser shows HTML login page
- Response starts with `<!DOCTYPE html>`

**Solution:**
The deployment is set to "Only myself" or "Anyone with a Google account". Change it to **"Anyone"**.

### Issue 3: Error 404 or "Script not found"

**Symptoms:**
```
404: The requested URL was not found
```

**Solution:**
1. The Web App URL is incorrect
2. Create a new deployment and copy the correct URL
3. Make sure you're using the `/exec` endpoint, not `/dev`

### Issue 4: TypeError: output.setHeader is not a function

**Symptoms:**
This exact error in the response

**Solution:**
This error occurred in an older version of the code that tried to use `.setHeader()` incorrectly. The current version properly uses `.setHeader()` on the ContentService.TextOutput object. Update to the latest code from Step 2.

**Note:** ContentService.TextOutput DOES support `.setHeader()` - it's the correct way to add CORS headers!

---

## 🎯 Quick Checklist

Before reaching out for help, verify:

- [ ] Apps Script code is updated with proper CORS headers (includes `.setHeader()` calls)
- [ ] `doOptions()` function is added to handle CORS preflight requests
- [ ] Script is saved in Apps Script Editor
- [ ] New deployment created (or existing one updated)
- [ ] Deployment settings: "Who has access" = **"Anyone"**
- [ ] Authorized the script during deployment
- [ ] Copied the correct Web App URL
- [ ] Updated `/scripts/config.js` with new URL
- [ ] Hard refreshed browser cache
- [ ] Tested endpoint directly in browser
- [ ] Checked Network tab in DevTools for proper CORS headers in response

---

## 🔧 Alternative: Using HtmlService for CORS (If Standard Method Fails)

If you continue to have CORS issues after following all steps above, you can use this alternative approach:

**Replace the `createResponse()` function with:**

```javascript
// Alternative CORS workaround using HtmlService
function createResponse(data) {
  const jsonString = JSON.stringify(data);

  // Create HTML output that returns JSON with CORS headers in meta tags
  const htmlOutput = HtmlService.createHtmlOutput(jsonString)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  // Set MIME type to JSON
  return htmlOutput.setTitle('API Response');
}
```

**Note:** This method returns HTML wrapping JSON. Your frontend will need to parse it differently:

```javascript
// In your frontend fetch calls, parse the response differently:
const response = await fetch(endpoint);
const text = await response.text();
const jsonMatch = text.match(/<body[^>]*>(.*?)<\/body>/s);
const data = JSON.parse(jsonMatch ? jsonMatch[1] : text);
```

**However, this should only be used as a last resort.** The standard method (just `ContentService.createTextOutput()` with "Anyone" access) should work.

---

## 📞 Still Having Issues?

If you've followed all steps and still have CORS errors:

1. **Check the Response Headers:**
   - Open DevTools → Network tab
   - Click on the failed request
   - Check "Response Headers"
   - Share the headers for debugging

2. **Verify Deployment Type:**
   - Make sure it's a **Web app** deployment, not an **Add-on** or **API Executable**

3. **Test with cURL:**
   ```bash
   curl -L "https://script.google.com/macros/s/YOUR_ID/exec?action=getAllSlots"
   ```
   This should return JSON, not HTML

4. **Check Google Apps Script Quotas:**
   - Go to Apps Script dashboard
   - Check if you've hit any quota limits

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ Browser endpoint test returns JSON (not HTML)
2. ✅ No CORS errors in browser console
3. ✅ Response headers in DevTools include:
   - `Access-Control-Allow-Origin: https://dogpaddle.club`
   - `Access-Control-Allow-Methods: GET, POST, OPTIONS`
4. ✅ Store page loads products successfully
5. ✅ Booking system can fetch available slots
6. ✅ Admin dashboard works correctly

---

## 📝 Current Deployment Info

- **Sheet ID:** `1q7yUDjuVSwXfL9PJUTny0oy5Nr5jlVKsdyik2-vTL8I`
- **Current API Endpoint:** `https://script.google.com/macros/s/AKfycbxAocAQFFOWNr1CtW_njxjZsl69lcaitNpv_ZBfYKnlekOK0ir49sfUxV9-J9MRxUdTmA/exec`
- **Fix Applied:** Added explicit CORS headers using `.setHeader()` and `doOptions()` function
- **Status:** Code updated, needs redeployment

---

## 🔑 Key Changes Made

The following changes were made to fix CORS:

1. **Updated `createResponse()` function** to explicitly set CORS headers:
   - `Access-Control-Allow-Origin: https://dogpaddle.club`
   - `Access-Control-Allow-Methods: GET, POST, OPTIONS`
   - `Access-Control-Allow-Headers: Content-Type`

2. **Added `doOptions()` function** to handle CORS preflight (OPTIONS) requests

3. **Both files updated:**
   - `/backend/google-apps-script.gs` (comprehensive version)
   - `/backend/google-apps-script-custom.gs` (custom sheet version)

---

**Next Step:** Follow the deployment steps above, starting with Step 1. You MUST redeploy the Web App with the updated code. The most reliable method is to create a completely new deployment (Option A in Step 4).
