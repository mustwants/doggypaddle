# Google Sheets Configuration & Data Sync Issues

## Current Status

### ✅ What's Working
- **Collapsible/Expandable Steps**: Fully implemented with smooth animations
  - Located in `index.html` (lines 996-1160)
  - JavaScript handler in `scripts/booking.js` (lines 236-258)
  - Enhanced CSS animations in `assets/styles.css` (lines 644-750)

- **Google Apps Script Endpoint**: Configured in `scripts/config.js`
  - API Endpoint: `https://script.google.com/macros/s/AKfycbz8spCI4G3t_gicwPhS_uc2AJ1-059ODLCKNOl1j2r9a_cz16QGmAVaiR-AJlqxWiY5ug/exec`

### ❌ What's Not Working
- **Products not loading from Google Sheets**
- **Time slots not syncing between admin dashboard and calendar**
- **Data persistence issues**

## Root Cause

The Google Apps Script backend is **returning "Access denied"** when called. This means:

1. The Web App deployment may not have "Anyone" access enabled
2. The script may not be deployed as a web app
3. The deployment URL may be outdated or incorrect

## How to Fix

### Step 1: Verify Google Apps Script Deployment

1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1q7yUDjuVSwXfL9PJUTny0oy5Nr5jlVKsdyik2-vTL8I/edit

2. Go to **Extensions** → **Apps Script**

3. Click **Deploy** → **Manage deployments**

4. Check your current deployment:
   - ✅ **Type**: Web app
   - ✅ **Execute as**: Me
   - ✅ **Who has access**: **Anyone** (This is critical!)

5. If "Who has access" is not set to "Anyone":
   - Click the deployment
   - Click "Edit" (pencil icon)
   - Change "Who has access" to **Anyone**
   - Click "Deploy"
   - **Copy the new Web App URL**

### Step 2: Update the API Endpoint

If you had to create a new deployment, update `scripts/config.js` line 24:

```javascript
API_ENDPOINT: 'https://script.google.com/macros/s/YOUR_NEW_DEPLOYMENT_ID/exec',
```

### Step 3: Test the Connection

Run this curl command to test:

```bash
curl "https://script.google.com/macros/s/AKfycbz8spCI4G3t_gicwPhS_uc2AJ1-059ODLCKNOl1j2r9a_cz16QGmAVaiR-AJlqxWiY5ug/exec?action=getProducts"
```

Expected response:
```json
{
  "status": "success",
  "products": [...]
}
```

If you see `"Access denied"`, the deployment permissions are incorrect.

### Step 4: Verify Sheet Structure

Your Google Sheet should have these tabs:
- **Products** - For store items
- **TimeSlots** - For booking sessions
- **Bookings** - For customer bookings
- **Photos** - For submitted photos
- **Orders** - For product orders

## Current Data Sources

### Products Page
- Location: `/store/index.html`
- Script: `scripts/store.js` (lines 39-83)
- **Issue**: Shows "Loading products..." because API call fails
- **Fallback**: None (removed mock data as per requirement)

### Calendar/Time Slots
- Location: `index.html` (calendar section)
- Script: `scripts/calendar.js` (lines 47-111)
- **Issue**: No slots appear because API call fails
- **Hardcoded Data**: The user mentions seeing Nov 17-21 sessions, but these were not found in the codebase
- **Possible Source**: May be cached in browser localStorage

### Featured Photos
- Location: `index.html` (lines 775-815)
- **Current Source**: Hardcoded fallback images of "Remi"
- **Expected Source**: Should pull from Google Sheets Photos tab where `featured = true`

## Debugging Steps

### Check Browser Console

1. Open your website in Chrome/Firefox
2. Press F12 to open Developer Tools
3. Go to the **Console** tab
4. Look for errors like:
   ```
   ⚠️ BACKEND NOT CONFIGURED - NO DATA AVAILABLE
   ```
   or
   ```
   Failed to fetch products. HTTP status: 403
   ```

### Check Network Tab

1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Refresh the page
4. Look for requests to `script.google.com`
5. Click on them to see:
   - **Status**: Should be `200 OK` (if `403 Forbidden`, permissions issue)
   - **Response**: Should be JSON data (if "Access denied", deployment issue)

### Clear Browser Cache

Sometimes old data gets cached:

```javascript
// Open browser console and run:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

## Expected Behavior After Fix

### Products Page
- Products will load from Google Sheets "Products" tab
- Admin can add/edit products via admin dashboard
- Changes sync in real-time

### Calendar
- Time slots will load from Google Sheets "TimeSlots" tab
- Admin can add/remove slots via admin dashboard
- Customers can book available slots
- Booked slots disappear from calendar

### Featured Photos
- Photos marked as `featured = true` in Google Sheets appear in carousel
- Fallback Remi images only show if no featured photos exist

## Quick Verification Checklist

- [ ] Google Apps Script is deployed as Web App
- [ ] Deployment has "Anyone" access permission
- [ ] API_ENDPOINT in config.js matches deployment URL
- [ ] Google Sheet has all required tabs (Products, TimeSlots, Bookings, Photos, Orders)
- [ ] Browser console shows no CORS or 403 errors
- [ ] Network tab shows 200 OK responses from script.google.com
- [ ] Products page shows actual products (not "Loading products...")
- [ ] Calendar shows time slots for current/future months
- [ ] Admin dashboard can load and display data

## Additional Resources

- [Google Apps Script Deployment Guide](./GOOGLE_APPS_SCRIPT_DEPLOYMENT_GUIDE.md)
- [Admin Setup Guide](./ADMIN_SETUP_GUIDE.md)
- [Backend README](./backend/README.md)

## Contact

If issues persist after following these steps, check:
1. Google Apps Script execution logs (in Apps Script editor → Executions)
2. Google Sheet sharing permissions
3. CORS settings in the web app deployment

---

**Last Updated**: 2025-01-18
**Status**: Awaiting backend access configuration
