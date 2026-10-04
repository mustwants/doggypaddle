/**
 * PupSwim backend - Google Apps Script Web App
 * File: backend/Code.gs (paste the whole file into the Apps Script editor as Code.gs)
 *
 * RETURN TYPES
 *   doGet(e)  returns JSON via ContentService.createTextOutput(...).setMimeType(JSON). Never HTML.
 *   doPost(e) returns JSON via ContentService.createTextOutput(...).setMimeType(JSON). Never HTML.
 *
 * SECURITY MODEL
 *   The Web App is deployed "Execute as: Me" and "Who has access: Anyone", so every
 *   request is anonymous as far as Google is concerned. Authorization is enforced here:
 *     - A short list of public actions (read open slots, read shop items, create a booking,
 *       sign a waiver, request a pass, check a pass balance, request/complete admin sign-in).
 *     - Every other action requires a valid admin session token (requireAdmin_).
 *   Admin sign-in is a one-time link emailed to an address on the ADMIN_ALLOWLIST.
 *   Checks made in the browser are never trusted.
 *
 * WHERE THE DATA GOES
 *   Create this script from inside the PupSwim Google Sheet (Extensions > Apps Script).
 *   The script then reads and writes that sheet automatically. No sheet ID is needed.
 *
 * SCRIPT PROPERTIES (Project Settings > Script Properties). All are optional:
 *   ADMIN_ALLOWLIST   comma-separated admin emails. Default: scott@mustwants.com
 *   SITE_URL          public site address used in emailed links. Default: https://pupswim.com
 *   CONTACT_EMAIL     reply-to address on customer emails. Default: pupswim@mustwants.com
 *   NOTIFY_EMAIL      where new-booking notices go. Default: first admin on the allowlist
 *   SHEET_ID          only for a script that is NOT attached to a sheet: the spreadsheet ID to use
 *
 * FIRST-TIME SETUP: select the function "setup" in the editor toolbar and click Run.
 */

var CONFIG = {
  TIMEZONE: 'America/New_York',
  BRAND: 'PupSwim',
  DEFAULT_SITE_URL: 'https://pupswim.com',
  DEFAULT_ADMINS: ['scott@mustwants.com'],
  DEFAULT_CONTACT_EMAIL: 'pupswim@mustwants.com',
  LOGIN_TOKEN_TTL_SECONDS: 900,
  SESSION_TTL_HOURS: 12,
  MAX_DOGS: 2,
  DEFAULT_SLOT_MINUTES: 20,
  SLOT_LOOKAHEAD_DAYS: 90,
  MAX_SIGNATURE_CHARS: 45000,
  PASS_TYPES: {
    pack5: { label: '5-Session Pack', sessions: 5 },
    club: { label: 'Swim Club (monthly)', sessions: 4 }
  },
  SHOP_SOURCES: ['amazon', 'etsy', 'printify', 'shopify', 'pupswim', 'other'],
  SHOP_CATEGORIES: ['Treats', 'Toys', 'Safety', 'Grooming', 'Merch', 'Other']
};

var TABLES = {
  SLOTS: {
    name: 'PupSwim Slots',
    headers: ['ID', 'Date', 'Time', 'Duration', 'Status', 'Booking ID', 'Created At']
  },
  BOOKINGS: {
    name: 'PupSwim Bookings',
    headers: ['Booking ID', 'Created At', 'Status', 'Payment Status', 'Slot ID', 'Date', 'Time', 'Duration',
      'First Name', 'Last Name', 'Email', 'Phone', 'Dog Names', 'Dog Breeds', 'Num Dogs',
      'Ownership Confirmed', 'Waiver Acknowledged', 'Pass ID', 'Notes', 'Request ID']
  },
  WAIVERS: {
    name: 'PupSwim Waivers',
    headers: ['Waiver ID', 'Signed At', 'Full Name', 'Email', 'Date', 'Initials 1', 'Initials 2', 'Initials 3',
      'Initials 4', 'Initials 5', 'Ack Read', 'Ack Rights', 'Ack Voluntary', 'Signature', 'Waiver Version', 'User Agent']
  },
  PASSES: {
    name: 'PupSwim Passes',
    headers: ['Pass ID', 'Created At', 'Type', 'Status', 'First Name', 'Last Name', 'Email', 'Phone', 'Dog Names',
      'Sessions Total', 'Sessions Remaining', 'Period Start', 'Notes', 'Updated At']
  },
  SHOP: {
    name: 'PupSwim Shop',
    headers: ['Item ID', 'Created At', 'Active', 'Name', 'Description', 'Category', 'Source', 'Link URL',
      'Image URL', 'Price Text', 'Sort Order']
  }
};

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

var PUBLIC_GET_ACTIONS = {
  ping: function () { return { status: 'success', service: CONFIG.BRAND, time: new Date().toISOString() }; },
  getAvailableSlots: function (params) { return getAvailableSlots_(params); },
  getShopItems: function () { return getShopItems_(); }
};

var PUBLIC_POST_ACTIONS = {
  saveBooking: function (data) { return saveBooking_(data); },
  saveWaiver: function (data) { return saveWaiver_(data); },
  requestPass: function (data) { return requestPass_(data); },
  getPassStatus: function (data) { return getPassStatus_(data); },
  requestAdminLogin: function (data) { return requestAdminLogin_(data); },
  completeAdminLogin: function (data) { return completeAdminLogin_(data); }
};

var ADMIN_POST_ACTIONS = {
  adminWhoAmI: function (data, admin) { return { status: 'success', email: admin.email, expiresAt: admin.expiresAt }; },
  adminLogout: function (data, admin) { return adminLogout_(data); },
  adminGetSlots: function (data) { return adminGetSlots_(data); },
  adminAddSlots: function (data) { return adminAddSlots_(data); },
  adminSetSlotStatus: function (data) { return adminSetSlotStatus_(data); },
  adminDeleteSlots: function (data) { return adminDeleteSlots_(data); },
  adminGetBookings: function () { return adminGetBookings_(); },
  adminUpdateBooking: function (data) { return adminUpdateBooking_(data); },
  adminGetWaivers: function () { return adminGetWaivers_(); },
  adminGetWaiver: function (data) { return adminGetWaiver_(data); },
  adminGetPasses: function () { return adminGetPasses_(); },
  adminSavePass: function (data) { return adminSavePass_(data); },
  adminGetShopItems: function () { return adminGetShopItems_(); },
  adminSaveShopItem: function (data) { return adminSaveShopItem_(data); },
  adminDeleteShopItem: function (data) { return adminDeleteShopItem_(data); }
};

/** GET handler. Returns JSON (ContentService). Only public read actions are available over GET. */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = String(params.action || '');
    if (!Object.prototype.hasOwnProperty.call(PUBLIC_GET_ACTIONS, action)) {
      return json_({ status: 'error', code: 'unknown_action', message: 'Unknown action.' });
    }
    return json_(PUBLIC_GET_ACTIONS[action](params));
  } catch (err) {
    return json_(errorPayload_(err));
  }
}

/** POST handler. Returns JSON (ContentService). Admin actions require data.adminToken. */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw apiError_('bad_request', 'Request body is required.');
    }
    var data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      throw apiError_('bad_request', 'Request body must be JSON.');
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw apiError_('bad_request', 'Request body must be a JSON object.');
    }
    var action = String(data.action || '');

    if (Object.prototype.hasOwnProperty.call(PUBLIC_POST_ACTIONS, action)) {
      return json_(PUBLIC_POST_ACTIONS[action](data));
    }
    if (Object.prototype.hasOwnProperty.call(ADMIN_POST_ACTIONS, action)) {
      var admin = requireAdmin_(data.adminToken);
      return json_(ADMIN_POST_ACTIONS[action](data, admin));
    }
    return json_({ status: 'error', code: 'unknown_action', message: 'Unknown action.' });
  } catch (err) {
    return json_(errorPayload_(err));
  }
}

// ---------------------------------------------------------------------------
// Response and error helpers
// ---------------------------------------------------------------------------

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function apiError_(code, message) {
  var err = new Error(message);
  err.isApiError = true;
  err.code = code;
  return err;
}

function errorPayload_(err) {
  if (err && err.isApiError) {
    return { status: 'error', code: err.code, message: err.message };
  }
  // Unexpected failure: log the detail, return a generic message so internals are not exposed.
  console.error('Unexpected error: ' + (err && err.stack ? err.stack : err));
  return { status: 'error', code: 'server_error', message: 'Something went wrong. Please try again.' };
}

// ---------------------------------------------------------------------------
// Configuration helpers
// ---------------------------------------------------------------------------

function prop_(key) {
  var value = PropertiesService.getScriptProperties().getProperty(key);
  return value === null || value === undefined ? '' : String(value);
}

function adminAllowlist_() {
  var raw = prop_('ADMIN_ALLOWLIST');
  var list = raw ? raw.split(/[\n,;]/) : CONFIG.DEFAULT_ADMINS;
  var out = [];
  for (var i = 0; i < list.length; i++) {
    var email = String(list[i]).trim().toLowerCase();
    if (email && out.indexOf(email) === -1) out.push(email);
  }
  return out;
}

function siteUrl_() {
  var url = prop_('SITE_URL') || CONFIG.DEFAULT_SITE_URL;
  url = url.trim().replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(url) && !/^http:\/\/localhost(:\d+)?$/i.test(url)) {
    return CONFIG.DEFAULT_SITE_URL;
  }
  return url;
}

function contactEmail_() {
  var email = prop_('CONTACT_EMAIL').trim().toLowerCase();
  return isEmail_(email) ? email : CONFIG.DEFAULT_CONTACT_EMAIL;
}

function notifyEmail_() {
  var email = prop_('NOTIFY_EMAIL').trim().toLowerCase();
  if (isEmail_(email)) return email;
  var admins = adminAllowlist_();
  return admins.length ? admins[0] : '';
}

// ---------------------------------------------------------------------------
// Validation and sanitizing
// ---------------------------------------------------------------------------

/**
 * Cleans a user-supplied string before it is written to the sheet:
 * trims, removes control characters, caps the length, and neutralizes
 * spreadsheet formula injection (values starting with = + - @).
 */
function cleanText_(value, maxLength) {
  if (value === null || value === undefined) return '';
  var text = String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  text = text.replace(/[\r\n\t]+/g, ' ').trim();
  if (text.length > maxLength) text = text.substring(0, maxLength);
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return text;
}

/** Reverses the formula guard added by cleanText_ when a value is read back. */
function unguard_(text) {
  if (typeof text === 'string' && /^'[=+\-@]/.test(text)) return text.substring(1);
  return text;
}

function requireText_(value, label, minLength, maxLength) {
  var raw = (value === null || value === undefined) ? '' : String(value).trim();
  if (raw.length < minLength) throw apiError_('validation', label + ' is required.');
  if (raw.length > maxLength) throw apiError_('validation', label + ' is too long.');
  return cleanText_(raw, maxLength);
}

function isEmail_(value) {
  return typeof value === 'string' && value.length <= 254 &&
    /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/.test(value);
}

function requireEmail_(value) {
  var email = (value === null || value === undefined) ? '' : String(value).trim().toLowerCase();
  if (!isEmail_(email)) throw apiError_('validation', 'A valid email address is required.');
  return email;
}

function requirePhone_(value) {
  var phone = (value === null || value === undefined) ? '' : String(value).trim();
  var digits = phone.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15 || !/^[0-9+().\-\s]{7,25}$/.test(phone)) {
    throw apiError_('validation', 'A valid phone number is required.');
  }
  return cleanText_(phone, 25);
}

function isDate_(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  var parts = value.split('-');
  var y = Number(parts[0]), m = Number(parts[1]), d = Number(parts[2]);
  var date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function isTime_(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isHttpsUrl_(value) {
  return typeof value === 'string' && value.length <= 600 && /^https:\/\/[^\s<>"'`\\]+$/.test(value);
}

function toInt_(value, fallback) {
  var n = parseInt(value, 10);
  return isNaN(n) ? fallback : n;
}

function isTrue_(value) {
  return value === true || value === 'true' || value === 'TRUE' || value === 'Yes' || value === 'yes';
}

function htmlEscape_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// Time helpers (all business times are America/New_York wall-clock strings)
// ---------------------------------------------------------------------------

function nowStamp_() {
  return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm');
}

function todayStamp_() {
  return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
}

function addDays_(dateString, days) {
  var parts = dateString.split('-');
  var date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]) + days));
  var y = date.getUTCFullYear();
  var m = ('0' + (date.getUTCMonth() + 1)).slice(-2);
  var d = ('0' + date.getUTCDate()).slice(-2);
  return y + '-' + m + '-' + d;
}

function formatTime12_(time) {
  if (!isTime_(time)) return String(time);
  var parts = time.split(':');
  var h = Number(parts[0]);
  var suffix = h >= 12 ? 'PM' : 'AM';
  var h12 = h % 12 === 0 ? 12 : h % 12;
  return h12 + ':' + parts[1] + ' ' + suffix;
}

function formatDateLong_(dateString) {
  if (!isDate_(dateString)) return String(dateString);
  var parts = dateString.split('-');
  var date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0));
  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December'];
  return days[date.getUTCDay()] + ', ' + months[date.getUTCMonth()] + ' ' + date.getUTCDate() + ', ' + date.getUTCFullYear();
}

// ---------------------------------------------------------------------------
// Sheet table helpers (columns are located by header name, not by position)
// ---------------------------------------------------------------------------

var spreadsheetCache_ = null;

function spreadsheet_() {
  if (!spreadsheetCache_) {
    var id = prop_('SHEET_ID').trim();
    // Normal case: the script is attached to the PupSwim sheet, which is then the "active" spreadsheet.
    spreadsheetCache_ = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheetCache_) {
      throw new Error('No spreadsheet found. Create this script from the sheet (Extensions > Apps Script) or set the SHEET_ID script property.');
    }
  }
  return spreadsheetCache_;
}

function normHeader_(header) {
  return String(header).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Opens (or creates) a table and makes sure every expected header column exists. */
function table_(def) {
  var ss = spreadsheet_();
  var sheet = ss.getSheetByName(def.name);
  if (!sheet) {
    sheet = ss.insertSheet(def.name);
    sheet.getRange(1, 1, sheet.getMaxRows(), def.headers.length).setNumberFormat('@');
    sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  var width = Math.max(sheet.getLastColumn(), 1);
  var headerRow = sheet.getRange(1, 1, 1, width).getValues()[0];
  var index = {};
  for (var c = 0; c < headerRow.length; c++) {
    var key = normHeader_(headerRow[c]);
    if (key && !Object.prototype.hasOwnProperty.call(index, key)) index[key] = c;
  }
  for (var h = 0; h < def.headers.length; h++) {
    var wanted = normHeader_(def.headers[h]);
    if (!Object.prototype.hasOwnProperty.call(index, wanted)) {
      var isFirstEmpty = (width === 1 && !normHeader_(headerRow[0]) && Object.keys(index).length === 0);
      var col = isFirstEmpty ? 1 : width + 1;
      sheet.getRange(1, col, sheet.getMaxRows(), 1).setNumberFormat('@');
      sheet.getRange(1, col).setValue(def.headers[h]).setFontWeight('bold');
      index[wanted] = col - 1;
      width = Math.max(width, col);
      headerRow[col - 1] = def.headers[h];
    }
  }
  return { sheet: sheet, def: def, index: index, width: width };
}

function cellToString_(value, header) {
  if (value === null || value === undefined) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    if (header === 'Time') return Utilities.formatDate(value, CONFIG.TIMEZONE, 'HH:mm');
    if (header === 'Date') return Utilities.formatDate(value, CONFIG.TIMEZONE, 'yyyy-MM-dd');
    return value.toISOString();
  }
  return unguard_(String(value));
}

/** Reads every data row as an object keyed by the table's header names, plus _row (sheet row number). */
function readRows_(t) {
  var lastRow = t.sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = t.sheet.getRange(2, 1, lastRow - 1, t.width).getValues();
  var rows = [];
  for (var r = 0; r < values.length; r++) {
    var obj = { _row: r + 2 };
    var hasData = false;
    for (var h = 0; h < t.def.headers.length; h++) {
      var header = t.def.headers[h];
      var text = cellToString_(values[r][t.index[normHeader_(header)]], header);
      obj[header] = text;
      if (text !== '') hasData = true;
    }
    if (hasData) rows.push(obj);
  }
  return rows;
}

function appendRow_(t, obj) {
  var row = [];
  for (var c = 0; c < t.width; c++) row.push('');
  for (var h = 0; h < t.def.headers.length; h++) {
    var header = t.def.headers[h];
    var value = Object.prototype.hasOwnProperty.call(obj, header) ? obj[header] : '';
    row[t.index[normHeader_(header)]] = (value === null || value === undefined) ? '' : String(value);
  }
  var target = t.sheet.getLastRow() + 1;
  t.sheet.getRange(target, 1, 1, t.width).setNumberFormat('@').setValues([row]);
  return target;
}

function updateRow_(t, rowNumber, changes) {
  for (var header in changes) {
    if (!Object.prototype.hasOwnProperty.call(changes, header)) continue;
    var key = normHeader_(header);
    if (!Object.prototype.hasOwnProperty.call(t.index, key)) continue;
    var value = changes[header];
    t.sheet.getRange(rowNumber, t.index[key] + 1).setNumberFormat('@')
      .setValue((value === null || value === undefined) ? '' : String(value));
  }
}

function findRow_(rows, header, value) {
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][header] === value) return rows[i];
  }
  return null;
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (lockErr) {
    throw apiError_('busy', 'The system is busy. Please try again in a moment.');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function newId_(prefix) {
  return prefix + '_' + Utilities.getUuid().replace(/-/g, '').substring(0, 16);
}

// ---------------------------------------------------------------------------
// Abuse limits (fixed window counters in CacheService)
// ---------------------------------------------------------------------------

function sha256Hex_(text) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i];
    if (b < 0) b += 256;
    hex += ('0' + b.toString(16)).slice(-2);
  }
  return hex;
}

/** Throws when more than `limit` calls with the same key happen inside one window. */
function rateLimit_(key, limit, windowSeconds) {
  var cache = CacheService.getScriptCache();
  var bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  var cacheKey = 'rl_' + sha256Hex_(key + '|' + bucket).substring(0, 40);
  var count = toInt_(cache.get(cacheKey), 0) + 1;
  cache.put(cacheKey, String(count), windowSeconds);
  if (count > limit) {
    throw apiError_('rate_limited', 'Too many requests. Please wait a while and try again.');
  }
}

/** Hidden form field that real visitors leave empty. Filled means an automated submission. */
function isBot_(data) {
  return !!(data && typeof data.website === 'string' && data.website.trim() !== '');
}

// ---------------------------------------------------------------------------
// Admin authentication (emailed one-time link, then a session token)
// ---------------------------------------------------------------------------

function newSecret_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

function requestAdminLogin_(data) {
  var generic = { status: 'success', message: 'If that address is an admin, a sign-in link is on its way. It expires in 15 minutes.' };
  var email = (data && data.email !== undefined && data.email !== null) ? String(data.email).trim().toLowerCase() : '';
  if (!isEmail_(email)) throw apiError_('validation', 'A valid email address is required.');

  rateLimit_('login_all', 20, 3600);
  if (adminAllowlist_().indexOf(email) === -1) {
    return generic;
  }
  try {
    rateLimit_('login_' + email, 5, 3600);
  } catch (limitErr) {
    return generic;
  }

  var token = newSecret_();
  CacheService.getScriptCache().put('login_' + sha256Hex_(token), email, CONFIG.LOGIN_TOKEN_TTL_SECONDS);

  var link = siteUrl_() + '/admin/#login=' + token;
  var subject = CONFIG.BRAND + ' admin sign-in link';
  var text = 'Use this link to sign in to the ' + CONFIG.BRAND + ' admin dashboard. It works once and expires in 15 minutes.\n\n' +
    link + '\n\nIf you did not request this, ignore this email.';
  var html = '<p>Use this link to sign in to the ' + htmlEscape_(CONFIG.BRAND) + ' admin dashboard. ' +
    'It works once and expires in 15 minutes.</p>' +
    '<p><a href="' + htmlEscape_(link) + '">Sign in to the admin dashboard</a></p>' +
    '<p>If you did not request this, ignore this email.</p>';
  MailApp.sendEmail({ to: email, subject: subject, body: text, htmlBody: html, name: CONFIG.BRAND });
  return generic;
}

function completeAdminLogin_(data) {
  rateLimit_('login_complete', 60, 3600);
  var token = (data && typeof data.token === 'string') ? data.token.trim() : '';
  if (!/^[a-f0-9]{64}$/.test(token)) throw apiError_('unauthorized', 'This sign-in link is not valid. Request a new one.');

  var cache = CacheService.getScriptCache();
  var cacheKey = 'login_' + sha256Hex_(token);
  var email = withLock_(function () {
    var found = cache.get(cacheKey);
    if (found) cache.remove(cacheKey);
    return found;
  });
  if (!email || adminAllowlist_().indexOf(email) === -1) {
    throw apiError_('unauthorized', 'This sign-in link has expired or was already used. Request a new one.');
  }

  purgeExpiredSessions_();
  var sessionToken = newSecret_();
  var expiresAt = Date.now() + CONFIG.SESSION_TTL_HOURS * 3600 * 1000;
  PropertiesService.getScriptProperties().setProperty(
    'sess_' + sha256Hex_(sessionToken),
    JSON.stringify({ email: email, expiresAt: expiresAt })
  );
  return { status: 'success', adminToken: sessionToken, email: email, expiresAt: expiresAt };
}

/** Validates an admin session token. Throws an "unauthorized" API error when it is missing, unknown, or expired. */
function requireAdmin_(adminToken) {
  var token = (typeof adminToken === 'string') ? adminToken.trim() : '';
  if (!/^[a-f0-9]{64}$/.test(token)) throw apiError_('unauthorized', 'Admin sign-in is required.');
  var props = PropertiesService.getScriptProperties();
  var key = 'sess_' + sha256Hex_(token);
  var raw = props.getProperty(key);
  if (!raw) throw apiError_('unauthorized', 'Admin sign-in is required.');
  var session;
  try {
    session = JSON.parse(raw);
  } catch (parseErr) {
    props.deleteProperty(key);
    throw apiError_('unauthorized', 'Admin sign-in is required.');
  }
  if (!session || !session.email || !session.expiresAt || Date.now() >= Number(session.expiresAt)) {
    props.deleteProperty(key);
    throw apiError_('unauthorized', 'Your admin session has expired. Sign in again.');
  }
  if (adminAllowlist_().indexOf(String(session.email).toLowerCase()) === -1) {
    props.deleteProperty(key);
    throw apiError_('unauthorized', 'Admin sign-in is required.');
  }
  return { email: session.email, expiresAt: Number(session.expiresAt) };
}

function adminLogout_(data) {
  var token = String(data.adminToken || '').trim();
  PropertiesService.getScriptProperties().deleteProperty('sess_' + sha256Hex_(token));
  return { status: 'success' };
}

function purgeExpiredSessions_() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  for (var key in all) {
    if (!Object.prototype.hasOwnProperty.call(all, key) || key.indexOf('sess_') !== 0) continue;
    var expired = true;
    try {
      var session = JSON.parse(all[key]);
      expired = !session || !session.expiresAt || Date.now() >= Number(session.expiresAt);
    } catch (parseErr) {
      expired = true;
    }
    if (expired) props.deleteProperty(key);
  }
}

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

function slotFromRow_(row) {
  return {
    id: row['ID'],
    date: row['Date'],
    time: row['Time'],
    duration: toInt_(row['Duration'], CONFIG.DEFAULT_SLOT_MINUTES),
    status: (row['Status'] || 'available').toLowerCase(),
    bookingId: row['Booking ID'],
    createdAt: row['Created At']
  };
}

/** Public: open rental slots that are still in the future. Returns id, date, time, duration only. */
function getAvailableSlots_(params) {
  var today = todayStamp_();
  var from = isDate_(params.from) && params.from > today ? params.from : today;
  var maxTo = addDays_(today, CONFIG.SLOT_LOOKAHEAD_DAYS);
  var to = isDate_(params.to) && params.to < maxTo ? params.to : maxTo;
  var now = nowStamp_();

  var rows = readRows_(table_(TABLES.SLOTS));
  var slots = [];
  for (var i = 0; i < rows.length; i++) {
    var slot = slotFromRow_(rows[i]);
    if (slot.status !== 'available') continue;
    if (!isDate_(slot.date) || !isTime_(slot.time)) continue;
    if (slot.date < from || slot.date > to) continue;
    if ((slot.date + ' ' + slot.time) <= now) continue;
    slots.push({ id: slot.id, date: slot.date, time: slot.time, duration: slot.duration });
  }
  slots.sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
  return { status: 'success', slots: slots };
}

function adminGetSlots_(data) {
  var from = isDate_(data.from) ? data.from : '';
  var to = isDate_(data.to) ? data.to : '';
  var rows = readRows_(table_(TABLES.SLOTS));
  var slots = [];
  for (var i = 0; i < rows.length; i++) {
    var slot = slotFromRow_(rows[i]);
    if (from && slot.date < from) continue;
    if (to && slot.date > to) continue;
    slots.push(slot);
  }
  slots.sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
  return { status: 'success', slots: slots };
}

function adminAddSlots_(data) {
  var incoming = Array.isArray(data.slots) ? data.slots : [];
  if (incoming.length === 0) throw apiError_('validation', 'At least one slot is required.');
  if (incoming.length > 500) throw apiError_('validation', 'Add at most 500 slots at a time.');

  for (var v = 0; v < incoming.length; v++) {
    var s = incoming[v] || {};
    if (!isDate_(s.date)) throw apiError_('validation', 'Slot ' + (v + 1) + ' has an invalid date. Use YYYY-MM-DD.');
    if (!isTime_(s.time)) throw apiError_('validation', 'Slot ' + (v + 1) + ' has an invalid time. Use HH:MM (24-hour).');
    var minutes = toInt_(s.duration, CONFIG.DEFAULT_SLOT_MINUTES);
    if (minutes < 10 || minutes > 180) throw apiError_('validation', 'Slot ' + (v + 1) + ' duration must be 10 to 180 minutes.');
  }

  return withLock_(function () {
    var t = table_(TABLES.SLOTS);
    var rows = readRows_(t);
    var taken = {};
    for (var i = 0; i < rows.length; i++) taken[rows[i]['Date'] + ' ' + rows[i]['Time']] = true;

    var added = 0, skipped = 0;
    var createdAt = new Date().toISOString();
    for (var n = 0; n < incoming.length; n++) {
      var slot = incoming[n];
      var key = slot.date + ' ' + slot.time;
      if (taken[key]) { skipped++; continue; }
      taken[key] = true;
      appendRow_(t, {
        'ID': newId_('slot'),
        'Date': slot.date,
        'Time': slot.time,
        'Duration': toInt_(slot.duration, CONFIG.DEFAULT_SLOT_MINUTES),
        'Status': 'available',
        'Booking ID': '',
        'Created At': createdAt
      });
      added++;
    }
    return { status: 'success', added: added, skipped: skipped };
  });
}

function adminSetSlotStatus_(data) {
  var slotId = String(data.slotId || '');
  var status = String(data.slotStatus || '').toLowerCase();
  if (status !== 'available' && status !== 'blocked') throw apiError_('validation', 'Status must be available or blocked.');
  return withLock_(function () {
    var t = table_(TABLES.SLOTS);
    var row = findRow_(readRows_(t), 'ID', slotId);
    if (!row) throw apiError_('not_found', 'Slot not found.');
    if ((row['Status'] || '').toLowerCase() === 'booked') {
      throw apiError_('conflict', 'This slot is booked. Cancel the booking first.');
    }
    updateRow_(t, row._row, { 'Status': status });
    return { status: 'success' };
  });
}

function adminDeleteSlots_(data) {
  var ids = Array.isArray(data.slotIds) ? data.slotIds.map(String) : [];
  if (ids.length === 0) throw apiError_('validation', 'Select at least one slot.');
  return withLock_(function () {
    var t = table_(TABLES.SLOTS);
    var rows = readRows_(t);
    var toDelete = [];
    var kept = 0;
    for (var i = 0; i < rows.length; i++) {
      if (ids.indexOf(rows[i]['ID']) === -1) continue;
      if ((rows[i]['Status'] || '').toLowerCase() === 'booked') { kept++; continue; }
      toDelete.push(rows[i]._row);
    }
    toDelete.sort(function (a, b) { return b - a; });
    for (var d = 0; d < toDelete.length; d++) t.sheet.deleteRow(toDelete[d]);
    return { status: 'success', deleted: toDelete.length, keptBooked: kept };
  });
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

/** Public: reserve one slot. Payment happens afterwards (Stripe link) unless a pass is used. */
function saveBooking_(data) {
  if (isBot_(data)) return { status: 'success', bookingId: '', paymentStatus: 'pending' };
  rateLimit_('booking', 40, 3600);

  var b = (data && data.booking && typeof data.booking === 'object') ? data.booking : null;
  if (!b) throw apiError_('validation', 'Booking details are required.');

  var firstName = requireText_(b.firstName, 'First name', 1, 60);
  var lastName = requireText_(b.lastName, 'Last name', 1, 60);
  var email = requireEmail_(b.email);
  var phone = requirePhone_(b.phone);
  var dogNames = requireText_(b.dogNames, 'Dog name(s)', 1, 120);
  var dogBreeds = requireText_(b.dogBreeds, 'Breed(s)', 1, 120);
  var numDogs = toInt_(b.numDogs, 0);
  if (numDogs < 1 || numDogs > CONFIG.MAX_DOGS) throw apiError_('validation', 'Choose 1 or 2 dogs.');
  if (b.ownershipConfirmed !== true) throw apiError_('validation', 'You must confirm you own the dog(s) or are authorized by the owner.');
  if (b.waiverAck !== true) throw apiError_('validation', 'You must agree to the liability waiver.');
  var slotId = String(b.slotId || '');
  if (!slotId) throw apiError_('validation', 'Choose a time slot.');
  var usePass = b.usePass === true;
  // The browser sends one random requestId per booking attempt. If the reply to a successful
  // booking is lost and the browser retries, the same booking is returned instead of an error.
  var requestId = (typeof b.requestId === 'string' && /^[A-Za-z0-9-]{16,64}$/.test(b.requestId)) ? b.requestId : '';

  var result = withLock_(function () {
    var bookingTable = table_(TABLES.BOOKINGS);
    if (requestId) {
      var previous = findRow_(readRows_(bookingTable), 'Request ID', requestId);
      if (previous && previous['Email'].toLowerCase() === email) {
        return {
          status: 'success',
          bookingId: previous['Booking ID'],
          paymentStatus: (previous['Payment Status'] || 'pending').toLowerCase(),
          sessionsRemaining: null,
          repeat: true,
          slot: {
            id: previous['Slot ID'],
            date: previous['Date'],
            time: previous['Time'],
            duration: toInt_(previous['Duration'], CONFIG.DEFAULT_SLOT_MINUTES)
          }
        };
      }
    }

    var slotTable = table_(TABLES.SLOTS);
    var slotRow = findRow_(readRows_(slotTable), 'ID', slotId);
    if (!slotRow) throw apiError_('conflict', 'That time slot is no longer available. Please choose another.');
    var slot = slotFromRow_(slotRow);
    if (slot.status !== 'available' || !isDate_(slot.date) || !isTime_(slot.time) ||
        (slot.date + ' ' + slot.time) <= nowStamp_()) {
      throw apiError_('conflict', 'That time slot is no longer available. Please choose another.');
    }

    var passTable = null, passRow = null;
    if (usePass) {
      passTable = table_(TABLES.PASSES);
      var passes = readRows_(passTable);
      for (var i = 0; i < passes.length; i++) {
        if (passes[i]['Email'].toLowerCase() === email && passes[i]['Status'].toLowerCase() === 'active' &&
            toInt_(passes[i]['Sessions Remaining'], 0) > 0) {
          passRow = passes[i];
          break;
        }
      }
      if (!passRow) {
        throw apiError_('no_pass', 'No active pass with sessions remaining was found for that email address.');
      }
    }

    var bookingId = newId_('bk');
    var nowIso = new Date().toISOString();
    appendRow_(bookingTable, {
      'Booking ID': bookingId,
      'Created At': nowIso,
      'Status': 'confirmed',
      'Payment Status': usePass ? 'pass' : 'pending',
      'Slot ID': slot.id,
      'Date': slot.date,
      'Time': slot.time,
      'Duration': slot.duration,
      'First Name': firstName,
      'Last Name': lastName,
      'Email': email,
      'Phone': phone,
      'Dog Names': dogNames,
      'Dog Breeds': dogBreeds,
      'Num Dogs': numDogs,
      'Ownership Confirmed': 'Yes',
      'Waiver Acknowledged': 'Yes',
      'Pass ID': passRow ? passRow['Pass ID'] : '',
      'Notes': '',
      'Request ID': requestId
    });
    updateRow_(slotTable, slotRow._row, { 'Status': 'booked', 'Booking ID': bookingId });

    var sessionsRemaining = null;
    if (passRow) {
      sessionsRemaining = toInt_(passRow['Sessions Remaining'], 0) - 1;
      updateRow_(passTable, passRow._row, { 'Sessions Remaining': sessionsRemaining, 'Updated At': nowIso });
    }

    return {
      status: 'success',
      bookingId: bookingId,
      paymentStatus: usePass ? 'pass' : 'pending',
      sessionsRemaining: sessionsRemaining,
      repeat: false,
      slot: { id: slot.id, date: slot.date, time: slot.time, duration: slot.duration }
    };
  });

  if (result.repeat) return result;
  sendBookingEmails_(result, { firstName: unguard_(firstName), lastName: unguard_(lastName), email: email,
    phone: unguard_(phone), dogNames: unguard_(dogNames), numDogs: numDogs });
  return result;
}

function sendBookingEmails_(result, customer) {
  try {
    var when = formatDateLong_(result.slot.date) + ' at ' + formatTime12_(result.slot.time);
    var site = siteUrl_();
    var paid = result.paymentStatus === 'pass';
    var lines = [
      'Hi ' + customer.firstName + ',',
      '',
      'Your ' + CONFIG.BRAND + ' pool rental is reserved.',
      '',
      'When: ' + when + ' (' + result.slot.duration + ' minutes)',
      'Dogs: ' + customer.dogNames + ' (' + customer.numDogs + ')',
      'Booking reference: ' + result.bookingId,
      paid ? 'Payment: covered by your pass. Sessions left on the pass: ' + result.sessionsRemaining + '.'
           : 'Payment: not yet received. If you have not paid, use the payment button shown after booking, or reply to this email.',
      '',
      'Before you arrive, sign the liability waiver: ' + site + '/waiver/',
      'Pool rules: ' + site + '/#rules',
      '',
      'Need to change or cancel? Reply to this email. Please give 24 hours notice.',
      '',
      CONFIG.BRAND
    ];
    MailApp.sendEmail({
      to: customer.email,
      subject: CONFIG.BRAND + ' rental confirmed: ' + when,
      body: lines.join('\n'),
      name: CONFIG.BRAND,
      replyTo: contactEmail_()
    });
  } catch (mailErr) {
    console.error('Customer booking email failed: ' + mailErr);
  }
  try {
    var notify = notifyEmail_();
    if (notify) {
      MailApp.sendEmail({
        to: notify,
        subject: 'New ' + CONFIG.BRAND + ' booking: ' + result.slot.date + ' ' + result.slot.time,
        body: [
          'New booking ' + result.bookingId,
          'When: ' + result.slot.date + ' ' + result.slot.time + ' (' + result.slot.duration + ' min)',
          'Customer: ' + customer.firstName + ' ' + customer.lastName,
          'Email: ' + customer.email,
          'Phone: ' + customer.phone,
          'Dogs: ' + customer.dogNames + ' (' + customer.numDogs + ')',
          'Payment status: ' + result.paymentStatus,
          '',
          'Manage: ' + siteUrl_() + '/admin/'
        ].join('\n'),
        name: CONFIG.BRAND
      });
    }
  } catch (notifyErr) {
    console.error('Admin booking notice failed: ' + notifyErr);
  }
}

function bookingFromRow_(row) {
  return {
    bookingId: row['Booking ID'],
    createdAt: row['Created At'],
    status: (row['Status'] || 'confirmed').toLowerCase(),
    paymentStatus: (row['Payment Status'] || 'pending').toLowerCase(),
    slotId: row['Slot ID'],
    date: row['Date'],
    time: row['Time'],
    duration: toInt_(row['Duration'], CONFIG.DEFAULT_SLOT_MINUTES),
    firstName: row['First Name'],
    lastName: row['Last Name'],
    email: row['Email'],
    phone: row['Phone'],
    dogNames: row['Dog Names'],
    dogBreeds: row['Dog Breeds'],
    numDogs: toInt_(row['Num Dogs'], 1),
    passId: row['Pass ID'],
    notes: row['Notes']
  };
}

function adminGetBookings_() {
  var rows = readRows_(table_(TABLES.BOOKINGS));
  var waivers = readRows_(table_(TABLES.WAIVERS));
  var waiverEmails = {};
  for (var w = 0; w < waivers.length; w++) waiverEmails[waivers[w]['Email'].toLowerCase()] = true;

  var bookings = [];
  for (var i = 0; i < rows.length; i++) {
    var booking = bookingFromRow_(rows[i]);
    booking.waiverOnFile = !!waiverEmails[booking.email.toLowerCase()];
    bookings.push(booking);
  }
  bookings.sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? 1 : -1; });
  return { status: 'success', bookings: bookings };
}

function adminUpdateBooking_(data) {
  var bookingId = String(data.bookingId || '');
  var newPayment = data.paymentStatus === undefined ? null : String(data.paymentStatus).toLowerCase();
  var newStatus = data.bookingStatus === undefined ? null : String(data.bookingStatus).toLowerCase();
  var notes = data.notes === undefined ? null : cleanText_(data.notes, 500);
  if (newPayment !== null && ['pending', 'paid', 'pass', 'refunded'].indexOf(newPayment) === -1) {
    throw apiError_('validation', 'Invalid payment status.');
  }
  if (newStatus !== null && ['confirmed', 'cancelled'].indexOf(newStatus) === -1) {
    throw apiError_('validation', 'Invalid booking status.');
  }

  return withLock_(function () {
    var t = table_(TABLES.BOOKINGS);
    var row = findRow_(readRows_(t), 'Booking ID', bookingId);
    if (!row) throw apiError_('not_found', 'Booking not found.');
    var current = bookingFromRow_(row);
    var changes = {};
    if (newPayment !== null) changes['Payment Status'] = newPayment;
    if (notes !== null) changes['Notes'] = notes;

    if (newStatus === 'cancelled' && current.status !== 'cancelled') {
      changes['Status'] = 'cancelled';
      // Release the slot if it still points at this booking.
      var slotTable = table_(TABLES.SLOTS);
      var slotRow = findRow_(readRows_(slotTable), 'ID', current.slotId);
      if (slotRow && slotRow['Booking ID'] === bookingId) {
        updateRow_(slotTable, slotRow._row, { 'Status': 'available', 'Booking ID': '' });
      }
      // Return the session to the pass when the booking was paid with one.
      if (current.paymentStatus === 'pass' && current.passId) {
        var passTable = table_(TABLES.PASSES);
        var passRow = findRow_(readRows_(passTable), 'Pass ID', current.passId);
        if (passRow) {
          var total = toInt_(passRow['Sessions Total'], 0);
          var restored = Math.min(total, toInt_(passRow['Sessions Remaining'], 0) + 1);
          updateRow_(passTable, passRow._row, { 'Sessions Remaining': restored, 'Updated At': new Date().toISOString() });
        }
      }
    } else if (newStatus === 'confirmed' && current.status === 'cancelled') {
      throw apiError_('conflict', 'A cancelled booking cannot be reopened. Create a new booking instead.');
    }

    updateRow_(t, row._row, changes);
    return { status: 'success' };
  });
}

// ---------------------------------------------------------------------------
// Waivers
// ---------------------------------------------------------------------------

function saveWaiver_(data) {
  if (isBot_(data)) return { status: 'success', waiverId: '' };
  rateLimit_('waiver', 40, 3600);

  var w = (data && data.waiver && typeof data.waiver === 'object') ? data.waiver : null;
  if (!w) throw apiError_('validation', 'Waiver details are required.');

  var fullName = requireText_(w.fullName, 'Full legal name', 2, 120);
  var email = requireEmail_(w.email);
  var date = String(w.date || '');
  if (!isDate_(date)) throw apiError_('validation', 'A valid date is required.');
  var initials = Array.isArray(w.initials) ? w.initials : [];
  if (initials.length !== 5) throw apiError_('validation', 'All five sections must be initialed.');
  var cleanInitials = [];
  for (var i = 0; i < 5; i++) {
    var value = String(initials[i] === null || initials[i] === undefined ? '' : initials[i]).trim();
    if (!/^[A-Za-z.\- ]{1,6}$/.test(value)) throw apiError_('validation', 'Section ' + (i + 1) + ' needs your initials (letters only).');
    cleanInitials.push(cleanText_(value, 6));
  }
  if (w.ackRead !== true || w.ackRights !== true || w.ackVoluntary !== true) {
    throw apiError_('validation', 'All three final acknowledgments must be checked.');
  }
  var signature = String(w.signature || '');
  if (signature.indexOf('data:image/png;base64,') !== 0 || !/^data:image\/png;base64,[A-Za-z0-9+\/=]+$/.test(signature)) {
    throw apiError_('validation', 'A drawn signature is required.');
  }
  if (signature.length > CONFIG.MAX_SIGNATURE_CHARS) {
    throw apiError_('validation', 'The signature image is too large. Clear it and sign again with a simpler signature.');
  }

  var waiverId = newId_('wv');
  withLock_(function () {
    appendRow_(table_(TABLES.WAIVERS), {
      'Waiver ID': waiverId,
      'Signed At': new Date().toISOString(),
      'Full Name': fullName,
      'Email': email,
      'Date': date,
      'Initials 1': cleanInitials[0],
      'Initials 2': cleanInitials[1],
      'Initials 3': cleanInitials[2],
      'Initials 4': cleanInitials[3],
      'Initials 5': cleanInitials[4],
      'Ack Read': 'Yes',
      'Ack Rights': 'Yes',
      'Ack Voluntary': 'Yes',
      'Signature': signature,
      'Waiver Version': cleanText_(w.version, 40),
      'User Agent': cleanText_(w.userAgent, 300)
    });
  });
  return { status: 'success', waiverId: waiverId };
}

function waiverFromRow_(row, includeSignature) {
  var waiver = {
    waiverId: row['Waiver ID'],
    signedAt: row['Signed At'],
    fullName: row['Full Name'],
    email: row['Email'],
    date: row['Date'],
    initials: [row['Initials 1'], row['Initials 2'], row['Initials 3'], row['Initials 4'], row['Initials 5']],
    version: row['Waiver Version']
  };
  if (includeSignature) {
    waiver.signature = row['Signature'];
    waiver.userAgent = row['User Agent'];
  }
  return waiver;
}

function adminGetWaivers_() {
  var rows = readRows_(table_(TABLES.WAIVERS));
  var waivers = [];
  for (var i = 0; i < rows.length; i++) waivers.push(waiverFromRow_(rows[i], false));
  waivers.sort(function (a, b) { return a.signedAt < b.signedAt ? 1 : -1; });
  return { status: 'success', waivers: waivers };
}

function adminGetWaiver_(data) {
  var row = findRow_(readRows_(table_(TABLES.WAIVERS)), 'Waiver ID', String(data.waiverId || ''));
  if (!row) throw apiError_('not_found', 'Waiver not found.');
  return { status: 'success', waiver: waiverFromRow_(row, true) };
}

// ---------------------------------------------------------------------------
// Passes (5-session pack and monthly Swim Club)
// ---------------------------------------------------------------------------

function passFromRow_(row) {
  return {
    passId: row['Pass ID'],
    createdAt: row['Created At'],
    type: row['Type'],
    status: (row['Status'] || 'pending').toLowerCase(),
    firstName: row['First Name'],
    lastName: row['Last Name'],
    email: row['Email'],
    phone: row['Phone'],
    dogNames: row['Dog Names'],
    sessionsTotal: toInt_(row['Sessions Total'], 0),
    sessionsRemaining: toInt_(row['Sessions Remaining'], 0),
    periodStart: row['Period Start'],
    notes: row['Notes'],
    updatedAt: row['Updated At']
  };
}

/** Public: ask for a pass. It is created as "pending" with zero sessions; an admin activates it after payment. */
function requestPass_(data) {
  if (isBot_(data)) return { status: 'success', passId: '', passStatus: 'pending' };
  rateLimit_('pass_request', 30, 3600);

  var p = (data && data.pass && typeof data.pass === 'object') ? data.pass : null;
  if (!p) throw apiError_('validation', 'Pass details are required.');
  var type = String(p.type || '');
  if (!Object.prototype.hasOwnProperty.call(CONFIG.PASS_TYPES, type)) throw apiError_('validation', 'Choose a pass type.');
  var firstName = requireText_(p.firstName, 'First name', 1, 60);
  var lastName = requireText_(p.lastName, 'Last name', 1, 60);
  var email = requireEmail_(p.email);
  var phone = requirePhone_(p.phone);
  var dogNames = requireText_(p.dogNames, 'Dog name(s)', 1, 120);

  var result = withLock_(function () {
    var t = table_(TABLES.PASSES);
    var rows = readRows_(t);
    for (var i = 0; i < rows.length; i++) {
      var status = rows[i]['Status'].toLowerCase();
      if (rows[i]['Email'].toLowerCase() === email && rows[i]['Type'] === type &&
          (status === 'pending' || status === 'active')) {
        return { status: 'success', passId: rows[i]['Pass ID'], passStatus: status, existing: true };
      }
    }
    var passId = newId_('pass');
    var nowIso = new Date().toISOString();
    appendRow_(t, {
      'Pass ID': passId,
      'Created At': nowIso,
      'Type': type,
      'Status': 'pending',
      'First Name': firstName,
      'Last Name': lastName,
      'Email': email,
      'Phone': phone,
      'Dog Names': dogNames,
      'Sessions Total': CONFIG.PASS_TYPES[type].sessions,
      'Sessions Remaining': 0,
      'Period Start': '',
      'Notes': '',
      'Updated At': nowIso
    });
    return { status: 'success', passId: passId, passStatus: 'pending', existing: false };
  });

  if (!result.existing) {
    try {
      var notify = notifyEmail_();
      if (notify) {
        MailApp.sendEmail({
          to: notify,
          subject: 'New ' + CONFIG.BRAND + ' pass request: ' + CONFIG.PASS_TYPES[type].label,
          body: [
            'Pass request ' + result.passId + ' (' + CONFIG.PASS_TYPES[type].label + ')',
            'Customer: ' + unguard_(firstName) + ' ' + unguard_(lastName),
            'Email: ' + email,
            'Phone: ' + unguard_(phone),
            '',
            'It stays pending with zero sessions until you confirm payment and activate it:',
            siteUrl_() + '/admin/'
          ].join('\n'),
          name: CONFIG.BRAND
        });
      }
    } catch (notifyErr) {
      console.error('Pass request notice failed: ' + notifyErr);
    }
  }
  return result;
}

/** Public: balance lookup by email. Returns only type, status, and sessions remaining. */
function getPassStatus_(data) {
  rateLimit_('pass_status', 120, 3600);
  var email = requireEmail_(data && data.email);
  var rows = readRows_(table_(TABLES.PASSES));
  var passes = [];
  for (var i = 0; i < rows.length; i++) {
    var pass = passFromRow_(rows[i]);
    if (pass.email.toLowerCase() !== email) continue;
    if (pass.status === 'cancelled') continue;
    passes.push({ type: pass.type, status: pass.status, sessionsRemaining: pass.sessionsRemaining });
  }
  return { status: 'success', passes: passes };
}

function adminGetPasses_() {
  var rows = readRows_(table_(TABLES.PASSES));
  var passes = [];
  for (var i = 0; i < rows.length; i++) passes.push(passFromRow_(rows[i]));
  passes.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  return { status: 'success', passes: passes };
}

function adminSavePass_(data) {
  var p = (data.pass && typeof data.pass === 'object') ? data.pass : null;
  if (!p) throw apiError_('validation', 'Pass details are required.');
  var type = String(p.type || '');
  if (!Object.prototype.hasOwnProperty.call(CONFIG.PASS_TYPES, type)) throw apiError_('validation', 'Choose a pass type.');
  var status = String(p.status || '').toLowerCase();
  if (['pending', 'active', 'paused', 'cancelled'].indexOf(status) === -1) throw apiError_('validation', 'Invalid pass status.');
  var total = toInt_(p.sessionsTotal, -1);
  var remaining = toInt_(p.sessionsRemaining, -1);
  if (total < 0 || total > 100) throw apiError_('validation', 'Sessions total must be 0 to 100.');
  if (remaining < 0 || remaining > total) throw apiError_('validation', 'Sessions remaining must be between 0 and the total.');
  var periodStart = String(p.periodStart || '');
  if (periodStart && !isDate_(periodStart)) throw apiError_('validation', 'Period start must be a date (YYYY-MM-DD).');

  var fields = {
    'Type': type,
    'Status': status,
    'First Name': requireText_(p.firstName, 'First name', 1, 60),
    'Last Name': requireText_(p.lastName, 'Last name', 1, 60),
    'Email': requireEmail_(p.email),
    'Phone': cleanText_(p.phone, 25),
    'Dog Names': cleanText_(p.dogNames, 120),
    'Sessions Total': total,
    'Sessions Remaining': remaining,
    'Period Start': periodStart,
    'Notes': cleanText_(p.notes, 500),
    'Updated At': new Date().toISOString()
  };

  return withLock_(function () {
    var t = table_(TABLES.PASSES);
    var passId = String(p.passId || '');
    if (passId) {
      var row = findRow_(readRows_(t), 'Pass ID', passId);
      if (!row) throw apiError_('not_found', 'Pass not found.');
      updateRow_(t, row._row, fields);
      return { status: 'success', passId: passId };
    }
    passId = newId_('pass');
    fields['Pass ID'] = passId;
    fields['Created At'] = fields['Updated At'];
    appendRow_(t, fields);
    return { status: 'success', passId: passId };
  });
}

// ---------------------------------------------------------------------------
// Shop picks (links out to Amazon, Etsy, Printify, Shopify; no on-site checkout)
// ---------------------------------------------------------------------------

function shopItemFromRow_(row) {
  var source = (row['Source'] || 'other').toLowerCase();
  return {
    itemId: row['Item ID'],
    createdAt: row['Created At'],
    active: isTrue_(row['Active']),
    name: row['Name'],
    description: row['Description'],
    category: row['Category'],
    source: source,
    linkUrl: row['Link URL'],
    imageUrl: row['Image URL'],
    // Amazon's Associates policy does not allow a hand-entered price next to an Amazon link.
    priceText: source === 'amazon' ? '' : row['Price Text'],
    sortOrder: toInt_(row['Sort Order'], 100)
  };
}

function sortShopItems_(items) {
  items.sort(function (a, b) {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
  });
  return items;
}

function getShopItems_() {
  var rows = readRows_(table_(TABLES.SHOP));
  var items = [];
  for (var i = 0; i < rows.length; i++) {
    var item = shopItemFromRow_(rows[i]);
    if (!item.active || !isHttpsUrl_(item.linkUrl)) continue;
    items.push({
      itemId: item.itemId,
      name: item.name,
      description: item.description,
      category: item.category,
      source: item.source,
      linkUrl: item.linkUrl,
      imageUrl: (isHttpsUrl_(item.imageUrl) || /^\/assets\/[A-Za-z0-9._\-\/]+$/.test(item.imageUrl)) ? item.imageUrl : '',
      priceText: item.priceText
    });
  }
  return { status: 'success', items: sortShopItems_(items) };
}

function adminGetShopItems_() {
  var rows = readRows_(table_(TABLES.SHOP));
  var items = [];
  for (var i = 0; i < rows.length; i++) items.push(shopItemFromRow_(rows[i]));
  return { status: 'success', items: sortShopItems_(items) };
}

function adminSaveShopItem_(data) {
  var it = (data.item && typeof data.item === 'object') ? data.item : null;
  if (!it) throw apiError_('validation', 'Item details are required.');
  var source = String(it.source || '').toLowerCase();
  if (CONFIG.SHOP_SOURCES.indexOf(source) === -1) throw apiError_('validation', 'Choose where the item is sold.');
  var category = String(it.category || '');
  if (CONFIG.SHOP_CATEGORIES.indexOf(category) === -1) throw apiError_('validation', 'Choose a category.');
  var linkUrl = String(it.linkUrl || '').trim();
  if (!isHttpsUrl_(linkUrl)) throw apiError_('validation', 'The link must start with https://');
  var imageUrl = String(it.imageUrl || '').trim();
  if (imageUrl && !isHttpsUrl_(imageUrl) && !/^\/assets\/[A-Za-z0-9._\-\/]+$/.test(imageUrl)) {
    throw apiError_('validation', 'The image must be an https:// address or a file under /assets/.');
  }
  var sortOrder = toInt_(it.sortOrder, 100);
  if (sortOrder < 0 || sortOrder > 9999) sortOrder = 100;

  var fields = {
    'Active': it.active === true ? 'true' : 'false',
    'Name': requireText_(it.name, 'Name', 1, 100),
    'Description': cleanText_(it.description, 400),
    'Category': category,
    'Source': source,
    'Link URL': linkUrl,
    'Image URL': imageUrl,
    'Price Text': source === 'amazon' ? '' : cleanText_(it.priceText, 30),
    'Sort Order': sortOrder
  };

  return withLock_(function () {
    var t = table_(TABLES.SHOP);
    var itemId = String(it.itemId || '');
    if (itemId) {
      var row = findRow_(readRows_(t), 'Item ID', itemId);
      if (!row) throw apiError_('not_found', 'Item not found.');
      updateRow_(t, row._row, fields);
      return { status: 'success', itemId: itemId };
    }
    itemId = newId_('item');
    fields['Item ID'] = itemId;
    fields['Created At'] = new Date().toISOString();
    appendRow_(t, fields);
    return { status: 'success', itemId: itemId };
  });
}

function adminDeleteShopItem_(data) {
  var itemId = String(data.itemId || '');
  return withLock_(function () {
    var t = table_(TABLES.SHOP);
    var row = findRow_(readRows_(t), 'Item ID', itemId);
    if (!row) throw apiError_('not_found', 'Item not found.');
    t.sheet.deleteRow(row._row);
    return { status: 'success' };
  });
}

// ---------------------------------------------------------------------------
// Run-once helpers (select in the editor toolbar and click Run; not reachable from the web)
// ---------------------------------------------------------------------------

/** Creates the PupSwim tabs and triggers the Google permission prompts (Sheets and sending email). */
function setup() {
  table_(TABLES.SLOTS);
  table_(TABLES.BOOKINGS);
  table_(TABLES.WAIVERS);
  table_(TABLES.PASSES);
  table_(TABLES.SHOP);
  var remaining = MailApp.getRemainingDailyQuota();
  Logger.log('PupSwim tabs are ready in the spreadsheet named "' + spreadsheet_().getName() + '".');
  Logger.log('Admins: ' + adminAllowlist_().join(', '));
  Logger.log('Site URL used in emails: ' + siteUrl_());
  Logger.log('Email sends remaining today: ' + remaining);
}

/** Sends a test message to the first admin so you can confirm email delivery works. */
function sendTestEmail() {
  var to = adminAllowlist_()[0];
  MailApp.sendEmail({ to: to, subject: CONFIG.BRAND + ' backend test email', body: 'Email sending works.', name: CONFIG.BRAND });
  Logger.log('Test email sent to ' + to);
}

/** Signs out every admin session. Use if a sign-in link or device may have been exposed. */
function revokeAllAdminSessions() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var count = 0;
  for (var key in all) {
    if (Object.prototype.hasOwnProperty.call(all, key) && key.indexOf('sess_') === 0) {
      props.deleteProperty(key);
      count++;
    }
  }
  Logger.log('Revoked ' + count + ' admin session(s).');
}
