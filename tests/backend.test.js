// File: tests/backend.test.js
// Run with: npm test
// Exercises backend/Code.gs through its real doGet/doPost entry points using tests/gas-mock.js.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createBackend, formatDateInZone } = require('./gas-mock');

const TZ = 'America/New_York';
const ADMIN = 'scott@mustwants.com';
const dayOffset = (days) => formatDateInZone(new Date(Date.now() + days * 86400000), TZ, 'yyyy-MM-dd');
const TOMORROW = dayOffset(1);
const YESTERDAY = dayOffset(-1);

// A small valid PNG data URL standing in for a drawn signature.
const SIGNATURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const ADMIN_ACTIONS = [
  'adminWhoAmI', 'adminLogout', 'adminGetSlots', 'adminAddSlots', 'adminSetSlotStatus', 'adminDeleteSlots',
  'adminGetBookings', 'adminUpdateBooking', 'adminGetWaivers', 'adminGetWaiver', 'adminGetPasses',
  'adminSavePass', 'adminGetShopItems', 'adminSaveShopItem', 'adminDeleteShopItem'
];

function bookingInput(slotId, overrides) {
  return Object.assign({
    firstName: 'Dana', lastName: 'Reyes', email: 'dana@example.com', phone: '(904) 555-0142',
    dogNames: 'Remi', dogBreeds: 'Golden Retriever', numDogs: 1,
    ownershipConfirmed: true, waiverAck: true, slotId, usePass: false
  }, overrides || {});
}

function seedSlots(api, adminToken, slots) {
  const added = api.post({ action: 'adminAddSlots', adminToken, slots });
  assert.equal(added.status, 'success', added.message);
  return api.post({ action: 'adminGetSlots', adminToken }).slots;
}

for (const apostropheMode of ['keep', 'strip']) {
  test(`[apostrophe ${apostropheMode}] full booking lifecycle`, () => {
    const api = createBackend({ apostropheMode });
    const adminToken = api.signIn(ADMIN);
    assert.ok(adminToken, 'admin can sign in');

    const slots = seedSlots(api, adminToken, [
      { date: TOMORROW, time: '09:00', duration: 20 },
      { date: TOMORROW, time: '09:30', duration: 20 },
      { date: YESTERDAY, time: '09:00', duration: 20 }
    ]);
    assert.equal(slots.length, 3);

    const open = api.get({ action: 'getAvailableSlots' });
    assert.equal(open.status, 'success');
    assert.equal(open.slots.length, 2, 'past slot is hidden from the public list');
    assert.deepEqual(Object.keys(open.slots[0]).sort(), ['date', 'duration', 'id', 'time']);

    const slotId = open.slots[0].id;
    const mailBefore = api.outbox.length;
    const booked = api.post({ action: 'saveBooking', booking: bookingInput(slotId) });
    assert.equal(booked.status, 'success', booked.message);
    assert.equal(booked.paymentStatus, 'pending');
    assert.match(booked.bookingId, /^bk_[a-f0-9]{16}$/);
    assert.equal(api.outbox.length, mailBefore + 2, 'customer confirmation and admin notice are sent');
    assert.equal(api.outbox[mailBefore].to, 'dana@example.com');
    assert.equal(api.outbox[mailBefore].replyTo, 'pupswim@mustwants.com');

    const second = api.post({ action: 'saveBooking', booking: bookingInput(slotId, { email: 'other@example.com' }) });
    assert.equal(second.status, 'error');
    assert.equal(second.code, 'conflict', 'a booked slot cannot be booked twice');

    assert.equal(api.get({ action: 'getAvailableSlots' }).slots.length, 1);

    const bookings = api.post({ action: 'adminGetBookings', adminToken }).bookings;
    assert.equal(bookings.length, 1);
    assert.equal(bookings[0].firstName, 'Dana');
    assert.equal(bookings[0].phone, '(904) 555-0142');
    assert.equal(bookings[0].waiverOnFile, false);

    const paid = api.post({ action: 'adminUpdateBooking', adminToken, bookingId: booked.bookingId, paymentStatus: 'paid' });
    assert.equal(paid.status, 'success');
    assert.equal(api.post({ action: 'adminGetBookings', adminToken }).bookings[0].paymentStatus, 'paid');

    const cancelled = api.post({ action: 'adminUpdateBooking', adminToken, bookingId: booked.bookingId, bookingStatus: 'cancelled' });
    assert.equal(cancelled.status, 'success');
    assert.equal(api.get({ action: 'getAvailableSlots' }).slots.length, 2, 'cancelling frees the slot');
  });

  test(`[apostrophe ${apostropheMode}] spreadsheet formula injection is neutralized`, () => {
    const api = createBackend({ apostropheMode });
    const adminToken = api.signIn(ADMIN);
    const slots = seedSlots(api, adminToken, [{ date: TOMORROW, time: '10:00', duration: 20 }]);
    const evil = '=HYPERLINK("https://evil.example","x")';
    const booked = api.post({
      action: 'saveBooking',
      booking: bookingInput(slots[0].id, { firstName: evil, lastName: '+SUM(1,1)', dogNames: '@cmd', dogBreeds: '-1+1' })
    });
    assert.equal(booked.status, 'success', booked.message);
    for (const sheet of api.sheets.values()) {
      assert.deepEqual(sheet.formulaWrites, [], `no cell in "${sheet.name}" was written starting with "="`);
    }
    const stored = api.rows('PupSwim Bookings')[0];
    for (const column of ['First Name', 'Last Name', 'Dog Names', 'Dog Breeds']) {
      if (apostropheMode === 'keep') assert.equal(String(stored[column]).charAt(0), "'", `${column} is stored with a text guard`);
    }
    const seen = api.post({ action: 'adminGetBookings', adminToken }).bookings[0];
    if (apostropheMode === 'keep') {
      assert.equal(seen.firstName, evil, 'admin sees the original text');
      assert.equal(seen.lastName, '+SUM(1,1)');
    }
  });
}

test('GET exposes only public read actions and always returns JSON', () => {
  const api = createBackend();
  assert.equal(api.get({ action: 'ping' }).status, 'success');
  assert.equal(api.get({}).code, 'unknown_action');
  for (const action of [...ADMIN_ACTIONS, 'saveBooking', 'getPassStatus', 'constructor', '__proto__', 'toString', 'hasOwnProperty']) {
    const result = api.get({ action });
    assert.equal(result.status, 'error', `GET ${action} is refused`);
    assert.equal(result.code, 'unknown_action');
  }
});

test('every admin action is refused without a valid session token', () => {
  const api = createBackend();
  const realToken = api.signIn(ADMIN);
  seedSlots(api, realToken, [{ date: TOMORROW, time: '11:00', duration: 20 }]);
  const before = JSON.stringify([...api.sheets.values()].map((s) => s.cells));

  const badTokens = [undefined, null, '', 'admin', 'true', 123, {}, ['x'], 'a'.repeat(64), realToken.slice(0, 63), realToken + '0'];
  for (const action of ADMIN_ACTIONS) {
    for (const adminToken of badTokens) {
      const result = api.post({
        action, adminToken,
        slots: [{ date: TOMORROW, time: '12:00', duration: 20 }],
        slotIds: ['x'], slotId: 'x', slotStatus: 'blocked', bookingId: 'x', paymentStatus: 'paid',
        waiverId: 'x', itemId: 'x',
        pass: { type: 'pack5', status: 'active', firstName: 'A', lastName: 'B', email: 'a@b.co', sessionsTotal: 5, sessionsRemaining: 5 },
        item: { name: 'x', source: 'amazon', category: 'Toys', linkUrl: 'https://example.com', active: true }
      });
      assert.equal(result.status, 'error', `${action} with token ${JSON.stringify(adminToken)} is refused`);
      assert.equal(result.code, 'unauthorized');
    }
  }
  const after = JSON.stringify([...api.sheets.values()].map((s) => s.cells));
  assert.equal(after, before, 'refused admin calls change nothing');

  // Old client-side tricks carry no weight on the server.
  const spoofed = api.post({ action: 'adminGetBookings', admin: true, isAdmin: 'true', email: ADMIN });
  assert.equal(spoofed.code, 'unauthorized');
});

test('admin sign-in: allowlist, single use, expiry, logout', () => {
  const api = createBackend();

  const stranger = api.post({ action: 'requestAdminLogin', email: 'attacker@example.com' });
  const insider = api.post({ action: 'requestAdminLogin', email: ADMIN });
  assert.deepEqual(stranger, insider, 'response does not reveal whether the address is an admin');
  assert.equal(api.outbox.length, 1, 'only the allowlisted address receives a link');
  assert.equal(api.outbox[0].to, ADMIN);
  assert.match(api.outbox[0].body, /https:\/\/pupswim\.com\/admin\/#login=[a-f0-9]{64}/);

  const token = /#login=([a-f0-9]{64})/.exec(api.outbox[0].body)[1];
  assert.equal(api.post({ action: 'completeAdminLogin', token: 'f'.repeat(64) }).code, 'unauthorized');
  const first = api.post({ action: 'completeAdminLogin', token });
  assert.equal(first.status, 'success');
  assert.match(first.adminToken, /^[a-f0-9]{64}$/);
  assert.notEqual(first.adminToken, token);
  assert.equal(api.post({ action: 'completeAdminLogin', token }).code, 'unauthorized', 'link works once');

  assert.equal(api.post({ action: 'adminWhoAmI', adminToken: first.adminToken }).email, ADMIN);
  assert.equal(api.post({ action: 'adminWhoAmI', adminToken: token }).code, 'unauthorized', 'the emailed token is not a session');

  // Tokens are stored only as hashes.
  for (const [key, value] of api.properties) {
    assert.ok(!key.includes(first.adminToken) && !String(value).includes(first.adminToken), 'session token is not stored in clear');
  }

  // Expired session.
  const key = [...api.properties.keys()].find((k) => k.startsWith('sess_'));
  api.properties.set(key, JSON.stringify({ email: ADMIN, expiresAt: Date.now() - 1000 }));
  assert.equal(api.post({ action: 'adminWhoAmI', adminToken: first.adminToken }).code, 'unauthorized');

  // Logout.
  const token2 = api.signIn(ADMIN);
  assert.equal(api.post({ action: 'adminLogout', adminToken: token2 }).status, 'success');
  assert.equal(api.post({ action: 'adminWhoAmI', adminToken: token2 }).code, 'unauthorized');

  // Removed from the allowlist while signed in.
  const token3 = api.signIn(ADMIN);
  api.properties.set('ADMIN_ALLOWLIST', 'someoneelse@example.com');
  assert.equal(api.post({ action: 'adminWhoAmI', adminToken: token3 }).code, 'unauthorized');
});

test('sign-in requests are rate limited per address', () => {
  const api = createBackend();
  for (let i = 0; i < 8; i++) api.post({ action: 'requestAdminLogin', email: ADMIN });
  assert.equal(api.outbox.length, 5, 'at most 5 links per hour to one address');
});

test('booking validation, bot trap, and safe retry', () => {
  const api = createBackend();
  const adminToken = api.signIn(ADMIN);
  const slots = seedSlots(api, adminToken, [
    { date: TOMORROW, time: '13:00', duration: 20 },
    { date: YESTERDAY, time: '13:00', duration: 20 }
  ]);
  const future = slots.find((s) => s.date === TOMORROW);
  const past = slots.find((s) => s.date === YESTERDAY);

  const cases = [
    [{ email: 'not-an-email' }, 'validation'],
    [{ phone: '12' }, 'validation'],
    [{ numDogs: 3 }, 'validation'],
    [{ numDogs: 0 }, 'validation'],
    [{ ownershipConfirmed: false }, 'validation'],
    [{ waiverAck: 'true' }, 'validation'],
    [{ firstName: '   ' }, 'validation'],
    [{ slotId: 'does-not-exist' }, 'conflict'],
    [{ slotId: past.id }, 'conflict'],
    [{ usePass: true }, 'no_pass']
  ];
  for (const [override, code] of cases) {
    const result = api.post({ action: 'saveBooking', booking: bookingInput(future.id, override) });
    assert.equal(result.code, code, JSON.stringify(override));
  }
  assert.equal(api.rows('PupSwim Bookings').length, 0, 'rejected bookings write nothing');

  const bot = api.post({ action: 'saveBooking', website: 'http://spam.example', booking: bookingInput(future.id) });
  assert.equal(bot.status, 'success');
  assert.equal(bot.bookingId, '');
  assert.equal(api.rows('PupSwim Bookings').length, 0, 'bot submissions are dropped');

  const requestId = '0b1d5a52-7f0e-4c0e-9c57-5d1d9f6f7a10';
  const first = api.post({ action: 'saveBooking', booking: bookingInput(future.id, { requestId }) });
  const mailCount = api.outbox.length;
  const retry = api.post({ action: 'saveBooking', booking: bookingInput(future.id, { requestId }) });
  assert.equal(first.status, 'success');
  assert.equal(retry.status, 'success');
  assert.equal(retry.bookingId, first.bookingId, 'a retried request returns the same booking');
  assert.equal(api.rows('PupSwim Bookings').length, 1);
  assert.equal(api.outbox.length, mailCount, 'a retry does not send emails again');

  const hijack = api.post({ action: 'saveBooking', booking: bookingInput(future.id, { requestId, email: 'thief@example.com' }) });
  assert.equal(hijack.code, 'conflict', 'a request id only matches for the same email');
});

test('a mail outage does not lose the booking', () => {
  const api = createBackend();
  const adminToken = api.signIn(ADMIN);
  const slots = seedSlots(api, adminToken, [{ date: TOMORROW, time: '14:00', duration: 20 }]);
  api.setMailFailure(true);
  const booked = api.post({ action: 'saveBooking', booking: bookingInput(slots[0].id) });
  assert.equal(booked.status, 'success');
  assert.equal(api.rows('PupSwim Bookings').length, 1);
});

test('passes: pending until an admin activates, then sessions are deducted and restored', () => {
  const api = createBackend();
  const adminToken = api.signIn(ADMIN);
  const slots = seedSlots(api, adminToken, [
    { date: TOMORROW, time: '15:00', duration: 20 },
    { date: TOMORROW, time: '15:30', duration: 20 }
  ]);
  const person = { firstName: 'Lee', lastName: 'Park', email: 'Lee@Example.com', phone: '904-555-0199', dogNames: 'Biscuit' };

  const requested = api.post({ action: 'requestPass', pass: Object.assign({ type: 'pack5', status: 'active', sessionsRemaining: 99 }, person) });
  assert.equal(requested.status, 'success');
  assert.equal(requested.passStatus, 'pending');
  const again = api.post({ action: 'requestPass', pass: Object.assign({ type: 'pack5' }, person) });
  assert.equal(again.passId, requested.passId, 'duplicate requests reuse the pending pass');
  assert.equal(api.post({ action: 'requestPass', pass: Object.assign({ type: 'gold' }, person) }).code, 'validation');

  let balance = api.post({ action: 'getPassStatus', email: 'lee@example.com' });
  assert.deepEqual(balance.passes, [{ type: 'pack5', status: 'pending', sessionsRemaining: 0 }],
    'a public request can never create an active pass or grant sessions');

  const early = api.post({ action: 'saveBooking', booking: bookingInput(slots[0].id, { email: 'lee@example.com', usePass: true }) });
  assert.equal(early.code, 'no_pass', 'a pending pass cannot pay for a booking');

  const stored = api.post({ action: 'adminGetPasses', adminToken }).passes[0];
  const activated = api.post({
    action: 'adminSavePass', adminToken,
    pass: Object.assign({}, stored, { status: 'active', sessionsRemaining: 5, periodStart: dayOffset(0) })
  });
  assert.equal(activated.status, 'success', activated.message);

  const booked = api.post({ action: 'saveBooking', booking: bookingInput(slots[0].id, { email: 'lee@example.com', usePass: true }) });
  assert.equal(booked.status, 'success', booked.message);
  assert.equal(booked.paymentStatus, 'pass');
  assert.equal(booked.sessionsRemaining, 4);

  balance = api.post({ action: 'getPassStatus', email: 'lee@example.com' });
  assert.deepEqual(balance.passes, [{ type: 'pack5', status: 'active', sessionsRemaining: 4 }]);
  assert.deepEqual(Object.keys(balance.passes[0]).sort(), ['sessionsRemaining', 'status', 'type'], 'no personal details in the balance lookup');

  api.post({ action: 'adminUpdateBooking', adminToken, bookingId: booked.bookingId, bookingStatus: 'cancelled' });
  balance = api.post({ action: 'getPassStatus', email: 'lee@example.com' });
  assert.equal(balance.passes[0].sessionsRemaining, 5, 'cancelling returns the session');

  assert.equal(api.post({ action: 'adminSavePass', adminToken, pass: Object.assign({}, stored, { status: 'active', sessionsRemaining: 9 }) }).code, 'validation');
});

test('waivers: validation, storage, and admin-only access to signatures', () => {
  const api = createBackend();
  const adminToken = api.signIn(ADMIN);
  const waiver = {
    fullName: 'Dana Reyes', email: 'dana@example.com', date: dayOffset(0),
    initials: ['DR', 'DR', 'DR', 'DR', 'DR'], ackRead: true, ackRights: true, ackVoluntary: true,
    signature: SIGNATURE, version: '2026-10', userAgent: 'test'
  };
  const bad = [
    { signature: '' },
    { signature: 'data:text/html;base64,PHNjcmlwdD4=' },
    { signature: 'data:image/png;base64,' + 'A'.repeat(46000) },
    { initials: ['DR', 'DR', 'DR', 'DR'] },
    { initials: ['DR', 'DR', '=1', 'DR', 'DR'] },
    { ackRights: false },
    { date: '10/03/2026' },
    { email: 'nope' }
  ];
  for (const override of bad) {
    assert.equal(api.post({ action: 'saveWaiver', waiver: Object.assign({}, waiver, override) }).code, 'validation', JSON.stringify(override).slice(0, 60));
  }
  assert.equal(api.rows('PupSwim Waivers').length, 0);

  const saved = api.post({ action: 'saveWaiver', waiver });
  assert.equal(saved.status, 'success', saved.message);
  const list = api.post({ action: 'adminGetWaivers', adminToken }).waivers;
  assert.equal(list.length, 1);
  assert.equal(list[0].signature, undefined, 'the list does not carry signature images');
  const full = api.post({ action: 'adminGetWaiver', adminToken, waiverId: saved.waiverId }).waiver;
  assert.equal(full.signature, SIGNATURE);

  const slots = seedSlots(api, adminToken, [{ date: TOMORROW, time: '16:00', duration: 20 }]);
  api.post({ action: 'saveBooking', booking: bookingInput(slots[0].id) });
  assert.equal(api.post({ action: 'adminGetBookings', adminToken }).bookings[0].waiverOnFile, true);
});

test('shop picks: only active https links are public; Amazon items never carry a typed price', () => {
  const api = createBackend();
  const adminToken = api.signIn(ADMIN);
  const base = { name: 'Float vest', description: 'Bright vest', category: 'Safety', source: 'amazon', linkUrl: 'https://www.amazon.com/dp/EXAMPLE', imageUrl: '', priceText: '$29.99', active: true, sortOrder: 1 };

  for (const linkUrl of ['javascript:alert(1)', 'http://example.com', 'https://exa mple.com', 'https://example.com/"onmouseover="x']) {
    assert.equal(api.post({ action: 'adminSaveShopItem', adminToken, item: Object.assign({}, base, { linkUrl }) }).code, 'validation', linkUrl);
  }
  assert.equal(api.post({ action: 'adminSaveShopItem', adminToken, item: Object.assign({}, base, { imageUrl: 'javascript:alert(1)' }) }).code, 'validation');
  assert.equal(api.post({ action: 'adminSaveShopItem', adminToken, item: Object.assign({}, base, { source: 'ebay' }) }).code, 'validation');

  const amazon = api.post({ action: 'adminSaveShopItem', adminToken, item: base });
  assert.equal(amazon.status, 'success', amazon.message);
  api.post({ action: 'adminSaveShopItem', adminToken, item: Object.assign({}, base, { name: 'Hidden', active: false }) });
  api.post({ action: 'adminSaveShopItem', adminToken, item: Object.assign({}, base, { name: 'Logo tee', source: 'printify', category: 'Merch', priceText: '$24', sortOrder: 2 }) });

  const pub = api.get({ action: 'getShopItems' }).items;
  assert.deepEqual(pub.map((i) => i.name), ['Float vest', 'Logo tee']);
  assert.equal(pub[0].priceText, '', 'no hand-typed price on an Amazon item');
  assert.equal(pub[1].priceText, '$24');
  assert.equal(pub[0].active, undefined);

  assert.equal(api.post({ action: 'adminGetShopItems', adminToken }).items.length, 3);
  assert.equal(api.post({ action: 'adminDeleteShopItem', adminToken, itemId: amazon.itemId }).status, 'success');
  assert.equal(api.get({ action: 'getShopItems' }).items.length, 1);
});

test('slot management rules', () => {
  const api = createBackend();
  const adminToken = api.signIn(ADMIN);
  const first = api.post({ action: 'adminAddSlots', adminToken, slots: [{ date: TOMORROW, time: '08:00' }, { date: TOMORROW, time: '08:00' }, { date: TOMORROW, time: '08:30', duration: 30 }] });
  assert.deepEqual({ added: first.added, skipped: first.skipped }, { added: 2, skipped: 1 });
  assert.equal(api.post({ action: 'adminAddSlots', adminToken, slots: [{ date: '2026-02-30', time: '08:00' }] }).code, 'validation');
  assert.equal(api.post({ action: 'adminAddSlots', adminToken, slots: [{ date: TOMORROW, time: '8am' }] }).code, 'validation');
  assert.equal(api.post({ action: 'adminAddSlots', adminToken, slots: [{ date: TOMORROW, time: '08:45', duration: 500 }] }).code, 'validation');

  const slots = api.post({ action: 'adminGetSlots', adminToken }).slots;
  assert.equal(slots[0].duration, 20, 'default duration');
  assert.equal(slots[1].duration, 30);

  assert.equal(api.post({ action: 'adminSetSlotStatus', adminToken, slotId: slots[0].id, slotStatus: 'blocked' }).status, 'success');
  assert.equal(api.get({ action: 'getAvailableSlots' }).slots.length, 1, 'blocked slots are not public');
  assert.equal(api.post({ action: 'saveBooking', booking: bookingInput(slots[0].id) }).code, 'conflict', 'blocked slots cannot be booked');

  api.post({ action: 'saveBooking', booking: bookingInput(slots[1].id) });
  assert.equal(api.post({ action: 'adminSetSlotStatus', adminToken, slotId: slots[1].id, slotStatus: 'available' }).code, 'conflict');
  const deleted = api.post({ action: 'adminDeleteSlots', adminToken, slotIds: slots.map((s) => s.id) });
  assert.deepEqual({ deleted: deleted.deleted, keptBooked: deleted.keptBooked }, { deleted: 1, keptBooked: 1 }, 'booked slots are never deleted');
});

test('cells that Google Sheets converted to real dates and times are read correctly', () => {
  const api = createBackend();
  const adminToken = api.signIn(ADMIN);
  seedSlots(api, adminToken, [{ date: TOMORROW, time: '09:00', duration: 20 }]);
  const sheet = api.sheet('PupSwim Slots');
  const [y, m, d] = TOMORROW.split('-').map(Number);
  // What Sheets stores if someone types a date and a time by hand: Date objects (time on 1899-12-30).
  sheet.cells[1][1] = new Date(Date.UTC(y, m - 1, d, 5, 0, 0));
  sheet.cells[1][2] = new Date(Date.UTC(1899, 11, 30, 14, 0, 0));
  const open = api.get({ action: 'getAvailableSlots' }).slots;
  assert.equal(open.length, 1);
  assert.equal(open[0].date, TOMORROW);
  assert.match(open[0].time, /^\d{2}:\d{2}$/);
});

test('legacy tabs from the old site are left untouched', () => {
  const api = createBackend();
  const legacy = api.sandbox.SpreadsheetApp.openById('x').insertSheet('available_slots');
  legacy.cells = [['Date', 'Time', 'Status'], ['2025-11-22', '09:00', 'available']];
  const legacyBookings = api.sandbox.SpreadsheetApp.openById('x').insertSheet('bookings');
  legacyBookings.cells = [['Something', 'Else']];
  const snapshot = JSON.stringify([legacy.cells, legacyBookings.cells]);

  const adminToken = api.signIn(ADMIN);
  const slots = seedSlots(api, adminToken, [{ date: TOMORROW, time: '09:00', duration: 20 }]);
  api.post({ action: 'saveBooking', booking: bookingInput(slots[0].id) });
  assert.equal(JSON.stringify([legacy.cells, legacyBookings.cells]), snapshot);
  assert.equal(api.get({ action: 'getAvailableSlots' }).slots.length, 0, 'old test slots are not offered for booking');
});

test('malformed requests get a JSON error, not a crash', () => {
  const api = createBackend();
  assert.equal(api.postRaw('not json').code, 'bad_request');
  assert.equal(api.postRaw('[1,2,3]').code, 'bad_request');
  assert.equal(api.postRaw('null').code, 'bad_request');
  assert.equal(api.post({ action: 'saveBooking' }).code, 'validation');
  assert.equal(api.post({ action: 'saveBooking', booking: 'x' }).code, 'validation');
  assert.equal(api.post({ action: 'constructor' }).code, 'unknown_action');
  assert.equal(api.post({ action: '__proto__' }).code, 'unknown_action');
  assert.equal(api.post({}).code, 'unknown_action');
  const empty = JSON.parse(api.sandbox.doPost({}).getContent());
  assert.equal(empty.code, 'bad_request');
  const noEvent = JSON.parse(api.sandbox.doGet(undefined).getContent());
  assert.equal(noEvent.code, 'unknown_action');
});

test('an unexpected internal error is reported generically', () => {
  const api = createBackend();
  api.sandbox.SpreadsheetApp.openById = () => { throw new Error('secret internal detail'); };
  const result = api.get({ action: 'getAvailableSlots' });
  assert.equal(result.code, 'server_error');
  assert.ok(!JSON.stringify(result).includes('secret internal detail'));
});
