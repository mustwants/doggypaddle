# DoggyPaddle Complete Setup Guide

## 🎯 Overview

This guide will help you set up the complete DoggyPaddle website with:
- ✅ Google Workspace backend for calendar and customer management
- ✅ Stripe integration for payments
- ✅ Pet treats and accessories store
- ✅ Customer photo upload page
- ✅ Admin panel for managing time slots

---

## 📋 Part 1: Google Sheets & Apps Script Setup

### Step 1: Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it: **"DoggyPaddle Management"**
4. Note the **Sheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[THIS_IS_YOUR_SHEET_ID]/edit
   ```
   Example: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

### Step 2: Deploy Google Apps Script

1. In your Google Sheet, click **Extensions** → **Apps Script**
2. Delete any default code in the editor
3. Copy the entire contents of `/backend/google-apps-script.gs`
4. Paste into the Apps Script editor
5. Find line 18 and replace `YOUR_GOOGLE_SHEET_ID_HERE` with your actual Sheet ID
6. Click **Save** (disk icon) and name it "DoggyPaddle Backend"
7. Click **Deploy** → **New deployment**
8. Settings:
   - Click **⚙️ gear icon** next to "Select type"
   - Choose **Web app**
   - **Description**: "DoggyPaddle API v1"
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone
9. Click **Deploy**
10. **IMPORTANT**: Copy the **Web App URL** - you'll need this!
    - It looks like: `https://script.google.com/macros/s/AKfycbz.../exec`

### Step 3: Initialize Sheets

1. In Apps Script editor, select function dropdown (top toolbar)
2. Choose: `initializeSheets`
3. Click **Run** (▶️ button)
4. **First time only**: Click "Review permissions"
   - Choose your Google account
   - Click "Advanced" → "Go to DoggyPaddle Backend (unsafe)"
   - Click "Allow"
5. Wait for "Execution completed" message
6. **Optional**: Run `addSampleSlots` to add test data
7. **Optional**: Run `addSampleProducts` to add sample products

### Step 4: Verify Sheets Created

Go back to your Google Sheet. You should now see these tabs:
- ✅ TimeSlots
- ✅ Bookings
- ✅ Waivers
- ✅ Products
- ✅ Orders
- ✅ Photos

---

## ⚙️ Part 2: Configure Website

### Update API Endpoint

1. Open `/scripts/config.js`
2. Line 13: Replace `YOUR_DEPLOYED_WEBAPP_ID` with your Web App URL from Step 2
   ```javascript
   API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbz.../exec',
   ```

### Configure Stripe (Already Set Up!)

Your Stripe is already configured with:
- ✅ Live publishable key
- ✅ Buy button ID
- ✅ Checkout links

**To customize Stripe products:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Create products for:
   - Single Session ($25)
   - 5-Session Package ($100)
   - Gift Cards
   - Store products
3. Update the payment links in `/scripts/config.js` lines 20-22

### Optional: Configure Image Upload

For photo uploads, you can use Imgur (free):

1. Go to https://api.imgur.com/oauth2/addclient
2. Register your application
3. Copy your **Client ID**
4. Update `/scripts/config.js` line 27:
   ```javascript
   clientId: 'YOUR_IMGUR_CLIENT_ID'
   ```

---

## 📁 Part 3: File Structure

Your complete website structure:

```
doggypaddle/
├── index.html              # Main landing page
├── assets/
│   ├── logo.png
│   ├── Remi1.jpg, Remi2.jpg, Remi3.jpg, Remi4.jpg
│   └── styles.css
├── scripts/
│   ├── config.js          # ⚙️ Configuration file
│   ├── booking.js         # Booking form logic
│   ├── calendar.js        # Calendar display
│   ├── admin.js           # Admin panel
│   ├── store.js           # Store functionality
│   ├── photos.js          # Photo upload
│   └── ics.js             # Calendar export
├── waiver/
│   └── waiver.html        # Liability waiver
├── admin/
│   └── index.html         # Admin panel
├── store/
│   └── index.html         # Pet treats store
├── photos/
│   └── index.html         # Photo upload page
├── calendar/
│   └── calendar.html
├── stripe/
│   └── checkout.js
└── backend/
    └── google-apps-script.gs  # Backend code
```

---

## 🚀 Part 4: Deployment

### Option A: Netlify (Recommended)

1. Go to [netlify.com](https://netlify.com)
2. Sign up/Login (free account)
3. Click **"Add new site"** → **"Import from Git"**
4. Connect your GitHub repository
5. Build settings:
   - **Build command**: (leave empty)
   - **Publish directory**: `.` (root)
6. Click **Deploy**
7. Your site is live!

### Option B: Manual Deployment

1. In Netlify, click **"Add new site"** → **"Deploy manually"**
2. Drag your entire project folder
3. Done! Your site is live

### Custom Domain (Optional)

1. In Netlify: **Domain settings** → **Add custom domain**
2. Follow DNS setup instructions
3. Enable HTTPS (automatic with Netlify)

---

## 👨‍💼 Part 5: Admin Panel Usage

### Access Admin Panel
Go to: `https://yourdomain.com/admin/index.html`

### Managing Time Slots:

**Add Single Slot:**
1. Select date
2. Select time
3. Click "Add Slot"

**Quick Add:**
- Click time buttons (9am, 12pm, etc.) to add for today

**Bulk Add Week:**
- Click "Add Default Week Schedule" for 7 days of slots

**Delete Slots:**
- Click "Delete" button next to any slot

### View Statistics
Dashboard shows:
- Available slots
- Booked slots
- This week's slots
- This month's slots

---

## 🛍️ Part 6: Managing the Store

### Adding Products

1. Open your Google Sheet
2. Go to **Products** tab
3. Add rows with:
   - Product ID (e.g., `prod-1`)
   - Name
   - Description
   - Price
   - Category (Treats, Accessories, Toys, Merchandise)
   - Image URL (or path like `/assets/products/item.jpg`)
   - In Stock (true/false)
   - Created At (timestamp)

### Adding Product Images

1. Create folder: `/assets/products/`
2. Add product images
3. Reference in Products sheet

---

## 📸 Part 7: Photo Management

### Customer Photo Workflow:

1. Customer visits `/photos`
2. Uploads photo with details
3. Photo saved with status "pending"
4. Admin reviews in Google Sheet (**Photos** tab)
5. Change status to "approved" to display on website

### Approving Photos:

**Manual (in Google Sheet):**
1. Go to Photos tab
2. Find photo row
3. Change "Status" column from "pending" to "approved"

**Future Enhancement:**
- Add admin interface to approve/reject photos

---

## 📊 Part 8: Google Sheets Structure

### TimeSlots Sheet
| ID | Date | Time | Duration | Status | Created At | Booking ID |
|----|------|------|----------|--------|------------|------------|
| slot-123 | 2024-11-15 | 10:00 | 20 | available | 2024-11-10... | |

### Bookings Sheet
| Booking ID | First Name | Last Name | Email | Phone | Dog Names | ... |
|------------|-----------|-----------|-------|-------|-----------|-----|
| booking-456 | John | Doe | john@... | 555-1234 | Max | ... |

### Products Sheet
| ID | Name | Description | Price | Category | Image URL | In Stock | Created At |
|----|------|-------------|-------|----------|-----------|----------|------------|
| prod-1 | Treats | Peanut butter | 12.99 | Treats | /assets/... | true | 2024... |

### Photos Sheet
| Photo ID | Customer Name | Email | Dog Name | Image URL | Caption | Status | Created At | Session Date |
|----------|--------------|-------|----------|-----------|---------|--------|------------|--------------|
| photo-789 | Sarah | sarah@... | Remi | https://... | Fun! | approved | 2024... | 2024-11-10 |

---

## 💰 Cost Breakdown

| Service | Cost | What You Get |
|---------|------|--------------|
| **Google Sheets** | FREE | Unlimited sheets, 5M cells |
| **Google Apps Script** | FREE | 90 min/day execution time |
| **Netlify Hosting** | FREE | 100GB bandwidth, SSL included |
| **Stripe** | FREE + 2.9% + 30¢ per transaction | Payment processing |
| **Domain (optional)** | ~$12/year | Your own .com domain |
| **Total** | **$0-12/year** + Stripe fees | Full business website! |

---

## 📱 Part 9: Testing Checklist

### Complete User Flow Test:

- [ ] Visit homepage
- [ ] Click "Store" - verify products load
- [ ] Add item to cart
- [ ] View cart sidebar
- [ ] Click "Share Photos"
- [ ] Upload a photo
- [ ] View photo gallery
- [ ] Click "Waiver"
- [ ] Scroll through waiver
- [ ] Initial all sections
- [ ] Sign waiver
- [ ] Submit waiver
- [ ] Click "Book Session"
- [ ] View calendar
- [ ] Click date with available slots
- [ ] Select time slot
- [ ] Fill booking form
- [ ] Submit booking
- [ ] Verify redirect to Stripe
- [ ] Check Google Sheets for data

### Admin Panel Test:

- [ ] Access `/admin`
- [ ] View current slots
- [ ] Add a new slot
- [ ] Delete a slot
- [ ] View statistics
- [ ] Check Google Sheets updated

---

## 🆘 Troubleshooting

### "Cannot read property 'getRange'"
**Fix**: Verify Sheet ID is correct in `google-apps-script.gs` line 18

### Slots not showing on calendar
**Fix**:
1. Check browser console for errors (F12)
2. Verify API_ENDPOINT in `/scripts/config.js`
3. Check TimeSlots sheet has data

### Waiver/Booking won't submit
**Fix**:
1. Verify all required fields filled
2. Check browser console for errors
3. Verify API endpoint is correct

### CORS errors
**Fix**: In Apps Script deployment, ensure "Who has access" is set to "Anyone"

### Images not loading
**Fix**:
1. Verify image files exist in `/assets/` folder
2. Check file names match references in HTML
3. Use relative paths like `/assets/logo.png`

---

## 🎯 Post-Setup Tasks

### 1. Customize Content
- [ ] Replace logo in `/assets/logo.png`
- [ ] Update business information in footer
- [ ] Add your actual dog swimming photos
- [ ] Customize pricing if needed

### 2. Set Up Stripe Products
- [ ] Create Single Session product
- [ ] Create 5-Session Package
- [ ] Create Gift Card product
- [ ] Update links in `config.js`

### 3. Add Store Products
- [ ] Add products to Google Sheet
- [ ] Upload product images
- [ ] Test shopping cart flow

### 4. Configure Email Notifications (Optional)
- [ ] Set up Google Apps Script email triggers
- [ ] Send booking confirmations
- [ ] Send waiver confirmations

### 5. Google Calendar Integration (Optional)
- [ ] Connect Apps Script to Google Calendar
- [ ] Auto-create calendar events for bookings
- [ ] Send calendar invites to customers

---

## 📞 Support & Resources

- **Netlify Docs**: https://docs.netlify.com
- **Google Apps Script**: https://developers.google.com/apps-script
- **Stripe Docs**: https://stripe.com/docs
- **Your Sites**: VetMover.com | MilitaryGrad.com

---

## ✅ You're All Set!

Your DoggyPaddle site now includes:
- ✅ Complete booking system with calendar
- ✅ Google Sheets backend (FREE!)
- ✅ Stripe payment integration
- ✅ Pet treats and accessories store
- ✅ Customer photo upload page
- ✅ Legal waiver system
- ✅ Admin panel for management

**Estimated Setup Time**: 45-60 minutes
**Monthly Cost**: $0 (unless you want a custom domain)

🚀 **Launch your dog swimming business!**

---

## 🔐 Security Notes

1. **Never commit** your Sheet ID or API keys to public repos
2. **Use environment variables** for sensitive data in production
3. **Regularly backup** your Google Sheets data
4. **Monitor** Apps Script execution logs for errors
5. **Test** waiver submissions regularly to ensure legal compliance

---

## 🎉 Next Steps

After setup, consider:
1. Setting up Google Analytics to track visitors
2. Creating a Facebook/Instagram business page
3. Linking photo uploads to social media automation
4. Setting up automated email reminders for appointments
5. Creating a customer loyalty program through the store

Good luck with DoggyPaddle! 🐕💦
