# DoggyPaddle Quick Start Guide

## Important: Backend Setup Required

Your DoggyPaddle website is currently running with **mock/demo data**. To enable live booking, product management, and photo uploads, you need to set up the Google Apps Script backend.

### Current Status

If you see these errors in your browser console:
- ❌ `Failed to fetch`
- ❌ `Access to fetch at 'https://script.google.com/macros/s/YOUR_DEPLOYED_WEBAPP_ID/exec' has been blocked by CORS policy`
- ⚠️ `Backend Not Configured`

**This is expected!** The backend hasn't been set up yet.

### Quick Setup (15 minutes)

Follow these steps to enable all features:

#### 1. Set Up Google Apps Script Backend

📖 **Detailed instructions**: See `/backend/README.md`

**Quick steps:**
1. Create a Google Sheet named "DoggyPaddle Management"
2. Copy the Sheet ID from the URL
3. Open Extensions > Apps Script
4. Copy code from `/backend/google-apps-script.gs`
5. Update the `SHEET_ID` variable with your Sheet ID
6. Run the `initializeSheets` function
7. Deploy as Web App (access: "Anyone")
8. Copy the Web App URL

#### 2. Update Your Configuration

1. Open `/scripts/config.js`
2. Find the line with `YOUR_DEPLOYED_WEBAPP_ID`
3. Replace it with your actual Web App URL
4. Save the file

```javascript
// Before:
API_ENDPOINT: 'https://script.google.com/macros/s/YOUR_DEPLOYED_WEBAPP_ID/exec',

// After:
API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbw...YOUR_ACTUAL_ID.../exec',
```

#### 3. Deploy Your Changes

If you're hosting on Netlify, Vercel, or similar:
1. Commit your changes: `git add . && git commit -m "Configure backend API endpoint"`
2. Push to your repository: `git push`
3. Your hosting service will automatically redeploy

### What Works Without Backend Setup?

The website will still function with demo data:
- ✅ **Home page** - fully functional
- ✅ **About page** - fully functional
- ✅ **Waiver** - fully functional
- ⚠️ **Booking** - shows mock time slots, but submissions won't be saved
- ⚠️ **Store** - shows sample products, but orders won't be processed
- ⚠️ **Photos** - can't upload, will show error message
- ⚠️ **Admin** - can't connect to backend data

### Need Help?

1. **Detailed Backend Setup**: See `/backend/README.md`
2. **CORS Errors**: Make sure Web App access is set to "Anyone"
3. **Still Having Issues**: Check the browser console (F12) for specific error messages

### Security Notes

Once deployed:
- The backend uses CORS headers to allow requests from any origin (`Access-Control-Allow-Origin: *`)
- For production, you should restrict this to your specific domain
- See `/backend/README.md` section "Security Note" for details

---

**Ready to get started?** → See `/backend/README.md` for step-by-step instructions!
