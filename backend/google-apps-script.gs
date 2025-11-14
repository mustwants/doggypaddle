// Google Apps Script - DoggyPaddle Backend
// Deploy this as a Web App with "Anyone" access
//
// SETUP INSTRUCTIONS:
// 1. Create a new Google Sheet named "DoggyPaddle Management"
// 2. Copy the Sheet ID from the URL (the long string between /d/ and /edit)
// 3. Replace YOUR_GOOGLE_SHEET_ID_HERE below with your Sheet ID
// 4. Go to Extensions > Apps Script in your Google Sheet
// 5. Paste this entire code
// 6. Click Deploy > New deployment
// 7. Select "Web app" as type
// 8. Set "Execute as" to "Me"
// 9. Set "Who has access" to "Anyone"
// 10. Click Deploy and copy the Web App URL
// 11. Update the API_ENDPOINT in your website files with this URL

// CONFIGURATION - Replace with your actual Sheet ID
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';
const SLOTS_SHEET_NAME = 'TimeSlots';
const BOOKINGS_SHEET_NAME = 'Bookings';
const WAIVERS_SHEET_NAME = 'Waivers';
const PRODUCTS_SHEET_NAME = 'Products';
const ORDERS_SHEET_NAME = 'Orders';
const PHOTOS_SHEET_NAME = 'Photos';

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
      case 'getPhotos':
        return getPhotos(e.parameter);
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
      case 'saveOrder':
        return saveOrder(data.order);
      case 'savePhoto':
        return savePhoto(data.photo);
      case 'approvePhoto':
        return approvePhoto(data.photoId);
      case 'deletePhoto':
        return deletePhoto(data.photoId);
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
        createdAt: row[7]
      });
    }
  }

  return createResponse({
    status: 'success',
    products: products
  });
}

// Save order
function saveOrder(order) {
  const sheet = getSheet(ORDERS_SHEET_NAME);

  const orderId = `order-${Date.now()}`;

  sheet.appendRow([
    orderId,
    order.customerName,
    order.email,
    order.phone,
    JSON.stringify(order.items),
    order.total,
    order.timestamp || new Date().toISOString(),
    'pending', // payment status
    order.shippingAddress || 'Pickup'
  ]);

  return createResponse({
    status: 'success',
    orderId: orderId,
    message: 'Order saved successfully'
  });
}

// Save photo submission
function savePhoto(photo) {
  const sheet = getSheet(PHOTOS_SHEET_NAME);

  const photoId = `photo-${Date.now()}`;

  sheet.appendRow([
    photoId,
    photo.customerName,
    photo.email,
    photo.dogName,
    photo.imageUrl, // URL from image hosting service
    photo.caption || '',
    'pending', // approval status
    new Date().toISOString(),
    photo.sessionDate || ''
  ]);

  return createResponse({
    status: 'success',
    photoId: photoId,
    message: 'Photo submitted successfully! We will review it shortly.'
  });
}

// Get photos (approved only for public, all for admin)
function getPhotos(params) {
  const sheet = getSheet(PHOTOS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  const photos = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      const photo = {
        id: row[0],
        customerName: row[1],
        email: row[2],
        dogName: row[3],
        imageUrl: row[4],
        caption: row[5],
        status: row[6],
        createdAt: row[7],
        sessionDate: row[8]
      };

      // If admin request, return all; otherwise only approved
      if (params.admin === 'true' || photo.status === 'approved') {
        photos.push(photo);
      }
    }
  }

  return createResponse({
    status: 'success',
    photos: photos
  });
}

// Approve photo
function approvePhoto(photoId) {
  const sheet = getSheet(PHOTOS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === photoId) {
      sheet.getRange(i + 1, 7).setValue('approved');
      return createResponse({
        status: 'success',
        message: 'Photo approved'
      });
    }
  }

  return createResponse({
    status: 'error',
    message: 'Photo not found'
  });
}

// Delete photo
function deletePhoto(photoId) {
  const sheet = getSheet(PHOTOS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === photoId) {
      sheet.deleteRow(i + 1);
      return createResponse({
        status: 'success',
        message: 'Photo deleted'
      });
    }
  }

  return createResponse({
    status: 'error',
    message: 'Photo not found'
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
    } else if (sheetName === PRODUCTS_SHEET_NAME) {
      sheet.appendRow([
        'ID', 'Name', 'Description', 'Price', 'Category',
        'Image URL', 'In Stock', 'Created At'
      ]);
      sheet.getRange('A1:H1').setFontWeight('bold').setBackground('#028090').setFontColor('#FFFFFF');
    } else if (sheetName === ORDERS_SHEET_NAME) {
      sheet.appendRow([
        'Order ID', 'Customer Name', 'Email', 'Phone', 'Items',
        'Total', 'Timestamp', 'Payment Status', 'Shipping Address'
      ]);
      sheet.getRange('A1:I1').setFontWeight('bold').setBackground('#028090').setFontColor('#FFFFFF');
    } else if (sheetName === PHOTOS_SHEET_NAME) {
      sheet.appendRow([
        'Photo ID', 'Customer Name', 'Email', 'Dog Name', 'Image URL',
        'Caption', 'Status', 'Created At', 'Session Date'
      ]);
      sheet.getRange('A1:I1').setFontWeight('bold').setBackground('#028090').setFontColor('#FFFFFF');
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
  getSheet(PRODUCTS_SHEET_NAME);
  getSheet(ORDERS_SHEET_NAME);
  getSheet(PHOTOS_SHEET_NAME);

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

// Add sample products
function addSampleProducts() {
  const sheet = getSheet(PRODUCTS_SHEET_NAME);

  const sampleProducts = [
    ['prod-1', 'Dog Treats - Peanut Butter', 'Delicious all-natural peanut butter treats', 12.99, 'Treats', '/assets/products/treats1.jpg', 'true', new Date().toISOString()],
    ['prod-2', 'Dog Treats - Bacon', 'Crispy bacon-flavored treats', 14.99, 'Treats', '/assets/products/treats2.jpg', 'true', new Date().toISOString()],
    ['prod-3', 'Swimming Vest - Small', 'Safety vest for small dogs', 29.99, 'Accessories', '/assets/products/vest-small.jpg', 'true', new Date().toISOString()],
    ['prod-4', 'Swimming Vest - Large', 'Safety vest for large dogs', 34.99, 'Accessories', '/assets/products/vest-large.jpg', 'true', new Date().toISOString()],
    ['prod-5', 'DoggyPaddle T-Shirt', 'Show your DoggyPaddle pride!', 24.99, 'Merchandise', '/assets/products/tshirt.jpg', 'true', new Date().toISOString()],
    ['prod-6', 'Waterproof Toy Bundle', 'Set of 3 floating toys', 19.99, 'Toys', '/assets/products/toys.jpg', 'true', new Date().toISOString()]
  ];

  sheet.getRange(sheet.getLastRow() + 1, 1, sampleProducts.length, 8).setValues(sampleProducts);
  Logger.log(`Added ${sampleProducts.length} sample products!`);
}

// Clear all data (use with caution!)
function clearAllData() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheets = [SLOTS_SHEET_NAME, BOOKINGS_SHEET_NAME, WAIVERS_SHEET_NAME, PRODUCTS_SHEET_NAME, ORDERS_SHEET_NAME, PHOTOS_SHEET_NAME];

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
