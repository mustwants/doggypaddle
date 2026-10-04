// File: tests/gas-mock.js
// Loads backend/Code.gs into a Node sandbox with stand-ins for the Google Apps Script services,
// so the backend logic can be tested without deploying to Google.
// This is a test tool only. Nothing in this file is deployed.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

class MockRange {
  constructor(sheet, row, col, numRows, numCols) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
    this.numRows = numRows;
    this.numCols = numCols;
  }
  getValues() {
    const out = [];
    for (let r = 0; r < this.numRows; r++) {
      const line = [];
      for (let c = 0; c < this.numCols; c++) {
        const rowData = this.sheet.cells[this.row - 1 + r] || [];
        const value = rowData[this.col - 1 + c];
        line.push(value === undefined ? '' : value);
      }
      out.push(line);
    }
    return out;
  }
  setValues(values) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numCols; c++) {
        this.sheet.write(this.row + r, this.col + c, values[r][c]);
      }
    }
    return this;
  }
  setValue(value) {
    this.sheet.write(this.row, this.col, value);
    return this;
  }
  setNumberFormat() { return this; }
  setFontWeight() { return this; }
}

class MockSheet {
  constructor(name, options) {
    this.name = name;
    this.cells = [];
    this.options = options;
    this.formulaWrites = [];
  }
  write(row, col, value) {
    while (this.cells.length < row) this.cells.push([]);
    let stored = value;
    if (typeof stored === 'string') {
      // Real Sheets turns a string that starts with "=" into a live formula. Record any attempt.
      if (/^=/.test(stored)) this.formulaWrites.push({ row, col, value: stored });
      // Real Sheets may consume a leading apostrophe as a "treat as text" marker. Both behaviors are tested.
      if (this.options.apostropheMode === 'strip' && stored.charAt(0) === "'") stored = stored.substring(1);
    }
    this.cells[row - 1][col - 1] = stored;
  }
  getMaxRows() { return 1000; }
  getLastRow() {
    for (let r = this.cells.length - 1; r >= 0; r--) {
      if ((this.cells[r] || []).some((v) => v !== undefined && v !== '')) return r + 1;
    }
    return 0;
  }
  getLastColumn() {
    let max = 0;
    for (const row of this.cells) {
      for (let c = (row || []).length - 1; c >= 0; c--) {
        if (row[c] !== undefined && row[c] !== '') { max = Math.max(max, c + 1); break; }
      }
    }
    return max;
  }
  getRange(row, col, numRows, numCols) {
    return new MockRange(this, row, col, numRows || 1, numCols || 1);
  }
  setFrozenRows() {}
  deleteRow(row) { this.cells.splice(row - 1, 1); }
}

function formatDateInZone(date, timeZone, pattern) {
  const parts = {};
  new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).forEach((p) => { parts[p.type] = p.value; });
  return pattern
    .replace('yyyy', parts.year)
    .replace('MM', parts.month)
    .replace('dd', parts.day)
    .replace('HH', parts.hour)
    .replace('mm', parts.minute)
    .replace('ss', parts.second);
}

function createBackend(options) {
  const opts = Object.assign({ apostropheMode: 'keep' }, options || {});
  const sheets = new Map();
  const properties = new Map();
  const cache = new Map();
  const outbox = [];
  const logs = [];
  let failMail = false;

  const spreadsheet = {
    getName: () => 'Mock PupSwim Sheet',
    getSheetByName: (name) => sheets.get(name) || null,
    insertSheet: (name) => {
      if ([...sheets.keys()].some((k) => k.toLowerCase() === name.toLowerCase())) {
        throw new Error('A sheet with the name "' + name + '" already exists.');
      }
      const sheet = new MockSheet(name, opts);
      sheets.set(name, sheet);
      return sheet;
    }
  };

  const sandbox = {
    console: {
      log: (...args) => logs.push(args.join(' ')),
      error: (...args) => logs.push('ERROR ' + args.join(' ')),
      warn: (...args) => logs.push('WARN ' + args.join(' '))
    },
    Logger: { log: (msg) => logs.push(String(msg)) },
    SpreadsheetApp: { openById: () => spreadsheet },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => (properties.has(key) ? properties.get(key) : null),
        setProperty: (key, value) => { properties.set(key, String(value)); },
        deleteProperty: (key) => { properties.delete(key); },
        getProperties: () => Object.fromEntries(properties)
      })
    },
    CacheService: {
      getScriptCache: () => ({
        get: (key) => {
          const entry = cache.get(key);
          if (!entry) return null;
          if (Date.now() >= entry.expires) { cache.delete(key); return null; }
          return entry.value;
        },
        put: (key, value, ttlSeconds) => {
          cache.set(key, { value: String(value), expires: Date.now() + (ttlSeconds || 600) * 1000 });
        },
        remove: (key) => { cache.delete(key); }
      })
    },
    LockService: {
      getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} })
    },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      DigestAlgorithm: { SHA_256: 'sha256' },
      Charset: { UTF_8: 'utf8' },
      computeDigest: (algorithm, value) => {
        const digest = crypto.createHash('sha256').update(String(value), 'utf8').digest();
        return Array.from(digest).map((b) => (b > 127 ? b - 256 : b)); // signed bytes, like Apps Script
      },
      formatDate: formatDateInZone
    },
    MailApp: {
      sendEmail: (message) => {
        if (failMail) throw new Error('Service invoked too many times for one day: email.');
        outbox.push(message);
      },
      getRemainingDailyQuota: () => 100
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text) => {
        const output = {
          content: String(text),
          mimeType: 'text/plain',
          setMimeType(type) { this.mimeType = type; return this; },
          getContent() { return this.content; }
        };
        return output;
      }
    }
  };

  vm.createContext(sandbox);
  const source = fs.readFileSync(path.join(__dirname, '..', 'backend', 'Code.gs'), 'utf8');
  vm.runInContext(source, sandbox, { filename: 'Code.gs' });

  function parse(output) {
    if (!output || output.mimeType !== 'application/json') {
      throw new Error('Backend did not return JSON output');
    }
    return JSON.parse(output.getContent());
  }

  return {
    sandbox,
    sheets,
    properties,
    cache,
    outbox,
    logs,
    setMailFailure(value) { failMail = value; },
    get(params) { return parse(sandbox.doGet({ parameter: params || {} })); },
    post(body) { return parse(sandbox.doPost({ postData: { contents: JSON.stringify(body) } })); },
    postRaw(contents) { return parse(sandbox.doPost({ postData: { contents } })); },
    sheet(name) { return sheets.get(name); },
    /** Rows of a tab as objects keyed by header (as stored, without un-guarding). */
    rows(name) {
      const sheet = sheets.get(name);
      if (!sheet) return [];
      const headers = sheet.cells[0] || [];
      return sheet.cells.slice(1).map((row) => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i] === undefined ? '' : row[i]; });
        return obj;
      });
    },
    /** Signs in as an admin by running the real request/complete flow and reading the emailed link. */
    signIn(email) {
      const before = outbox.length;
      const requested = this.post({ action: 'requestAdminLogin', email });
      if (requested.status !== 'success') throw new Error('requestAdminLogin failed: ' + requested.message);
      if (outbox.length === before) return null;
      const match = /#login=([a-f0-9]{64})/.exec(outbox[outbox.length - 1].body);
      const done = this.post({ action: 'completeAdminLogin', token: match[1] });
      return done.status === 'success' ? done.adminToken : null;
    }
  };
}

module.exports = { createBackend, formatDateInZone };
