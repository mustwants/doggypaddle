# Google Apps Script Troubleshooting (CORS, Photos, Time Slots, Admin)

This checklist focuses on the issues reported in production (customers unable to view/reserve time slots, photo uploads failing, and admin tools not working). Follow each section in order—most CORS and deployment problems are solved by re‑deploying the Apps Script with the correct access level and ensuring the site points at that deployment.

## 1) Confirm the correct deployment is live

1. Open your Apps Script deployment dashboard: **Deploy > Manage deployments**.
2. Make sure the deployment you are using shows **Access: Anyone** and **Execute as: Me**. If it does not, create a **New deployment** and choose Web app → Execute as **Me** → Who has access **Anyone**.
3. Copy the **Web app URL** (must end with `/exec`). Example from the current environment:
   ```
   https://script.google.com/macros/s/AKfycbz8spCI4G3t_gicwPhS_uc2AJ1-059ODLCKNOl1j2r9a_cz16QGmAVaiR-AJlqxWiY5ug/exec
   ```
4. In your site repo, open `scripts/config.js` and set `API_ENDPOINT` to the exact URL above. Publish/redeploy your static site so that the browser is calling the correct backend.

> **Tip:** If you edited any Apps Script code, always create a **new** deployment instead of editing an existing one. Older deployments keep the old CORS headers.

## 2) Verify CORS headers are actually returned

1. In the Apps Script editor, open your main file (usually `Code.gs`) and confirm `doOptions` and `createResponse` look like this:
   ```javascript
   function doOptions(e) {
     return ContentService
       .createTextOutput('')
       .setMimeType(ContentService.MimeType.TEXT)
       .setHeader('Access-Control-Allow-Origin', '*')
       .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
       .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
       .setHeader('Access-Control-Max-Age', '86400');
   }

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
2. Save, then deploy as a **new version** and confirm the Web app URL is unchanged (or update `API_ENDPOINT` if it changes).
3. In a browser console, call `fetch('<YOUR_WEB_APP_URL>?action=getProducts')` and verify the response succeeds without CORS errors.

## 3) Sheet structure and status rules

1. Run `initializeSheets` once to create the required tabs: `TimeSlots`, `Bookings`, `Waivers`, `Products`, `Orders`, `Photos`, `Subscriptions`, `Registrations`.
2. Ensure `TimeSlots` rows use `status = available` for client booking visibility. Any other status hides them from the public calendar.
3. Photo gallery only surfaces rows in `Photos` with `status = approved`; admin must approve via the dashboard first.
4. If you use Mapbox layers, restrict queries to **approved** rows to avoid leaking unmoderated data.
5. User registrations should be inserted with `status = pending`; admin can approve/deny/pause/delete from the admin panel.

## 4) Quick end‑to‑end tests

These checks confirm all core paths work from the deployed site:

- **View slots:** `GET <WEB_APP_URL>?action=getAvailableSlots&month=<MM>&year=<YYYY>` returns JSON with available slots. If empty, confirm your Sheet has `status = available` entries and the date format matches `YYYY-MM-DD`.
- **Book slot:** Submit a booking from the site and confirm a new row appears in `Bookings` with the correct slot ID.
- **Admin manage slots/products:** From the admin panel, verify `getAllSlots` and `getProducts` return data. If they do not, re-check CORS headers and `API_ENDPOINT`.
- **Photo upload:** Use the Photos page to upload an image (<5 MB). A new row should appear in `Photos` with status `pending`. Approve it from admin and refresh the gallery to see it listed.
- **Token verification:** If admin login fails, confirm the Google OAuth client ID matches the value stored in the Apps Script property `GOOGLE_OAUTH_CLIENT_ID`.

## 5) Common symptoms and fixes

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Browser console shows `blocked by CORS policy` | Deployment not set to **Anyone**, or `doOptions`/`createResponse` missing headers | Create new deployment with headers and update `API_ENDPOINT` |
| Calendar empty & customers cannot pick times | `TimeSlots` rows not marked `available`, or stale deployment URL in `config.js` | Normalize statuses to `available` and redeploy site with correct endpoint |
| Admin cannot load slots/products | Same CORS issue as above, or outdated deployment URL | Re-deploy script as Web app and update `API_ENDPOINT` |
| Photo upload fails | CORS headers missing or image >5 MB | Verify headers, retry with smaller image, then approve in admin |
| Registrations stuck | Rows missing or status not `pending` | Ensure registration insert logic writes `pending`; admin then updates status |

## 6) If problems persist

- Open Apps Script **View > Executions** to inspect errors for each request.
- Clear browser cache or use an incognito window after every deployment change.
- Ensure your static site is truly calling the intended backend by checking the Network tab (look for requests to your Web app URL).
