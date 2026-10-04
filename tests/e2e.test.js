// File: tests/e2e.test.js
// Browser test of the whole site against the local preview server (tests/dev-server.js).
// Needs Playwright with Chromium installed. Run with: npm run test:e2e
// Nothing here talks to Google, Netlify, or Stripe.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { startServer } = require('./dev-server');
const { formatDateInZone } = require('./gas-mock');

const ADMIN = 'scott@mustwants.com';
const PORT = 8797;

test('PupSwim site end to end', async (t) => {
  const { server, backend, origin } = await startServer(PORT, { quiet: true });
  const browser = await chromium.launch(process.env.PUPSWIM_CHROMIUM ? { executablePath: process.env.PUPSWIM_CHROMIUM } : {});
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();

  const problems = [];
  const dialogs = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('dialog', async (d) => { dialogs.push(d.message()); await d.accept(); });

  const post = (body) => backend.post(body);
  const tomorrow = formatDateInZone(new Date(Date.now() + 86400000), 'America/New_York', 'yyyy-MM-dd');

  t.after(async () => {
    await browser.close();
    server.close();
  });

  await t.test('public pages load cleanly under the production security policy', async () => {
    for (const path of ['/', '/book/', '/club/', '/shop/', '/waiver/', '/admin/']) {
      const response = await page.goto(origin + path, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200, path);
      assert.match(await page.title(), /PupSwim/, path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      assert.equal(overflow, false, path + ' has no sideways scroll');
    }
    assert.deepEqual(problems, [], 'no console errors or blocked resources');

    // An unknown address returns the 404 page (the browser logs that 404 itself, so clear it).
    const missing = await page.goto(origin + '/no-such-page', { waitUntil: 'networkidle' });
    assert.equal(missing.status(), 404);
    assert.match(await page.locator('h1').innerText(), /swam off/);
    problems.length = 0;

    await page.goto(origin + '/', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('h1').innerText(), 'Rent a private pool for your dog');
    const text = await page.locator('body').innerText();
    assert.ok(!/doggy\s?paddle|dog\s?paddle/i.test(text), 'old brand name is gone');
    const gift = page.locator('[data-stripe-link="giftCard"]');
    assert.equal(await gift.innerText(), 'Email Us to Buy');
    assert.match(await gift.getAttribute('href'), /^mailto:pupswim@mustwants\.com/);
  });

  await t.test('booking page shows the empty state when no times are posted', async () => {
    await page.goto(origin + '/book/', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('#slots-empty').isVisible(), true);
  });

  await t.test('admin: sign in by emailed link and add time slots', async () => {
    await page.goto(origin + '/admin/', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('#login-view').isVisible(), true);
    assert.equal(await page.locator('#dash-view').isVisible(), false);

    // A forged session value does not open the dashboard.
    await page.evaluate(() => window.sessionStorage.setItem('pupswim_admin_session', 'a'.repeat(64)));
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('#dash-view').isVisible(), false);
    assert.equal(await page.locator('#login-view').isVisible(), true);

    await page.fill('#login-email', 'stranger@example.com');
    await page.click('#login-submit');
    await page.waitForSelector('#login-notice:not([hidden])');
    assert.equal(backend.outbox.length, 0, 'no link for a non-admin');

    await page.fill('#login-email', ADMIN);
    await page.click('#login-submit');
    await page.waitForFunction(() => document.getElementById('login-submit').disabled === false);
    assert.equal(backend.outbox.length, 1);
    const link = /http:\/\/localhost:\d+\/admin\/#login=[a-f0-9]{64}/.exec(backend.outbox[0].body)[0];

    await page.goto(link, { waitUntil: 'networkidle' });
    await page.waitForSelector('#dash-view:not([hidden])');
    assert.equal(page.url(), origin + '/admin/', 'the one-time token is removed from the address bar');
    assert.equal(await page.locator('#admin-email').innerText(), ADMIN);

    await page.click('#tab-slots');
    await page.fill('#slot-start', tomorrow);
    await page.fill('#slot-end', tomorrow);
    await page.fill('#slot-first', '09:00');
    await page.fill('#slot-last', '10:00');
    await page.click('#slot-submit');
    await page.waitForSelector('#slots-table table');
    assert.equal(await page.locator('#slots-table tbody tr').count(), 3);
    assert.ok(dialogs.some((d) => /Add 3 open time slot/.test(d)));
  });

  let bookingId = '';

  await t.test('customer: reserve a slot, get the payment link and calendar file', async () => {
    const visitor = await context.browser().newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    const mobile = await visitor.newPage();
    const mobileProblems = [];
    mobile.on('console', (m) => { if (m.type() === 'error') mobileProblems.push(m.text()); });
    mobile.on('pageerror', (e) => mobileProblems.push(e.message));

    await mobile.goto(origin + '/', { waitUntil: 'networkidle' });
    assert.equal(await mobile.locator('#site-nav').isVisible(), false, 'menu is collapsed on a phone');
    await mobile.click('.nav-toggle');
    assert.equal(await mobile.locator('#site-nav').isVisible(), true);
    await mobile.click('#site-nav a[href="/book/"]');
    await mobile.waitForSelector('#slots-picker:not([hidden])');
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false);
    const sticksOut = await mobile.evaluate(() => Array.from(document.querySelectorAll('fieldset, .card, form, .summary'))
      .filter((node) => node.getBoundingClientRect().right > window.innerWidth + 1).length);
    assert.equal(sticksOut, 0, 'no form section is wider than a phone screen');

    assert.equal(await mobile.locator('.slot-btn').count(), 3);
    await mobile.fill('#firstName', '<img src=x onerror=alert(1)>');
    await mobile.fill('#lastName', 'Reyes');
    await mobile.fill('#email', 'dana@example.com');
    await mobile.fill('#phone', '(904) 555-0142');
    await mobile.fill('#dogNames', 'Remi');
    await mobile.fill('#dogBreeds', 'Golden Retriever');
    await mobile.check('#ownershipConfirmed');
    await mobile.check('#waiverAck');

    // Everything filled in but no time chosen: the form explains what is missing.
    await mobile.click('#book-submit');
    assert.match(await mobile.locator('#book-notice').innerText(), /Choose a day and a start time/);
    assert.equal(backend.rows('PupSwim Bookings').length, 0);

    await mobile.locator('.slot-btn').first().click();
    assert.match(await mobile.locator('#summary-when').innerText(), /9:00 AM Eastern/);
    await mobile.click('#book-submit');
    await mobile.waitForSelector('#booking-done:not([hidden])');

    bookingId = await mobile.locator('#done-ref').innerText();
    assert.match(bookingId, /^bk_[a-f0-9]{16}$/);
    const payHref = await mobile.locator('#done-pay-btn').getAttribute('href');
    const payUrl = new URL(payHref);
    assert.equal(payUrl.origin + payUrl.pathname, 'https://buy.stripe.com/14AaEW1GV3vIgaK7fE5J60c');
    assert.equal(payUrl.searchParams.get('client_reference_id'), bookingId);
    assert.equal(payUrl.searchParams.get('prefilled_email'), 'dana@example.com');

    const [download] = await Promise.all([mobile.waitForEvent('download'), mobile.click('#done-ics')]);
    assert.equal(download.suggestedFilename(), 'pupswim-rental.ics');
    const ics = require('fs').readFileSync(await download.path(), 'utf8');
    assert.match(ics, /BEGIN:VEVENT/);
    assert.match(ics, new RegExp('UID:' + bookingId + '@pupswim\\.com'));
    const [y, m, d] = tomorrow.split('-');
    assert.match(ics, new RegExp('DTSTART:' + y + m + d + 'T1[34]0000Z'), '9:00 AM Eastern is 13:00 or 14:00 UTC');

    // The same slot can no longer be booked by someone else.
    const slotId = backend.rows('PupSwim Bookings')[0]['Slot ID'];
    const clash = post({ action: 'saveBooking', booking: { firstName: 'A', lastName: 'B', email: 'x@example.com', phone: '9045550100', dogNames: 'Z', dogBreeds: 'Y', numDogs: 1, ownershipConfirmed: true, waiverAck: true, slotId } });
    assert.equal(clash.code, 'conflict');

    assert.deepEqual(mobileProblems, []);
    await visitor.close();
  });

  await t.test('customer: sign the waiver', async () => {
    await page.goto(origin + '/waiver/', { waitUntil: 'networkidle' });
    assert.match(await page.locator('#waiver-text').innerText(), /Jointwerx LLC, PupSwim, and their respective owners/);
    for (let i = 1; i <= 5; i++) await page.fill('#initial-' + i, 'dr');
    await page.check('input[name="ackRead"]');
    await page.check('input[name="ackRights"]');
    await page.check('input[name="ackVoluntary"]');
    await page.fill('#fullName', 'Dana Reyes');
    await page.fill('#waiverEmail', 'dana@example.com');

    await page.click('#waiver-submit');
    assert.match(await page.locator('#waiver-notice').innerText(), /sign in the signature box/i);

    const box = await page.locator('#sig-pad').boundingBox();
    await page.mouse.move(box.x + 30, box.y + 90);
    await page.mouse.down();
    for (let i = 0; i < 20; i++) await page.mouse.move(box.x + 30 + i * 12, box.y + 90 + (i % 2 ? -30 : 30));
    await page.mouse.up();
    await page.click('#waiver-submit');
    await page.waitForSelector('#waiver-done:not([hidden])');
    assert.match(await page.locator('#waiver-ref').innerText(), /^wv_[a-f0-9]{16}$/);
    const stored = backend.rows('PupSwim Waivers')[0];
    assert.equal(stored['Initials 1'], 'DR');
    assert.match(stored['Signature'], /^data:image\/png;base64,/);
    assert.ok(stored['Signature'].length <= 45000);
  });

  await t.test('admin: see the booking (as text, not HTML), mark paid, cancel', async () => {
    await page.goto(origin + '/admin/', { waitUntil: 'networkidle' });
    await page.waitForSelector('#bookings-table table');
    const row = page.locator('#bookings-table tbody tr').first();
    assert.match(await row.innerText(), /<img src=x onerror=alert\(1\)> Reyes/);
    assert.equal(await page.locator('#bookings-table img').count(), 0, 'customer text is never rendered as HTML');
    assert.ok(!dialogs.includes('1'), 'no script ran from customer input');
    assert.match(await row.innerText(), /Unpaid/);
    assert.match(await row.innerText(), /On file/);

    await row.getByRole('button', { name: 'Mark Paid' }).click();
    await page.waitForFunction(() => {
      const paymentCell = document.querySelector('#bookings-table tbody tr td:nth-child(4)');
      return paymentCell && paymentCell.innerText.trim() === 'Paid';
    });

    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#bookings-export')]);
    const csv = require('fs').readFileSync(await download.path(), 'utf8');
    assert.match(csv, /"dana@example.com"/);

    await page.locator('#bookings-table tbody tr').first().getByRole('button', { name: 'Cancel' }).click();
    await page.waitForFunction(() => document.querySelectorAll('#bookings-table tbody tr').length === 0);
    assert.equal(backend.get({ action: 'getAvailableSlots' }).slots.length, 3, 'the slot is open again');
  });

  await t.test('passes: request, admin activation, balance, book with the pass', async () => {
    await page.goto(origin + '/club/?type=club', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('#passType').inputValue(), 'club');
    await page.selectOption('#passType', 'pack5');
    await page.fill('#passFirst', 'Lee');
    await page.fill('#passLast', 'Park');
    await page.fill('#passEmail', 'lee@example.com');
    await page.fill('#passPhone', '904-555-0199');
    await page.fill('#passDogs', 'Biscuit');
    await page.click('#pass-submit');
    await page.waitForSelector('#pass-done:not([hidden])');
    assert.match(await page.locator('#pass-done-message').innerText(), /We will email payment details to lee@example\.com/);
    assert.equal(await page.locator('#pass-pay-btn').isVisible(), false, 'no payment button until a pack link is configured');

    await page.fill('#balanceEmail', 'lee@example.com');
    await page.click('#balance-submit');
    await page.waitForSelector('#balance-result .summary');
    assert.match(await page.locator('#balance-result').innerText(), /Waiting for payment confirmation/);
    assert.match(await page.locator('#balance-result').innerText(), /Sessions left\s*0/);

    await page.goto(origin + '/admin/', { waitUntil: 'networkidle' });
    await page.click('#tab-passes');
    await page.waitForSelector('#passes-table table');
    await page.locator('#passes-table tbody tr').first().getByRole('button', { name: 'Activate' }).click();
    await page.waitForFunction(() => /5 of 5/.test(document.querySelector('#passes-table').innerText));

    await page.goto(origin + '/book/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.slot-btn');
    await page.locator('.slot-btn').nth(1).click();
    await page.fill('#firstName', 'Lee');
    await page.fill('#lastName', 'Park');
    await page.fill('#email', 'lee@example.com');
    await page.fill('#phone', '904-555-0199');
    await page.fill('#dogNames', 'Biscuit');
    await page.fill('#dogBreeds', 'Lab');
    await page.check('input[name="payWith"][value="pass"]');
    await page.check('#ownershipConfirmed');
    await page.check('#waiverAck');
    await page.click('#book-submit');
    await page.waitForSelector('#booking-done:not([hidden])');
    assert.match(await page.locator('#done-pay').innerText(), /Covered by your pass/);
    assert.match(await page.locator('#done-message').innerText(), /Sessions left: 4/);
    assert.equal(await page.locator('#done-pay-btn').isVisible(), false);
  });

  await t.test('shop: admin adds an Amazon pick and the public page labels it correctly', async () => {
    await page.goto(origin + '/shop/', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('#shop-empty').isVisible(), true);
    assert.equal(await page.locator('#merch-card').isVisible(), false);
    assert.equal(await page.locator('#amazon-disclosure').isVisible(), false);

    await page.goto(origin + '/admin/', { waitUntil: 'networkidle' });
    await page.click('#tab-shop');
    await page.click('#item-add');
    await page.fill('#dialog input[name="name"]', 'Dog life vest');
    await page.fill('#dialog textarea[name="description"]', 'Bright vest with a grab handle.');
    await page.selectOption('#dialog select[name="category"]', 'Safety');
    assert.equal(await page.locator('#dialog input[name="priceText"]').isDisabled(), true, 'price is locked for Amazon');
    await page.fill('#dialog input[name="linkUrl"]', 'https://www.amazon.com/dp/B000000000?tag=example-20');
    await page.locator('#dialog').getByRole('button', { name: 'Save' }).click();
    await page.waitForSelector('#shop-table table');

    await page.goto(origin + '/shop/', { waitUntil: 'networkidle' });
    await page.waitForSelector('#shop-grid article');
    const cardText = await page.locator('#shop-grid article').first().innerText();
    assert.match(cardText, /Dog life vest/);
    assert.match(cardText, /paid link/);
    assert.ok(!/\$/.test(cardText), 'no price shown on an Amazon item');
    const link = page.locator('#shop-grid article a');
    assert.equal(await link.innerText(), 'View on Amazon');
    assert.equal(await link.getAttribute('rel'), 'sponsored nofollow noopener');
    assert.equal(await link.getAttribute('target'), '_blank');
    assert.equal(await page.locator('#amazon-disclosure').isVisible(), true);
    assert.match(await page.locator('#amazon-disclosure').innerText(), /As an Amazon Associate I earn from qualifying purchases\./);
  });

  await t.test('admin: sign out ends the session on the server', async () => {
    await page.goto(origin + '/admin/', { waitUntil: 'networkidle' });
    const oldToken = await page.evaluate(() => window.sessionStorage.getItem('pupswim_admin_session'));
    assert.match(oldToken, /^[a-f0-9]{64}$/);
    await page.click('#logout-btn');
    await page.waitForSelector('#login-view:not([hidden])');
    assert.equal(await page.evaluate(() => window.sessionStorage.getItem('pupswim_admin_session')), null);
    assert.equal(post({ action: 'adminGetBookings', adminToken: oldToken }).code, 'unauthorized');
  });

  await t.test('no console errors or policy violations anywhere in the run', () => {
    assert.deepEqual(problems, []);
  });
});
