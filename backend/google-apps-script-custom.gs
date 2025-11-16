// Google Apps Script - DoggyPaddle Backend (Custom for existing sheet)
// Deploy this as a Web App with "Anyone" access
//
// CONFIGURATION - Your Sheet ID
const SHEET_ID = '1q7yUDjuVSwXfL9PJUTny0oy5Nr5jlVKsdyik2-vTL8I';
const SLOTS_SHEET_NAME = 'available_slots';
const BOOKINGS_SHEET_NAME = 'bookings';
const PRODUCTS_SHEET_NAME = 'Products';

// Handle CORS preflight (OPTIONS) requests
// Note: When deployed with "Anyone" access, Google Apps Script automatically handles CORS
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

// Main entry point for GET requests
function doGet(e) {
  const action = e.parameter.action;

  try {
    switch(action) {
      case 'getAvailableSlots':
        return getAvailableSlots(e.parameter);
      case 'getAllSlots':
        return getAllSlots();
      case 'getProducts':
        return getProducts();
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
      case 'saveBooking':
        return saveBooking(data.booking);
      case 'addSlot':
        return addSlot(data.slot);
      case 'deleteSlot':
        return deleteSlot(data.slotId);
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
    if (row[0]) { // If Date exists
      // Generate a unique ID from date and time
      const slotId = `slot-${row[0]}-${row[1]}`.replace(/[^a-zA-Z0-9-]/g, '-');

      slots.push({
        id: slotId,
        date: formatDate(row[0]), // Column A: Date
        time: row[1], // Column B: Time
        duration: 30, // Default 30 minutes
        status: row[2] || 'available' // Column C: Status
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
  const availableSlots = filteredSlots.filter(slot =>
    slot.status.toLowerCase() === 'available'
  );

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
      const slotId = `slot-${row[0]}-${row[1]}`.replace(/[^a-zA-Z0-9-]/g, '-');

      slots.push({
        id: slotId,
        date: formatDate(row[0]),
        time: row[1],
        duration: 30,
        status: row[2] || 'available'
      });
    }
  }

  return createResponse({
    status: 'success',
    slots: slots
  });
}

// Get products
function getProducts() {
  const sheet = getSheet(PRODUCTS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  const products = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      products.push({
        id: row[0],
        name: row[1],
        description: row[2],
        price: row[3],
        category: row[4],
        imageUrl: row[5],
        inStock: row[6] !== 'false',
        quantity: row[7] || 0,
        lowStockThreshold: row[8] || 5,
        createdAt: row[9]
      });
    }
  }

  return createResponse({
    status: 'success',
    products: products
  });
}

// Add a single slot
function addSlot(slot) {
  const sheet = getSheet(SLOTS_SHEET_NAME);

  // Add new row: Date, Time, Status
  sheet.appendRow([
    slot.date,
    slot.time,
    slot.status || 'available'
  ]);

  return createResponse({
    status: 'success',
    message: 'Slot added successfully'
  });
}

// Delete a slot (find by date and time)
function deleteSlot(slotId) {
  const sheet = getSheet(SLOTS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const rowSlotId = `slot-${data[i][0]}-${data[i][1]}`.replace(/[^a-zA-Z0-9-]/g, '-');
    if (rowSlotId === slotId) {
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

// Save booking
function saveBooking(booking) {
  const sheet = getSheet(BOOKINGS_SHEET_NAME);

  const bookingId = `booking-${Date.now()}`;

  // Append row matching your sheet structure:
  // Timestamp, First Name, Last Name, Phone, Email, Dog 1 Name, Dog 2 Name,
  // Breed 1, Breed 2, # of Dogs, Slot, Signature

  const dogNames = booking.dogNames ? booking.dogNames.split(',') : [''];
  const dogBreeds = booking.dogBreeds ? booking.dogBreeds.split(',') : [''];

  sheet.appendRow([
    new Date().toISOString(), // Timestamp
    booking.firstName,
    booking.lastName,
    booking.phone,
    booking.email,
    dogNames[0] || '', // Dog 1 Name
    dogNames[1] || '', // Dog 2 Name
    dogBreeds[0] || '', // Breed 1
    dogBreeds[1] || '', // Breed 2
    booking.numDogs,
    booking.sessionTime, // Slot
    booking.waiverAck ? 'Signed' : 'Pending' // Signature status
  ]);

  // Mark slot as booked if slot info provided
  if (booking.sessionTime) {
    markSlotBooked(booking.sessionTime);
  }

  return createResponse({
    status: 'success',
    bookingId: bookingId,
    message: 'Booking saved successfully'
  });
}

// Mark slot as booked (find by date/time)
function markSlotBooked(sessionTime) {
  try {
    const sheet = getSheet(SLOTS_SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    // Parse the session time (format: "YYYY-MM-DDTHH:MM")
    const dateTime = new Date(sessionTime);
    const searchDate = formatDate(dateTime);
    const searchTime = Utilities.formatDate(dateTime, Session.getScriptTimeZone(), 'HH:mm');

    for (let i = 1; i < data.length; i++) {
      const rowDate = formatDate(data[i][0]);
      const rowTime = data[i][1];

      if (rowDate === searchDate && rowTime === searchTime) {
        sheet.getRange(i + 1, 3).setValue('booked'); // Column C: Status
        return true;
      }
    }
  } catch (error) {
    Logger.log('Error marking slot as booked: ' + error);
  }
  return false;
}

// Helper: Get or create sheet
function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);

    // Add headers based on sheet type
    if (sheetName === SLOTS_SHEET_NAME) {
      sheet.appendRow(['Date', 'Time', 'Status']);
      sheet.getRange('A1:C1').setFontWeight('bold').setBackground('#028090').setFontColor('#FFFFFF');
    } else if (sheetName === BOOKINGS_SHEET_NAME) {
      sheet.appendRow([
        'Timestamp', 'First Name', 'Last Name', 'Phone', 'Email',
        'Dog 1 Name', 'Dog 2 Name', 'Breed 1', 'Breed 2', '# of Dogs',
        'Slot', 'Signature'
      ]);
      sheet.getRange('A1:L1').setFontWeight('bold').setBackground('#028090').setFontColor('#FFFFFF');
    } else if (sheetName === PRODUCTS_SHEET_NAME) {
      sheet.appendRow([
        'ID', 'Name', 'Description', 'Price', 'Category',
        'Image URL', 'In Stock', 'Quantity', 'Low Stock Threshold', 'Created At'
      ]);
      sheet.getRange('A1:J1').setFontWeight('bold').setBackground('#028090').setFontColor('#FFFFFF');
    }

    // Auto-resize columns
    sheet.autoResizeColumns(1, sheet.getLastColumn());
  }

  return sheet;
}

// Helper: Format date consistently
function formatDate(date) {
  if (typeof date === 'string') return date;
  if (date instanceof Date) {
    return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(date);
}

// Helper: Create JSON response
// Note: When deployed with "Anyone" access, Google Apps Script automatically handles CORS
function createResponse(data) {
  const jsonOutput = JSON.stringify(data);

  return ContentService
    .createTextOutput(jsonOutput)
    .setMimeType(ContentService.MimeType.JSON);
}

// ADMIN HELPER FUNCTIONS - Run these manually from Script Editor

// Add sample slots for testing
function addSampleSlots() {
  const sheet = getSheet(SLOTS_SHEET_NAME);
  const today = new Date();

  const sampleSlots = [];
  const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    times.forEach(time => {
      sampleSlots.push([
        dateStr,
        time,
        'available'
      ]);
    });
  }

  sheet.getRange(sheet.getLastRow() + 1, 1, sampleSlots.length, 3).setValues(sampleSlots);
  Logger.log(`Added ${sampleSlots.length} sample slots!`);
}
