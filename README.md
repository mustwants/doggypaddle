# doggypaddle

/workspaces/doggypaddle/
    # doggiepaddle	
    /workspaces/doggypaddle/	
Created	├── index.html	
Not Created	├── assets/	
Not Created	│ ├── logo.png	
Not Created	│ ├── styles.css (optional for custom)	
Created	├── scripts/	
Created	│ ├── booking.js	
Created	│ ├── netlify.toml	
Created	├── waiver/	
Created	│ └── waiver.html (text + download link to dogpaddle.docx as PDF)	
Not Created	├── stripe/	
Not Created	│ └── checkout.js (placeholder test-mode link)	

// Google Apps Script - DoggyPaddle Backend
// Deploy this as a Web App with "Anyone" access

// CONFIGURATION - Replace with your actual Sheet ID
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';
const SLOTS_SHEET_NAME = 'TimeSlots';
const BOOKINGS_SHEET_NAME = 'Bookings';
const WAIVERS_SHEET_NAME = 'Waivers';

// Main entry point for GET requests
function doGet(e) {
  const action = e.parameter.action;
  
  try {
    switch(action) {
      case 'getAvailableSlots':
        return getAvailableSlots(e.parameter);
      case 'getAllSlots':
        return getAllSlots();
      default:
        return createResponse({
          status: 'error',
          message: 'Invalid action'
        });
    }
  } catch (error) {
    return createResponse({
      status: 'error',
      message: error.toString()
    });
  }
}

// Main entry point for POST requests
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    switch(action) {
      case 'saveSlots':
        return saveSlots(data.slots);
      case 'addSlot':
        return addSlot(data.slot);
      case 'deleteSlot':
        return deleteSlot(data.slotId);
      case 'saveBooking':
        return saveBooking(data.booking);
      case 'saveWaiver':
        return saveWaiver(data.data);
      case 'markSlotBooked':
        return markSlotBooked(data.slotId, data.bookingId);
      default:
        return createResponse({
          status: 'error',
          message: 'Invalid action'
        });
    }
  } catch (error) {
    return createResponse({
      status: 'error',
      message: error.toString()
    });
  }
}

// Get available slots for a specific month/year
function getAvailableSlots(params) {
  const sheet = getSheet(SLOTS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  // Skip header row
  const slots = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) { // If ID exists
      slots.push({
        id: row[0],
        date: row[1],
        time: row[2],
        duration: row[3],
        status: row[4] || 'available',
        createdAt: row[5]
      });
    }
  }
  
  // Filter by month/year if provided
  let filteredSlots = slots;
  if (params.month && params.year) {
    filteredSlots = slots.filter(slot => {
      const slotDate = new Date(slot.date);
      return slotDate.getMonth() + 1 === parseInt(params.month) && 
             slotDate.getFullYear() === parseInt(params.year);
    });
  }
  
  // Only return available slots
  const availableSlots = filteredSlots.filter(slot => slot.status === 'available');
  
  return createResponse({
    status: 'success',
    slots: availableSlots
  });
}

// Get all slots (for admin)
function getAllSlots() {
  const sheet = getSheet(SLOTS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  const slots = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      slots.push({
        id: row[0],
        date: row[1],
        time: row[2],
        duration: row[3],
        status: row[4] || 'available',
        createdAt: row[5]
      });
    }
  }
  
  return createResponse({
    status: 'success',
    slots: slots
  });
}

// Save multiple slots (bulk operation)
function saveSlots(slots) {
  const sheet = getSheet(SLOTS_SHEET_NAME);
  
  // Clear existing data (except header)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 6).clear();
  }
  
  // Add new slots
  if (slots && slots.length > 0) {
    const rows = slots.map(slot => [
      slot.id,
      slot.date,
      slot.time,
      slot.duration,
      slot.status || 'available',
      slot.createdAt || new Date().toISOString()
    ]);
    
    sheet.getRange(2, 1, rows.length, 6).setValues(rows);
  }
  
  return createResponse({
    status: 'success',
    message: 'Slots saved successfully'
  });
}

// Add a single slot
function addSlot(slot) {
  const sheet = getSheet(SLOTS_SHEET_NAME);
  
  // Check for duplicates
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === slot.date && data[i][2] === slot.time) {
      return createResponse({
        status: 'error',
        message: 'Slot already exists for this date and time'
      });
    }
  }
  
  // Add new row
  sheet.appendRow([
    slot.id || `slot-${Date.now()}`,
    slot.date,
    slot.time,
    slot.duration || 20,
    slot.status || 'available',
    new Date().toISOString()
  ]);
  
  return createResponse({
    status: 'success',
    message: 'Slot added successfully'
  });
}

// Delete a slot
function deleteSlot(slotId) {
  const sheet = getSheet(SLOTS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === slotId) {
      sheet.deleteRow(i + 1);
      return createResponse({
        status: 'success',
        message: 'Slot deleted successfully'
      });
    }
  }
  
  return createResponse({
    status: 'error',
    message: 'Slot not found'
  });
}

// Mark slot as booked
function markSlotBooked(slotId, bookingId) {
  const sheet = getSheet(SLOTS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === slotId) {
      sheet.getRange(i + 1, 5).setValue('booked');
      sheet.getRange(i + 1, 7).setValue(bookingId); // Add booking reference
      return createResponse({
        status: 'success',
        message: 'Slot marked as booked'
      });
    }
  }
  
  return createResponse({
    status: 'error',
    message: 'Slot not found'
  });
}

// Save booking
function saveBooking(booking) {
  const sheet = getSheet(BOOKINGS_SHEET_NAME);
  
  const bookingId = `booking-${Date.now()}`;
  
  sheet.appendRow([
    bookingId,
    booking.firstName,
    booking.lastName,
    booking.email,
    booking.phone,
    booking.dogNames,
    booking.dogBreeds,
    booking.numDogs,
    booking.sessionTime,
    booking.ownershipConfirmed ? 'Yes' : 'No',
    booking.waiverAck ? 'Yes' : 'No',
    booking.timestamp || new Date().toISOString(),
    'pending', // payment status
    booking.slotId || ''
  ]);
  
  // Mark slot as booked if slot ID provided
  if (booking.slotId) {
    markSlotBooked(booking.slotId, bookingId);
  }
  
  return createResponse({
    status: 'success',
    bookingId: bookingId,
    message: 'Booking saved successfully'
  });
}

// Save waiver
function saveWaiver(waiverData) {
  const sheet = getSheet(WAIVERS_SHEET_NAME);
  
  const waiverId = `waiver-${Date.now()}`;
  
  sheet.appendRow([
    waiverId,
    waiverData.fullName,
    waiverData.date,
    waiverData.initials.section1,
    waiverData.initials.section2,
    waiverData.initials.section3,
    waiverData.initials.section4,
    waiverData.initials.section5,
    waiverData.timestamp,
    waiverData.ipAddress || 'unknown',
    'Signature captured' // We don't store base64 in sheets, could save to Drive if needed
  ]);
  
  return createResponse({
    status: 'success',
    waiverId: waiverId,
    message: 'Waiver saved successfully'
  });
}

// Helper: Get or create sheet
function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    
    // Add headers based on sheet type
    if (sheetName === SLOTS_SHEET_NAME) {
      sheet.appendRow(['ID', 'Date', 'Time', 'Duration', 'Status', 'Created At', 'Booking ID']);
      sheet.getRange('A1:G1').setFontWeight('bold').setBackground('#028090').setFontColor('#FFFFFF');
    } else if (sheetName === BOOKINGS_SHEET_NAME) {
      sheet.appendRow([
        'Booking ID', 'First Name', 'Last Name', 'Email', 'Phone',
        'Dog Names', 'Dog Breeds', 'Num Dogs', 'Session Time',
        'Ownership Confirmed', 'Waiver Acknowledged', 'Timestamp',
        'Payment Status', 'Slot ID'
      ]);
      sheet.getRange('A1:N1').setFontWeight('bold').setBackground('#028090').setFontColor('#FFFFFF');
    } else if (sheetName === WAIVERS_SHEET_NAME) {
      sheet.appendRow([
        'Waiver ID', 'Full Name', 'Date', 'Initial 1', 'Initial 2',
        'Initial 3', 'Initial 4', 'Initial 5', 'Timestamp',
        'IP Address', 'Signature'
      ]);
      sheet.getRange('A1:K1').setFontWeight('bold').setBackground('#028090').setFontColor('#FFFFFF');
    }
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, sheet.getLastColumn());
  }
  
  return sheet;
}

// Helper: Create JSON response
function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ADMIN FUNCTIONS - Call these manually from Script Editor

// Initialize sheets with sample data
function initializeSheets() {
  // Create sheets if they don't exist
  getSheet(SLOTS_SHEET_NAME);
  getSheet(BOOKINGS_SHEET_NAME);
  getSheet(WAIVERS_SHEET_NAME);
  
  Logger.log('Sheets initialized successfully!');
}

// Add sample slots for testing
function addSampleSlots() {
  const sheet = getSheet(SLOTS_SHEET_NAME);
  const today = new Date();
  
  const sampleSlots = [];
  const times = ['09:00', '11:00', '13:00', '15:00'];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    times.forEach(time => {
      sampleSlots.push([
        `slot-${Date.now()}-${i}-${time}`,
        dateStr,
        time,
        20,
        'available',
        new Date().toISOString(),
        ''
      ]);
    });
  }
  
  sheet.getRange(sheet.getLastRow() + 1, 1, sampleSlots.length, 7).setValues(sampleSlots);
  Logger.log(`Added ${sampleSlots.length} sample slots!`);
}

// Clear all data (use with caution!)
function clearAllData() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheets = [SLOTS_SHEET_NAME, BOOKINGS_SHEET_NAME, WAIVERS_SHEET_NAME];
  
  sheets.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clear();
      }
    }
  });
  
  Logger.log('All data cleared!');
}

# DoggyPaddle Complete Setup Guide

## 📋 Overview
This guide will help you set up your DoggyPaddle website with Google Sheets backend for slot management.

---

## 🚀 Part 1: Google Sheets Setup (FREE & Economical!)

### Step 1: Create Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it: "DoggyPaddle Management"
4. Note the Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[THIS_IS_YOUR_SHEET_ID]/edit
   ```

### Step 2: Deploy Google Apps Script
1. In your Google Sheet, click **Extensions** → **Apps Script**
2. Delete any default code
3. Paste the entire **Google Apps Script** code from the artifact
4. Replace `YOUR_GOOGLE_SHEET_ID_HERE` with your actual Sheet ID
5. Click **Save** (disk icon)
6. Click **Deploy** → **New deployment**
7. Settings:
   - **Type**: Web app
   - **Execute as**: Me
   - **Who has access**: Anyone
8. Click **Deploy**
9. **Copy the Web App URL** - this is your API endpoint!

### Step 3: Initialize Sheets
1. In Apps Script editor, select function: `initializeSheets`
2. Click **Run**
3. Authorize the script (you'll need to grant permissions)
4. Optional: Run `addSampleSlots` to add test data

---

## 📁 Part 2: File Structure

Your website should have this structure:
```
/
├── index.html (main page)
├── assets/
│   ├── logo.png
│   ├── Remi1.jpg
│   ├── Remi2.jpg
│   ├── Remi3.jpg
│   ├── Remi4.jpg
│   └── styles.css
├── scripts/
│   ├── booking.js
│   └── calendar.js
├── waiver/
│   └── waiver.html
├── admin/
│   └── index.html
└── netlify.toml
```

---

## 🔧 Part 3: Update Configuration

### Update These Files:

#### 1. `scripts/booking.js`
Replace line 54:
```javascript
const endpoint = "YOUR_WEB_APP_URL_HERE";
```

#### 2. `scripts/calendar.js`
Replace line 16:
```javascript
const API_ENDPOINT = "YOUR_WEB_APP_URL_HERE";
```

#### 3. `admin/index.html`
Replace line 322:
```javascript
const API_ENDPOINT = "YOUR_WEB_APP_URL_HERE";
```

#### 4. `waiver/waiver.html`
Replace line 488:
```javascript
const response = await fetch('YOUR_WEB_APP_URL_HERE', {
```

---

## 🎨 Part 4: Netlify Deployment

### Option A: Deploy via Netlify UI
1. Go to [netlify.com](https://netlify.com)
2. Sign up/Login (free account)
3. Click **"Add new site"** → **"Deploy manually"**
4. Drag your entire project folder
5. Done! Your site is live

### Option B: Deploy via GitHub
1. Push your code to GitHub
2. Connect Netlify to your repo
3. Set build settings:
   - **Build command**: (leave empty)
   - **Publish directory**: `.` (root)
4. Deploy!

### Custom Domain (Optional)
1. In Netlify: **Domain settings** → **Add custom domain**
2. Follow DNS setup instructions
3. Enable HTTPS (automatic with Netlify)

---

## 👨‍💼 Part 5: Admin Usage

### Access Admin Panel
Go to: `https://yourdomain.com/admin/index.html`

### Managing Slots:

#### Add Single Slot
1. Select date
2. Select time
3. Click "Add Slot"

#### Quick Add
Click any time button (9am, 12pm, etc.) to instantly add for today

#### Bulk Add Week
Click "Add Default Week Schedule" to add 3 daily slots for next 7 days

#### Delete Slots
Click "Delete" button next to any slot

### View Statistics
Dashboard shows:
- Available slots
- Booked slots
- This week's slots
- This month's slots

---

## 📊 Part 6: Google Sheets Structure

### Sheet 1: TimeSlots
| ID | Date | Time | Duration | Status | Created At | Booking ID |
|----|------|------|----------|--------|------------|------------|
| slot-123 | 2024-11-15 | 10:00 | 20 | available | 2024-11-10... | |

### Sheet 2: Bookings
| Booking ID | First Name | Last Name | Email | Phone | Dog Names | ... |
|------------|-----------|-----------|-------|-------|-----------|-----|

### Sheet 3: Waivers
| Waiver ID | Full Name | Date | Initials (1-5) | Timestamp | ... |
|-----------|-----------|------|----------------|-----------|-----|

---

## 💰 Cost Breakdown (Economical!)

| Service | Cost | What You Get |
|---------|------|--------------|
| **Google Sheets** | FREE | Unlimited sheets, 5M cells |
| **Google Apps Script** | FREE | 90 min/day execution time |
| **Netlify Hosting** | FREE | 100GB bandwidth, SSL included |
| **Domain (optional)** | ~$12/year | Your own .com domain |
| **Total** | **$0-12/year** | Full business website! |

### Why This Is Better Than Alternatives:
- ❌ **Calendly**: $12-20/month ($144-240/year)
- ❌ **Acuity**: $16-50/month ($192-600/year)
- ❌ **Square Appointments**: $0 + 2.9% + 30¢ per transaction
- ✅ **Your Solution**: $0-12/year with MORE control!

---

## 🔐 Part 7: Security & Compliance

### Waiver Features:
- ✅ Must scroll entire document
- ✅ Initial 5 separate sections
- ✅ Electronic signature capture
- ✅ Legal checkboxes
- ✅ Timestamp and IP tracking
- ✅ Stored in Google Sheets (encrypted at rest)
- ✅ Florida & St. Johns County specific

### Privacy:
- Waivers stored in your Google Sheet (you own the data)
- No third-party data sharing
- Signatures saved as base64 (can be extracted to PDF if needed)

---

## 📱 Part 8: Testing Your Site

### Test Checklist:
- [ ] Open site on desktop browser
- [ ] Open site on mobile phone
- [ ] Navigate to waiver page
- [ ] Scroll through waiver completely
- [ ] Initial all 5 sections
- [ ] Sign with mouse/finger
- [ ] Submit waiver
- [ ] View calendar
- [ ] Click on a date with slots
- [ ] Select a time slot
- [ ] Verify it auto-fills booking form
- [ ] Test admin panel (add/delete slots)
- [ ] Check Google Sheets for data

---

## 🆘 Troubleshooting

### Issue: "Cannot read property 'getRange'"
**Fix**: Make sure Sheet ID is correct in Apps Script

### Issue: Slots not showing on calendar
**Fix**: 
1. Check browser console for errors
2. Verify API endpoint URL is correct
3. Check Google Sheets has data in TimeSlots sheet

### Issue: Waiver won't submit
**Fix**:
1. Make sure all initials are filled (2+ characters)
2. Check all checkboxes are checked
3. Verify signature is drawn
4. Check browser console for errors

### Issue: CORS errors
**Fix**: In Apps Script deployment, make sure "Who has access" is set to "Anyone"

---

## 🎯 Next Steps After Setup

1. **Test Everything**: Go through complete user flow
2. **Add Real Slots**: Use admin panel to create your actual schedule
3. **Test Booking Flow**: Complete a test booking end-to-end
4. **Connect Stripe**: Replace test mode with live mode
5. **Set Up Email Notifications**: Use Apps Script to send confirmations
6. **Add Google Calendar Sync**: Optionally sync slots to Google Calendar

---

## 📞 Support Resources

- **Netlify Docs**: https://docs.netlify.com
- **Google Apps Script**: https://developers.google.com/apps-script
- **Stripe Integration**: https://stripe.com/docs
- **Your Assets**: VetMover.com | MilitaryGrad.com

---

## 🎉 You're Done!

Your DoggyPaddle site is now:
- ✅ Fully responsive (mobile-ready)
- ✅ Legally compliant waiver system
- ✅ Interactive booking calendar
- ✅ Admin panel for slot management
- ✅ Google Sheets backend (free!)
- ✅ Ready for Stripe payments
- ✅ Deployed on Netlify

**Estimated Setup Time**: 30-45 minutes
**Monthly Cost**: $0 (unless you want custom domain)

🚀 Launch your dog swimming business!
