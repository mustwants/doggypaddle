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
