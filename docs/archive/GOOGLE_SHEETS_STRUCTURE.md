# Google Sheets Structure for DoggyPaddle (Custom Script)

## Overview

Your DoggyPaddle webapp uses a **custom Google Apps Script** that expects **3 specific tabs** with exact column names.

**Your Google Sheet ID:** `1q7yUDjuVSwXfL9PJUTny0oy5Nr5jlVKsdyik2-vTL8I`

---

## Required Tabs and Columns

### 1. available_slots Tab

This tab stores all available booking time slots.

| Column A | Column B | Column C |
|----------|----------|----------|
| **Date** | **Time** | **Status** |

**Column Details:**
- **Date** (Column A): Format `yyyy-MM-dd` (e.g., `2025-11-22`)
- **Time** (Column B): Format `HH:mm` (e.g., `09:00`, `14:30`)
- **Status** (Column C): `available`, `booked`, or `blocked`

**Example rows:**
```
Date          | Time  | Status
2025-11-22    | 09:00 | available
2025-11-22    | 10:00 | available
2025-11-22    | 11:00 | booked
2025-11-23    | 14:00 | available
```

**Header formatting:** Bold, background color #028090 (teal), white text

---

### 2. bookings Tab

This tab stores all customer bookings.

| Column A | Column B | Column C | Column D | Column E | Column F | Column G | Column H | Column I | Column J | Column K | Column L |
|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|
| **Timestamp** | **First Name** | **Last Name** | **Phone** | **Email** | **Dog 1 Name** | **Dog 2 Name** | **Breed 1** | **Breed 2** | **# of Dogs** | **Slot** | **Signature** |

**Column Details:**
- **Timestamp** (A): ISO format (e.g., `2025-11-22T10:00:00.000Z`)
- **First Name** (B): Customer's first name
- **Last Name** (C): Customer's last name
- **Phone** (D): Customer's phone number
- **Email** (E): Customer's email address
- **Dog 1 Name** (F): First dog's name
- **Dog 2 Name** (G): Second dog's name (empty if only 1 dog)
- **Breed 1** (H): First dog's breed
- **Breed 2** (I): Second dog's breed (empty if only 1 dog)
- **# of Dogs** (J): Number `1` or `2`
- **Slot** (K): Session date/time (e.g., `2025-11-22T10:00`)
- **Signature** (L): `Signed` or `Pending`

**Example row:**
```
2025-11-22T09:30:00.000Z | John | Doe | 555-1234 | john@example.com | Buddy | Max | Golden Retriever | Labrador | 2 | 2025-11-22T10:00 | Signed
```

**Header formatting:** Bold, background color #028090 (teal), white text

---

### 3. Products Tab

This tab stores all store products.

| Column A | Column B | Column C | Column D | Column E | Column F | Column G | Column H | Column I | Column J |
|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|
| **ID** | **Name** | **Description** | **Price** | **Category** | **Image URL** | **In Stock** | **Quantity** | **Low Stock Threshold** | **Created At** |

**Column Details:**
- **ID** (A): Unique product ID (e.g., `prod-1`, `prod-2`)
- **Name** (B): Product name
- **Description** (C): Product description
- **Price** (D): Price as number (e.g., `12.99`)
- **Category** (E): `Treats`, `Accessories`, `Toys`, etc.
- **Image URL** (F): URL or path to product image
- **In Stock** (G): `true` or `false`
- **Quantity** (H): Current stock quantity (number)
- **Low Stock Threshold** (I): Alert threshold (number, typically `5` or `10`)
- **Created At** (J): ISO timestamp

**Example row:**
```
prod-1 | Dog Treats - Peanut Butter | Delicious all-natural treats | 12.99 | Treats | /assets/products/treats1.jpg | true | 50 | 10 | 2025-11-22T10:00:00.000Z
```

**Header formatting:** Bold, background color #028090 (teal), white text

---

## How to Verify Your Sheet

### Step 1: Run the Test Function

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. Find the function dropdown (top toolbar)
4. Select **`testSetup`** (not `initializeSheets`)
5. Click **Run** (play button)
6. Check the **Execution log** (View → Logs or Ctrl+Enter)

**Expected output:**
```
✓ Spreadsheet access successful
Spreadsheet name: [Your Sheet Name]
✓ Slots sheet accessible: available_slots
✓ Bookings sheet accessible: bookings
✓ Products sheet accessible: Products

Current data counts:
- Slots: X rows
- Bookings: X rows
- Products: X rows

✓ ALL TESTS PASSED! Setup is correct.
```

### Step 2: Manually Verify Tabs

Open your Google Sheet and confirm:

✅ **Tab 1: `available_slots`** (exact name, case-sensitive)
- Column A header = `Date`
- Column B header = `Time`
- Column C header = `Status`

✅ **Tab 2: `bookings`** (exact name, lowercase)
- Column A header = `Timestamp`
- Column B header = `First Name`
- Column C header = `Last Name`
- ...continues through Column L = `Signature`

✅ **Tab 3: `Products`** (exact name, capital P)
- Column A header = `ID`
- Column B header = `Name`
- ...continues through Column J = `Created At`

---

## Add Sample Data (Optional)

To test with sample slots:

1. In Google Apps Script editor
2. Select **`addSampleSlots`** from function dropdown
3. Click **Run**
4. This will add 42 sample slots (7 days × 6 time slots per day)

---

## Fix the "Access Denied" Error

Your Google Apps Script is currently blocking access. Here's how to fix it:

### Step 1: Deploy as Web App

1. In Google Apps Script editor, click **Deploy → New deployment**
2. Click the **gear icon** next to "Select type"
3. Choose **"Web app"**
4. Configure:
   - **Description**: `DoggyPaddle API v1`
   - **Execute as**: `Me` (your email)
   - **Who has access**: **`Anyone`** ⚠️ **MUST be "Anyone"!**
5. Click **Deploy**
6. Authorize if prompted
7. **Copy the Web App URL** (looks like `https://script.google.com/macros/s/AKfyc...../exec`)

### Step 2: Update Your Website Config

1. Open your repo file: `scripts/config.js`
2. Find the line with `API_ENDPOINT:`
3. Replace it with your new Web App URL:
   ```javascript
   API_ENDPOINT: 'https://script.google.com/macros/s/YOUR_NEW_DEPLOYMENT_ID/exec'
   ```
4. Save and deploy your website

### Step 3: Test the API

Run this command to verify it works:

```bash
curl "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getProducts"
```

**Success response:**
```json
{
  "status": "success",
  "products": [...]
}
```

**Failure response:**
```
Access denied
```

If you see "Access denied", the deployment is NOT set to "Anyone" access.

---

## Troubleshooting

### ❌ "testSetup is not defined"
- Make sure you're running the script from `google-apps-script-custom.gs`
- The custom script has `testSetup()` instead of `initializeSheets()`

### ❌ "Cannot find sheet: available_slots"
- Your sheet tabs must be named **exactly**: `available_slots`, `bookings`, `Products`
- Names are case-sensitive!

### ❌ Still getting "Access denied"
1. Go to **Deploy → Manage deployments**
2. Check "Who has access" = `Anyone`
3. If not, create a **NEW deployment** (don't edit the old one)
4. Use the new URL in your config.js

### ❌ Website shows "Loading products..." forever
- The API endpoint is not responding or has wrong permissions
- Check browser console (F12) for error messages
- Verify the URL in `scripts/config.js` matches your deployment URL exactly

---

## Current Issues to Fix

Based on testing your API endpoint, I found:

🔴 **Your API returns "Access denied"**
- This means the deployment does NOT have "Anyone" access enabled
- You must create a new deployment with "Anyone" access

Once fixed, your webapp will be able to:
- ✅ Load available booking slots
- ✅ Save customer bookings
- ✅ Display products from Google Sheets
- ✅ Update slot status when booked

---

## Summary Checklist

Before your webapp can work:

- [ ] Google Sheet has 3 tabs: `available_slots`, `bookings`, `Products`
- [ ] Each tab has correct column headers (see above)
- [ ] Run `testSetup()` function successfully
- [ ] Deploy script as Web App with **"Anyone"** access
- [ ] Update `scripts/config.js` with new deployment URL
- [ ] Test API with curl command (should return JSON, not "Access denied")
- [ ] Website loads products and time slots without errors

**Once all checked, your webapp will work perfectly!**
