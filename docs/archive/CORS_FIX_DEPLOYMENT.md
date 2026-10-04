# 🚨 CRITICAL: CORS Fix Deployment Guide

## Problem Summary

Your site at **https://dogpaddle.club** is experiencing complete API failure due to **missing CORS headers** in the Google Apps Script backend.

### What's Broken:
- ❌ Users **cannot schedule** appointments (calendar shows no slots)
- ❌ Users **cannot see or acknowledge waiver/rules**
- ❌ Users **cannot upload photos**
- ❌ Users **cannot select dates** to see available time slots
- ❌ **All API calls fail** with CORS error

### Error Message:
```
Access to fetch at 'https://script.google.com/macros/s/AKfycbz...' from origin
'https://dogpaddle.club' has been blocked by CORS policy: Response to preflight
request doesn't pass access control check: No 'Access-Control-Allow-Origin'
header is present on the requested resource.
```

### Root Cause:
The Google Apps Script backend was not returning proper CORS headers, causing all browsers to block API requests from dogpaddle.club.

---

## ✅ Solution

I've fixed the CORS configuration in both Google Apps Script files:
- `backend/google-apps-script-custom.gs` (currently deployed)
- `backend/google-apps-script.gs` (for future deployments)

**You must now redeploy the script to Google Apps Script to make this fix live.**

---

## 📋 Deployment Steps

### Step 1: Open Your Google Apps Script Project

1. Go to your Google Apps Script project:
   ```
   https://script.google.com/u/0/home/projects/1TegfXj8hWV6xql5-xEzkWZXAX5UY4PPZfAzTof8Q55_a8pzyyubwL2UW/edit
   ```

2. Or go to https://script.google.com and find the **DoggyPaddle** project

### Step 2: Update the Script Code

**Option A: Copy/Paste (Fastest)**

1. In the Apps Script editor, find the file `Code.gs` (or your main script file)

2. Open `backend/google-apps-script-custom.gs` from your repository

3. **Copy ALL the contents** of `google-apps-script-custom.gs`

4. **Paste it completely** into your Apps Script `Code.gs`, replacing all existing code

5. Click **Save** (💾 icon or Ctrl+S)

**Option B: Manual Update (If you want to keep other customizations)**

Find and replace these two functions:

**Function 1: doOptions** (around line 12-20)
```javascript
// OLD (BROKEN):
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

// NEW (FIXED):
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    .setHeader('Access-Control-Max-Age', '86400'); // 24 hours
}
```

**Function 2: createResponse** (around line 555-565)
```javascript
// OLD (BROKEN):
function createResponse(data) {
  const jsonOutput = JSON.stringify(data);

  return ContentService
    .createTextOutput(jsonOutput)
    .setMimeType(ContentService.MimeType.JSON);
}

// NEW (FIXED):
function createResponse(data) {
  const jsonOutput = JSON.stringify(data);

  return ContentService
    .createTextOutput(jsonOutput)
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
```

### Step 3: Deploy the Updated Script

1. Click **Deploy** button (top right) → **Manage deployments**

2. Click the **Edit** icon (✏️) next to your active deployment

3. Under **Version**, select **New version**

4. Add description: `CORS fix for dogpaddle.club domain`

5. Click **Deploy**

6. Copy the **Web app URL** (should be the same as before):
   ```
   https://script.google.com/macros/s/AKfycbz8spCI4G3t_gicwPhS_uc2AJ1-059ODLCKNOl1j2r9a_cz16QGmAVaiR-AJlqxWiY5ug/exec
   ```

7. Click **Done**

### Step 4: Verify Deployment Settings

Make sure your deployment has these settings:
- **Execute as:** Me (your email)
- **Who has access:** Anyone ✅ **CRITICAL**

If "Who has access" is not set to "Anyone", click Edit and change it.

### Step 5: Test the Fix

1. Wait **2-3 minutes** for Google to propagate the changes

2. Open https://dogpaddle.club in a **new incognito/private window**

3. Press **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac) to hard refresh

4. Open **Developer Console** (F12 → Console tab)

5. Check for errors:
   - ✅ **No CORS errors** = Success!
   - ❌ **Still seeing CORS errors** = Wait another minute and refresh again

6. **Test user features:**
   - ✅ Calendar shows available time slots
   - ✅ Can click on dates to see times
   - ✅ Can fill out booking form
   - ✅ Waiver link works
   - ✅ Photo upload form loads

---

## 🔍 What Changed

### Before (Broken):
```javascript
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
  // Missing CORS headers! ❌
}
```

### After (Fixed):
```javascript
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', '*')      // ✅ Allow all domains
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')  // ✅ Allow methods
    .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization') // ✅ Allow headers
    .setHeader('Access-Control-Max-Age', '86400');      // ✅ Cache for 24 hours
}
```

---

## 🎯 Expected Results After Deployment

Once deployed, these features will work again:

### For Clients:
- ✅ **Calendar displays** available time slots
- ✅ **Date selection** shows slots for that day
- ✅ **Booking form submission** saves to Google Sheets
- ✅ **Waiver page** loads and signature works
- ✅ **Photo uploads** submit successfully
- ✅ **Rules acknowledgment** works

### For Admin:
- ✅ **Admin panel** can fetch/manage slots
- ✅ **Product management** works
- ✅ **Photo approval** works
- ✅ **Time slot creation** saves correctly

---

## 🐛 Troubleshooting

### Issue: Still seeing CORS errors after deployment

**Solution:**
1. Verify you created a **new version** (not just saved the code)
2. Wait 2-3 minutes for Google to propagate
3. Clear browser cache: Ctrl+Shift+Delete → Clear cache
4. Try in incognito/private browsing mode
5. Check that deployment "Who has access" = **Anyone**

### Issue: "Script not found" error

**Solution:**
1. Check that Web App URL in `scripts/config.js` matches your deployment URL
2. Verify the Apps Script project ID is correct
3. Redeploy and copy the new URL

### Issue: Features still not working after CORS fix

**Possible causes:**
1. **Google Sheets permissions**: Make sure the script has access to the spreadsheet
2. **API endpoint**: Verify `scripts/config.js` has the correct `API_ENDPOINT` URL
3. **Sheet structure**: Check that sheet tabs exist: `available_slots`, `bookings`, `Products`

---

## 📚 Additional Notes

### Why CORS Headers Matter

Modern browsers implement **CORS (Cross-Origin Resource Sharing)** security:
- Your website runs at `https://dogpaddle.club` (origin 1)
- Your API runs at `https://script.google.com` (origin 2)
- Browser blocks requests **from origin 1 to origin 2** unless origin 2 explicitly allows it
- The `Access-Control-Allow-Origin: *` header tells the browser: "It's okay, allow this request"

### Security Note

Using `Access-Control-Allow-Origin: *` is **acceptable** for public APIs like yours because:
- Your API endpoints are meant to be publicly accessible
- The data is customer bookings (not sensitive admin data)
- Google OAuth protects admin-only endpoints separately

If you want to restrict to only dogpaddle.club in the future:
```javascript
.setHeader('Access-Control-Allow-Origin', 'https://dogpaddle.club')
```

But then you'll need to update it whenever your domain changes.

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] No CORS errors in browser console
- [ ] Calendar loads and shows time slots
- [ ] Can select a date and see available times
- [ ] Booking form can be filled out
- [ ] Waiver link opens and signature pad works
- [ ] Photo upload form displays
- [ ] Admin panel loads (if you have admin access)

---

## 🆘 Need Help?

If you're still experiencing issues after following these steps:

1. Check the browser console for specific error messages
2. Verify the Google Apps Script deployment URL
3. Confirm the spreadsheet ID in the script matches your sheet
4. Test with the Apps Script execution logs (View → Logs in Apps Script editor)

---

**Last Updated:** 2025-11-22
**Branch:** `claude/audit-links-01GUarzKqnLrmnX3kjfiXQ6T`
**Commits:**
- `fb4e788` - Fix: Add CORS headers to Google Apps Script backend
- `b5321c5` - Fix: Rename natlify/function to netlify/functions
