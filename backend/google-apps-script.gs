// Google Apps Script - DoggyPaddle Backend
// Deploy this as a Web App with "Anyone" access
//
// SETUP INSTRUCTIONS:
// 1. Create a new Google Sheet named "DoggyPaddle Management"
// 2. Copy the Sheet ID from the URL (the long string between /d/ and /edit)
//    Example: https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
// 3. Replace YOUR_GOOGLE_SHEET_ID_HERE below with your actual Sheet ID
// 4. In your Google Sheet, go to Extensions > Apps Script
// 5. Delete any existing code and paste this entire file
// 6. Save the project (File > Save or Ctrl/Cmd+S)
// 7. Run the "initializeSheets" function once to create the sheets
//    - Click the function dropdown, select "initializeSheets", then click Run
//    - You may need to authorize the script (click "Review Permissions" and allow)
// 8. Click Deploy > New deployment
// 9. Click the gear icon next to "Select type" and choose "Web app"
// 10. Configure deployment:
//     - Description: "DoggyPaddle Backend API"
//     - Execute as: "Me"
//     - Who has access: "Anyone" (IMPORTANT: This must be "Anyone" for CORS to work)
// 11. Click "Deploy"
// 12. Copy the Web App URL (it will look like: https://script.google.com/macros/s/LONG_ID/exec)
// 13. Update the API_ENDPOINT in your website's scripts/config.js with this URL
// 14. IMPORTANT: After making any changes to this script, you must create a NEW deployment
//     - Go to Deploy > Manage deployments
//     - Click "New deployment"
//     - Follow steps 9-11 again
//
// TROUBLESHOOTING CORS ERRORS:
// - Make sure "Who has access" is set to "Anyone" in your deployment settings
// - After code changes, create a NEW deployment (don't just redeploy the old one)
// - Clear your browser cache and try again
// - Check that your config.js has the correct Web App URL

// CONFIGURATION - Replace with your actual Sheet ID
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';
const SLOTS_SHEET_NAME = 'TimeSlots';
const BOOKINGS_SHEET_NAME = 'Bookings';
const WAIVERS_SHEET_NAME = 'Waivers';
const PRODUCTS_SHEET_NAME = 'Products';
const ORDERS_SHEET_NAME = 'Orders';
const PHOTOS_SHEET_NAME = 'Photos';

// Handle CORS preflight (OPTIONS) requests
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', 'https://dogpaddle.club')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '86400');
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
      case 'rejectPhoto':
        return rejectPhoto(data.photoId);
      case 'updatePhoto':
        return updatePhoto(data.photoId, data.updates);
      case 'deletePhoto':
        return deletePhoto(data.photoId);
      case 'saveProduct':
        return saveProduct(data.product);
      case 'updateProduct':
        return updateProduct(data.product);
      case 'deleteProduct':
        return deleteProduct(data.productId);
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

  // Check for duplicates and time conflicts
  const data = sheet.getDataRange().getValues();
  const newSlotDate = new Date(slot.date + ' ' + slot.time);
  const newSlotDuration = slot.duration || 20;
  const newSlotEndTime = new Date(newSlotDate.getTime() + newSlotDuration * 60000);

  for (let i = 1; i < data.length; i++) {
    // Check exact duplicate
    if (data[i][1] === slot.date && data[i][2] === slot.time) {
      return createResponse({
        status: 'error',
        message: 'Slot already exists for this date and time'
      });
    }

    // Check time overlap on the same date
    if (data[i][1] === slot.date) {
      const existingSlotTime = new Date(data[i][1] + ' ' + data[i][2]);
      const existingSlotDuration = data[i][3] || 20;
      const existingSlotEndTime = new Date(existingSlotTime.getTime() + existingSlotDuration * 60000);

      // Check if times overlap
      if ((newSlotDate >= existingSlotTime && newSlotDate < existingSlotEndTime) ||
          (newSlotEndTime > existingSlotTime && newSlotEndTime <= existingSlotEndTime) ||
          (newSlotDate <= existingSlotTime && newSlotEndTime >= existingSlotEndTime)) {
        return createResponse({
          status: 'error',
          message: `Time slot conflicts with existing slot at ${data[i][2]}`
        });
      }
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
      // Check if slot is already booked
      if (data[i][4] === 'booked') {
        return createResponse({
          status: 'error',
          message: 'This time slot has already been booked. Please select another time.'
        });
      }

      // Check if slot is blocked
      if (data[i][4] === 'blocked') {
        return createResponse({
          status: 'error',
          message: 'This time slot is not available. Please select another time.'
        });
      }

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

// Save new product
function saveProduct(product) {
  const sheet = getSheet(PRODUCTS_SHEET_NAME);

  sheet.appendRow([
    product.id,
    product.name,
    product.description,
    product.price,
    product.category,
    product.imageUrl,
    product.inStock ? 'true' : 'false',
    product.quantity || 0,
    product.lowStockThreshold || 5,
    new Date().toISOString()
  ]);

  return createResponse({
    status: 'success',
    message: 'Product saved successfully'
  });
}

// Update existing product
function updateProduct(product) {
  const sheet = getSheet(PRODUCTS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === product.id) {
      sheet.getRange(i + 1, 1, 1, 10).setValues([[
        product.id,
        product.name,
        product.description,
        product.price,
        product.category,
        product.imageUrl,
        product.inStock ? 'true' : 'false',
        product.quantity || 0,
        product.lowStockThreshold || 5,
        data[i][9] // Keep original createdAt
      ]]);

      return createResponse({
        status: 'success',
        message: 'Product updated successfully'
      });
    }
  }

  return createResponse({
    status: 'error',
    message: 'Product not found'
  });
}

// Delete product
function deleteProduct(productId) {
  const sheet = getSheet(PRODUCTS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === productId) {
      sheet.deleteRow(i + 1);
      return createResponse({
        status: 'success',
        message: 'Product deleted successfully'
      });
    }
  }

  return createResponse({
    status: 'error',
    message: 'Product not found'
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
      // Check if photo is featured (stored as note on status cell)
      const statusNote = sheet.getRange(i + 1, 7).getNote() || '';
      const isFeatured = statusNote === 'featured';

      const photo = {
        id: row[0],
        customerName: row[1],
        email: row[2],
        dogName: row[3],
        imageUrl: row[4],
        caption: row[5],
        status: row[6],
        createdAt: row[7],
        sessionDate: row[8],
        featured: isFeatured
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

// Reject photo
function rejectPhoto(photoId) {
  const sheet = getSheet(PHOTOS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === photoId) {
      sheet.getRange(i + 1, 7).setValue('rejected');
      return createResponse({
        status: 'success',
        message: 'Photo rejected'
      });
    }
  }

  return createResponse({
    status: 'error',
    message: 'Photo not found'
  });
}

// Update photo (for status, featured flag, caption, etc.)
function updatePhoto(photoId, updates) {
  const sheet = getSheet(PHOTOS_SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === photoId) {
      // Column mapping: [0]=id, [1]=customerName, [2]=email, [3]=dogName,
      // [4]=imageUrl, [5]=caption, [6]=status, [7]=createdAt, [8]=sessionDate
      if (updates.customerName !== undefined) {
        sheet.getRange(i + 1, 2).setValue(updates.customerName);
      }
      if (updates.email !== undefined) {
        sheet.getRange(i + 1, 3).setValue(updates.email);
      }
      if (updates.dogName !== undefined) {
        sheet.getRange(i + 1, 4).setValue(updates.dogName);
      }
      if (updates.caption !== undefined) {
        sheet.getRange(i + 1, 6).setValue(updates.caption);
      }
      if (updates.status !== undefined) {
        sheet.getRange(i + 1, 7).setValue(updates.status);
      }
      if (updates.sessionDate !== undefined) {
        sheet.getRange(i + 1, 9).setValue(updates.sessionDate);
      }
      if (updates.featured !== undefined) {
        // Featured is stored as a note on the status cell for now
        // We could add a new column if needed
        const currentNote = sheet.getRange(i + 1, 7).getNote() || '';
        if (updates.featured) {
          sheet.getRange(i + 1, 7).setNote('featured');
        } else {
          sheet.getRange(i + 1, 7).setNote('');
        }
      }

      return createResponse({
        status: 'success',
        message: 'Photo updated'
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
        'Image URL', 'In Stock', 'Quantity', 'Low Stock Threshold', 'Created At'
      ]);
      sheet.getRange('A1:J1').setFontWeight('bold').setBackground('#028090').setFontColor('#FFFFFF');
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

// Helper: Create JSON response with CORS headers
function createResponse(data) {
  const jsonOutput = JSON.stringify(data);

  return ContentService
    .createTextOutput(jsonOutput)
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', 'https://dogpaddle.club')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Helper: Create CORS preflight response
function createCORSResponse(data) {
  const jsonOutput = JSON.stringify(data);

  return ContentService
    .createTextOutput(jsonOutput)
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', 'https://dogpaddle.club')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '86400');
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

// Add sample slots for testing - uses half-hour intervals (:00 and :30)
function addSampleSlots() {
  const sheet = getSheet(SLOTS_SHEET_NAME);
  const today = new Date();

  const sampleSlots = [];
  // Half-hour intervals: top of hour and bottom of hour
  // 30-minute spacing provides 20 min swim + 10 min buffer for client departure
  const times = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    times.forEach(time => {
      sampleSlots.push([
        `slot-${Date.now()}-${i}-${time}`,
        dateStr,
        time,
        20, // 20 minutes swim time (10 min buffer before next slot)
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
