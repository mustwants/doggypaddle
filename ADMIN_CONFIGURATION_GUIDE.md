# DoggyPaddle Admin Dashboard - Configuration Guide

This guide explains how to configure the admin dashboard API endpoints, OAuth, and image hosting services.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Step 1: Google Apps Script Backend](#step-1-google-apps-script-backend)
- [Step 2: Google OAuth Setup](#step-2-google-oauth-setup)
- [Step 3: Image Hosting Setup](#step-3-image-hosting-setup)
- [Step 4: Update Configuration File](#step-4-update-configuration-file)
- [Testing & Verification](#testing--verification)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

✅ Google account with access to Google Cloud Console
✅ Repository cloned and files accessible
✅ Web server running (local or production)

---

## Step 1: Google Apps Script Backend

### 1.1 Create and Configure Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name it: **"DoggyPaddle Management"**
3. Copy the Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/COPY_THIS_LONG_STRING/edit
   ```
4. Go to **Extensions > Apps Script**
5. Delete existing code and paste contents from `/backend/google-apps-script.gs`
6. Update line 36:
   ```javascript
   const SHEET_ID = 'YOUR_ACTUAL_SHEET_ID';
   ```

### 1.2 Initialize Database

1. Select **`initializeSheets`** function from dropdown
2. Click **Run** button (▶️)
3. Authorize when prompted (follow Google's permission flow)
4. Verify sheets created: TimeSlots, Bookings, Waivers, Products, Orders, Photos

### 1.3 Deploy as Web App

1. Click **Deploy > New deployment**
2. Select **Web app** type
3. Configure:
   - Execute as: **Me**
   - Who has access: **Anyone** ⚠️ **CRITICAL for CORS**
4. Click **Deploy** and copy the Web App URL
5. Save this URL - format:
   ```
   https://script.google.com/macros/s/AKfycby...../exec
   ```

**Important:** After ANY code changes, create a NEW deployment (not update existing).

---

## Step 2: Google OAuth Setup

### 2.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: **"DoggyPaddle"**
3. Enable **Google Identity Services** API

### 2.2 Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** user type
3. Fill in:
   - App name: `DoggyPaddle Admin`
   - User support email: Your email
   - Developer contact: Your email
4. Click **Save and Continue**

### 2.3 Create OAuth Client ID

1. Go to **APIs & Services > Credentials**
2. Click **+ CREATE CREDENTIALS > OAuth client ID**
3. Choose **Web application**
4. Configure:
   - Name: `DoggyPaddle Web Client`
   - Authorized JavaScript origins:
     ```
     http://localhost:8080
     https://yourdomain.com
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:8080/store
     https://yourdomain.com/store
     ```
5. Click **Create** and copy the **Client ID**
6. Format:
   ```
   123456789-abc123.apps.googleusercontent.com
   ```

---

## Step 3: Image Hosting Setup

Choose ONE of the following options:

### Option A: Imgur (Recommended - Simple & Free)

1. Visit [Imgur API](https://api.imgur.com/oauth2/addclient)
2. Register application:
   - Name: `DoggyPaddle`
   - Authorization type: **Anonymous usage**
   - Email: Your email
3. Copy the **Client ID** (NOT Client Secret)

### Option B: Cloudinary (Advanced Features)

1. Sign up at [Cloudinary](https://cloudinary.com)
2. From Dashboard, copy:
   - Cloud Name
   - API Key
   - API Secret

---

## Step 4: Update Configuration File

Open `/scripts/config.js` and update ALL placeholder values:

### 4.1 API Endpoint
```javascript
const API_ENDPOINT = 'https://script.google.com/macros/s/YOUR_WEB_APP_ID/exec';
```
Replace with your Web App URL from Step 1.3

### 4.2 Google OAuth
```javascript
const GOOGLE_CLIENT_ID = '123456789-abc123.apps.googleusercontent.com';
```
Replace with your Client ID from Step 2.3

### 4.3 Admin Emails
```javascript
const ALLOWED_ADMINS = [
  'admin@yourdomain.com',
  'owner@yourdomain.com'
];
```
Replace with actual admin email addresses

### 4.4 Image Hosting

**If using Imgur:**
```javascript
const IMGUR_CLIENT_ID = 'your_imgur_client_id';
```

**If using Cloudinary:**
```javascript
const CLOUDINARY_CONFIG = {
  cloudName: 'your_cloud_name',
  apiKey: 'your_api_key',
  apiSecret: 'your_api_secret'
};
```

### 4.5 Verification Checklist

Before proceeding, verify:
- [ ] No placeholder text remains (no `YOUR_`, `DEPLOYED_`, etc.)
- [ ] All URLs are complete and valid
- [ ] Email addresses are correct
- [ ] Image hosting credentials are configured

---

## Testing & Verification

### Test 1: Backend Connection

1. Open browser DevTools (F12) > Console
2. Navigate to `/store/index.html`
3. Look for errors
4. **Expected:** No CORS errors

### Test 2: Admin Login

1. Click **Admin Login**
2. Sign in with allowed admin email
3. **Expected:** Dashboard opens with all tabs visible

### Test 3: Product Backend Sync

1. Go to **Products & Treats** tab
2. Click **Add Product**
3. Fill in: name, description, price, category, quantity, image URL
4. Save
5. **Expected:** Product appears in list
6. **Verify:** Check Google Sheets > Products tab for new row

### Test 4: Time Slot Management

1. Go to **Time Slots** tab
2. Click **Add Time Slot**
3. Set: date (today), time, duration (30 min)
4. Save
5. **Expected:** Slot appears in list
6. **Verify:** Check Google Sheets > TimeSlots tab

### Test 5: Conflict Detection

1. Try adding a slot at the same time as existing slot
2. **Expected:** Error message about conflict
3. Try adding overlapping slot (e.g., 10:00-10:30 when 10:15-10:45 exists)
4. **Expected:** Error message about time overlap

### Test 6: Photo Approval

1. Go to `/photos/index.html`
2. Upload a test image with details
3. **Expected:** Success message
4. Go to admin dashboard > **Photos** tab
5. **Expected:** Photo shows as "pending"
6. Select photo and click **✓ Approve Selected**
7. **Expected:** Status changes to "approved"

### Test 7: Bulk Operations

1. Upload 3+ photos
2. In admin dashboard > Photos tab
3. Click **Select All** checkbox
4. Click **✓ Approve Selected**
5. **Expected:** All photos approved at once

### Test 8: Inventory Tracking

1. Create product with quantity = 3, low stock = 5
2. **Expected:** Shows "⚠️ Low Stock" badge
3. Edit product, set quantity = 0
4. **Expected:** Shows "0 Stock" badge

---

## Troubleshooting

### CORS Errors

```
Access-Control-Allow-Origin error
```

**Fixes:**
1. Web App deployment must have "Anyone" access
2. Create NEW deployment after code changes
3. Clear browser cache (Ctrl+Shift+R)
4. Verify API_ENDPOINT URL is correct

### OAuth Errors

```
Invalid client ID / redirect_uri_mismatch
```

**Fixes:**
1. Verify GOOGLE_CLIENT_ID matches exactly
2. Add current domain to Authorized JavaScript origins
3. Add `/store` path to Authorized redirect URIs
4. Wait 5 minutes for Google changes to propagate

### Backend Save Errors

```
Could not save to backend
```

**Fixes:**
1. Check Apps Script > Executions for error logs
2. Verify SHEET_ID is correct
3. Re-run initializeSheets() function
4. Check sheet tab names (case-sensitive)

### Image Upload Failures

```
Image upload failed / 403 Forbidden
```

**Fixes:**
1. Verify image hosting credentials
2. For Imgur: Use Client ID not Client Secret
3. For Cloudinary: All three fields required
4. Check browser Console for specific error

### Products Not Syncing

If products save locally but not to Google Sheets:

1. Open browser Console
2. Look for fetch errors
3. Verify API_ENDPOINT is deployed Web App URL
4. Check Apps Script > Executions for errors
5. Ensure Products sheet exists in Google Sheets

---

## Feature Overview

### ✅ Time Slot Management
- Add individual slots or bulk generate
- Conflict detection prevents double-booking
- Duration presets: 20, 30, 45, 60, 90 minutes
- Color-coded status (Available/Booked/Blocked)

### ✅ Product Management with Inventory
- Add/edit/delete products
- Quantity tracking with low stock alerts
- Stock levels sync to Google Sheets
- Active/Inactive status toggle

### ✅ Photo Approval System
- Bulk approve/reject photos
- Select all functionality
- Status tracking (Pending/Approved/Rejected)
- Customer info display

### ✅ Booking Management
- View all client bookings
- Export to CSV
- Status management
- Time slot integration

---

## Security Notes

### Production Checklist

- [ ] Use HTTPS only
- [ ] Limit ALLOWED_ADMINS to necessary emails
- [ ] Regularly backup Google Sheets data
- [ ] Monitor Apps Script execution logs
- [ ] Never commit API keys to public repos
- [ ] Use environment variables for production

### Access Levels

- **Public:** View store, book sessions, upload photos
- **Admin:** Manage time slots, products, bookings, photos
- **Backend:** Full data access via Google Sheets

---

## Additional Configuration

### Customizing Admin Access

Edit `ALLOWED_ADMINS` in `/scripts/config.js`:
```javascript
const ALLOWED_ADMINS = [
  'primary.admin@domain.com',
  'secondary.admin@domain.com'
];
```

### Updating Backend Schema

If you modify backend columns:
1. Update Apps Script functions (getProducts, saveProduct, etc.)
2. Create NEW deployment
3. Test thoroughly before production

### Changing Stock Thresholds

Default low stock threshold is 5 units.
To change globally, update the form default in `/store/index.html` line 873.

---

## Summary

After completing this guide:

1. ✅ Backend API is deployed and accessible
2. ✅ Admin login works with Google OAuth
3. ✅ Products sync to Google Sheets with inventory tracking
4. ✅ Time slots have conflict detection
5. ✅ Photos can be bulk approved
6. ✅ All data persists to Google Sheets

Your admin dashboard is now fully configured and operational! 🎉

For general setup including frontend deployment, see `SETUP.md`.

For backend API details, see `/backend/README.md`.
