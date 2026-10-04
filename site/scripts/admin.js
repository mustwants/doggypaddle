// File: site/scripts/admin.js
// Admin dashboard. Everything here is convenience only: the backend checks the admin
// session token on every admin action, so nothing in this file is a security boundary.

(function () {
  'use strict';

  const api = window.PupSwimApi;
  const site = window.PupSwimSite;
  const config = window.PupSwimConfig || {};
  const el = site.el;

  const bootView = document.getElementById('boot-view');
  if (!bootView) return;

  const TOKEN_KEY = 'pupswim_admin_session';
  const loginView = document.getElementById('login-view');
  const dashView = document.getElementById('dash-view');
  const loginNotice = document.getElementById('login-notice');
  const dashNotice = document.getElementById('dash-notice');
  const dialog = document.getElementById('dialog');
  const dialogTitle = document.getElementById('dialog-title');
  const dialogBody = document.getElementById('dialog-body');
  const dialogFoot = document.getElementById('dialog-foot');
  const toastNode = document.getElementById('toast');

  const PASS_LABELS = { pack5: '5-Session Pack', club: 'Swim Club' };
  const PASS_SESSIONS = { pack5: 5, club: 4 };
  const SOURCES = [['amazon', 'Amazon'], ['etsy', 'Etsy'], ['printify', 'Printify'], ['shopify', 'Shopify'], ['pupswim', 'PupSwim (sold on site visit)'], ['other', 'Other store']];
  const CATEGORIES = ['Treats', 'Toys', 'Safety', 'Grooming', 'Merch', 'Other'];

  let token = '';
  let bookings = [];
  let slots = [];
  let passes = [];
  let shopItems = [];
  let toastTimer = null;

  try { token = window.sessionStorage.getItem(TOKEN_KEY) || ''; } catch (error) { token = ''; }

  // ----- small helpers -----

  function today() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: config.TIMEZONE || 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
  }

  function addDays(dateString, days) {
    const p = dateString.split('-').map(Number);
    const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + days));
    return d.toISOString().substring(0, 10);
  }

  function weekday(dateString) {
    const p = dateString.split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
  }

  function toast(message, bad) {
    toastNode.textContent = message;
    toastNode.className = 'toast' + (bad ? ' is-bad' : '');
    toastNode.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastNode.hidden = true; }, bad ? 6000 : 3500);
  }

  function saveToken(value) {
    token = value || '';
    try {
      if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
      else window.sessionStorage.removeItem(TOKEN_KEY);
    } catch (error) { /* storage unavailable: the session lasts until the page is closed */ }
  }

  function showLogin(message, kind) {
    bootView.hidden = true;
    dashView.hidden = true;
    loginView.hidden = false;
    site.setNotice(loginNotice, kind || null, message || '');
  }

  /** Admin call. A rejected session sends the user back to the sign-in screen. */
  async function call(action, payload) {
    try {
      return await api.post(action, Object.assign({ adminToken: token }, payload || {}));
    } catch (error) {
      if (error.code === 'unauthorized') {
        saveToken('');
        showLogin('Your session has ended. Sign in again.', 'warn');
      }
      throw error;
    }
  }

  function reportError(error) {
    if (error && error.code === 'unauthorized') return;
    toast((error && error.message) || 'Something went wrong.', true);
  }

  function badge(text, kind) {
    return el('span', { class: 'badge' + (kind ? ' badge-' + kind : ''), text: text });
  }

  function cell(main, sub) {
    return [el('span', { class: 'cell-main', text: main }), sub ? el('span', { class: 'cell-sub', text: sub }) : null];
  }

  function button(label, kind, handler) {
    return el('button', { type: 'button', class: 'btn btn-small ' + (kind || 'btn-ghost'), text: label, onclick: handler });
  }

  function renderTable(container, headers, rows, emptyText) {
    site.clear(container);
    if (!rows.length) {
      container.appendChild(el('p', { class: 'table-empty', text: emptyText }));
      return;
    }
    const thead = el('thead', {}, el('tr', {}, headers.map(function (h) { return el('th', { scope: 'col', text: h }); })));
    const tbody = el('tbody', {}, rows);
    container.appendChild(el('table', { class: 'data' }, [thead, tbody]));
  }

  // ----- dialog -----

  function openDialog(title, bodyNodes, footNodes) {
    dialogTitle.textContent = title;
    site.clear(dialogBody);
    site.clear(dialogFoot);
    [].concat(bodyNodes).forEach(function (n) { if (n) dialogBody.appendChild(n); });
    [].concat(footNodes).forEach(function (n) { if (n) dialogFoot.appendChild(n); });
    if (!dialog.open) dialog.showModal();
  }

  function closeDialog() {
    if (dialog.open) dialog.close();
  }

  document.getElementById('dialog-close').addEventListener('click', closeDialog);

  function field(label, input, hint) {
    const id = 'f-' + Math.random().toString(36).substring(2, 9);
    input.id = id;
    return el('div', { class: 'field' }, [
      el('label', { for: id, text: label }),
      input,
      hint ? el('span', { class: 'hint', text: hint }) : null
    ]);
  }

  function selectInput(name, options, value) {
    return el('select', { name: name }, options.map(function (o) {
      const pair = Array.isArray(o) ? o : [o, o];
      return el('option', { value: pair[0], text: pair[1], selected: String(pair[0]) === String(value) });
    }));
  }

  function textInput(name, value, attrs) {
    return el('input', Object.assign({ type: 'text', name: name, value: value === undefined || value === null ? '' : String(value) }, attrs || {}));
  }

  // ----- sign in / out -----

  document.getElementById('login-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const submit = document.getElementById('login-submit');
    site.setBusy(submit, true, 'Sending...');
    try {
      const result = await api.post('requestAdminLogin', { email: form.elements.email.value.trim() });
      site.setNotice(loginNotice, 'ok', result.message + ' Open the link on this device.');
      form.reset();
    } catch (error) {
      site.setNotice(loginNotice, 'bad', error.message);
    } finally {
      site.setBusy(submit, false);
    }
  });

  document.getElementById('logout-btn').addEventListener('click', async function () {
    try { await api.post('adminLogout', { adminToken: token }); } catch (error) { /* signing out locally regardless */ }
    saveToken('');
    showLogin('You are signed out.', 'ok');
  });

  function showDash(email) {
    bootView.hidden = true;
    loginView.hidden = true;
    dashView.hidden = false;
    document.getElementById('admin-email').textContent = email;
    selectTab('bookings');
  }

  // ----- tabs -----

  const loaders = { bookings: loadBookings, slots: loadSlots, passes: loadPasses, shop: loadShop, waivers: loadWaivers };

  function selectTab(name) {
    document.querySelectorAll('.tab').forEach(function (tab) {
      const active = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', String(active));
      document.getElementById('panel-' + tab.dataset.tab).hidden = !active;
    });
    site.setNotice(dashNotice, null, '');
    loaders[name]();
  }

  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () { selectTab(tab.dataset.tab); });
  });

  // ----- bookings -----

  const bookingFilter = document.getElementById('booking-filter');
  const bookingsTable = document.getElementById('bookings-table');

  function paymentBadge(b) {
    if (b.paymentStatus === 'paid') return badge('Paid', 'ok');
    if (b.paymentStatus === 'pass') return badge('Pass', 'ok');
    if (b.paymentStatus === 'refunded') return badge('Refunded', 'muted');
    return badge('Unpaid', 'warn');
  }

  function renderBookings() {
    const mode = bookingFilter.value;
    const now = today();
    const shown = bookings.filter(function (b) {
      if (mode === 'upcoming') return b.status === 'confirmed' && b.date >= now;
      if (mode === 'unpaid') return b.status === 'confirmed' && b.paymentStatus === 'pending';
      if (mode === 'cancelled') return b.status === 'cancelled';
      return true;
    });
    if (mode === 'upcoming' || mode === 'unpaid') {
      shown.sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
    }

    const rows = shown.map(function (b) {
      const cancelled = b.status === 'cancelled';
      const actions = [];
      if (!cancelled) {
        if (b.paymentStatus === 'pending') actions.push(button('Mark Paid', 'btn-pool', function () { updateBooking(b, { paymentStatus: 'paid' }, 'Marked paid.'); }));
        if (b.paymentStatus === 'paid') actions.push(button('Mark Unpaid', 'btn-ghost', function () { updateBooking(b, { paymentStatus: 'pending' }, 'Marked unpaid.'); }));
        if (b.paymentStatus === 'paid') actions.push(button('Mark Refunded', 'btn-ghost', function () { updateBooking(b, { paymentStatus: 'refunded' }, 'Marked refunded.'); }));
        actions.push(button('Cancel', 'btn-danger', function () {
          const extra = b.paymentStatus === 'pass' ? ' The session goes back on the pass.' : (b.paymentStatus === 'paid' ? ' This does not refund the payment; do that in Stripe.' : '');
          if (window.confirm('Cancel this booking and reopen the time slot?' + extra)) {
            updateBooking(b, { bookingStatus: 'cancelled' }, 'Booking cancelled.');
          }
        }));
      }
      return el('tr', { class: cancelled ? 'row-cancelled' : '' }, [
        el('td', {}, cell(site.dateParts(b.date).long, site.formatTime(b.time) + ' (' + b.duration + ' min)')),
        el('td', {}, cell(b.firstName + ' ' + b.lastName, b.email + ' | ' + b.phone)),
        el('td', {}, cell(b.dogNames + ' (' + b.numDogs + ')', b.dogBreeds)),
        el('td', { class: 'no-strike' }, paymentBadge(b)),
        el('td', { class: 'no-strike' }, b.waiverOnFile ? badge('On file', 'ok') : badge('Missing', 'bad')),
        el('td', { class: 'no-strike' }, cancelled ? badge('Cancelled', 'muted') : badge('Confirmed', 'ok')),
        el('td', { class: 'actions' }, actions)
      ]);
    });
    renderTable(bookingsTable, ['When', 'Customer', 'Dogs', 'Payment', 'Waiver', 'Status', 'Actions'], rows, 'No bookings match this view.');
  }

  async function loadBookings() {
    try {
      bookings = (await call('adminGetBookings')).bookings;
      renderBookings();
    } catch (error) { reportError(error); }
  }

  async function updateBooking(booking, changes, message) {
    try {
      await call('adminUpdateBooking', Object.assign({ bookingId: booking.bookingId }, changes));
      toast(message);
      await loadBookings();
    } catch (error) { reportError(error); }
  }

  function csvCell(value) {
    let text = String(value === null || value === undefined ? '' : value);
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text; // keep spreadsheets from running it as a formula
    return '"' + text.replace(/"/g, '""') + '"';
  }

  document.getElementById('bookings-export').addEventListener('click', function () {
    const header = ['Date', 'Time', 'Minutes', 'First name', 'Last name', 'Email', 'Phone', 'Dogs', 'Breeds', 'Number of dogs', 'Payment', 'Status', 'Waiver on file', 'Booking ID'];
    const lines = [header.map(csvCell).join(',')].concat(bookings.map(function (b) {
      return [b.date, b.time, b.duration, b.firstName, b.lastName, b.email, b.phone, b.dogNames, b.dogBreeds, b.numDogs,
        b.paymentStatus, b.status, b.waiverOnFile ? 'yes' : 'no', b.bookingId].map(csvCell).join(',');
    }));
    const url = URL.createObjectURL(new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' }));
    const link = el('a', { href: url, download: 'pupswim-bookings-' + today() + '.csv' });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  });

  bookingFilter.addEventListener('change', renderBookings);
  document.getElementById('bookings-refresh').addEventListener('click', loadBookings);

  // ----- slots -----

  const slotForm = document.getElementById('slot-form');
  const slotsTable = document.getElementById('slots-table');
  const slotsPast = document.getElementById('slots-past');
  const slotsDelete = document.getElementById('slots-delete');

  slotForm.elements.startDate.value = today();
  slotForm.elements.endDate.value = addDays(today(), 6);

  function selectedSlotIds() {
    return Array.prototype.map.call(slotsTable.querySelectorAll('input[data-slot]:checked'), function (box) { return box.dataset.slot; });
  }

  function syncDeleteButton() {
    slotsDelete.disabled = selectedSlotIds().length === 0;
  }

  function renderSlots() {
    const rows = slots.map(function (s) {
      const booked = s.status === 'booked';
      const statusBadge = booked ? badge('Booked', 'ok') : (s.status === 'blocked' ? badge('Blocked', 'muted') : badge('Open', 'warn'));
      const actions = [];
      if (!booked) {
        actions.push(s.status === 'blocked'
          ? button('Reopen', 'btn-pool', function () { setSlotStatus(s, 'available'); })
          : button('Block', 'btn-ghost', function () { setSlotStatus(s, 'blocked'); }));
      }
      return el('tr', {}, [
        el('td', {}, el('input', { type: 'checkbox', dataset: { slot: s.id }, disabled: booked, 'aria-label': 'Select ' + s.date + ' ' + s.time, onchange: syncDeleteButton })),
        el('td', { text: site.dateParts(s.date).long }),
        el('td', { text: site.formatTime(s.time) }),
        el('td', { text: s.duration + ' min' }),
        el('td', {}, statusBadge),
        el('td', { class: 'actions' }, actions)
      ]);
    });
    renderTable(slotsTable, ['', 'Date', 'Start', 'Length', 'Status', 'Actions'], rows, 'No time slots yet. Use the form above to add open times.');
    syncDeleteButton();
  }

  async function loadSlots() {
    try {
      const payload = slotsPast.checked ? {} : { from: today() };
      slots = (await call('adminGetSlots', payload)).slots;
      renderSlots();
    } catch (error) { reportError(error); }
  }

  async function setSlotStatus(slot, slotStatus) {
    try {
      await call('adminSetSlotStatus', { slotId: slot.id, slotStatus: slotStatus });
      toast(slotStatus === 'blocked' ? 'Slot blocked.' : 'Slot reopened.');
      await loadSlots();
    } catch (error) { reportError(error); }
  }

  slotsDelete.addEventListener('click', async function () {
    const ids = selectedSlotIds();
    if (!ids.length || !window.confirm('Delete ' + ids.length + ' time slot(s)? Booked slots are never deleted.')) return;
    try {
      const result = await call('adminDeleteSlots', { slotIds: ids });
      toast('Deleted ' + result.deleted + ' slot(s).' + (result.keptBooked ? ' Kept ' + result.keptBooked + ' booked.' : ''));
      await loadSlots();
    } catch (error) { reportError(error); }
  });

  slotsPast.addEventListener('change', loadSlots);
  document.getElementById('slots-refresh').addEventListener('click', loadSlots);

  function minutesOf(time) {
    const p = time.split(':').map(Number);
    return p[0] * 60 + p[1];
  }

  function timeOf(minutes) {
    return ('0' + Math.floor(minutes / 60)).slice(-2) + ':' + ('0' + (minutes % 60)).slice(-2);
  }

  slotForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!slotForm.reportValidity()) return;
    const start = slotForm.elements.startDate.value;
    const end = slotForm.elements.endDate.value;
    const first = minutesOf(slotForm.elements.firstTime.value);
    const last = minutesOf(slotForm.elements.lastTime.value);
    const interval = Number(slotForm.elements.interval.value);
    const duration = Number(slotForm.elements.duration.value);
    const days = Array.prototype.filter.call(slotForm.querySelectorAll('input[name="weekday"]'), function (box) { return box.checked; })
      .map(function (box) { return Number(box.value); });

    if (end < start) { toast('The last day must be on or after the first day.', true); return; }
    if (last < first) { toast('The last start time must be after the first start time.', true); return; }
    if (duration > interval) { toast('The swim length cannot be longer than the gap between slots.', true); return; }
    if (!days.length) { toast('Choose at least one day of the week.', true); return; }

    const fresh = [];
    for (let date = start, guard = 0; date <= end && guard < 120; date = addDays(date, 1), guard++) {
      if (days.indexOf(weekday(date)) === -1) continue;
      for (let m = first; m <= last; m += interval) fresh.push({ date: date, time: timeOf(m), duration: duration });
    }
    if (!fresh.length) { toast('Those settings do not produce any time slots.', true); return; }
    if (fresh.length > 2000) { toast('That is more than 2,000 slots. Use a shorter date range.', true); return; }
    if (!window.confirm('Add ' + fresh.length + ' open time slot(s)?')) return;

    const submit = document.getElementById('slot-submit');
    site.setBusy(submit, true, 'Adding...');
    try {
      let added = 0, skipped = 0;
      for (let i = 0; i < fresh.length; i += 400) {
        const result = await call('adminAddSlots', { slots: fresh.slice(i, i + 400) });
        added += result.added;
        skipped += result.skipped;
      }
      toast('Added ' + added + ' slot(s).' + (skipped ? ' Skipped ' + skipped + ' that already existed.' : ''));
      await loadSlots();
    } catch (error) {
      reportError(error);
    } finally {
      site.setBusy(submit, false);
    }
  });

  // ----- passes -----

  const passesTable = document.getElementById('passes-table');

  function passStatusBadge(p) {
    if (p.status === 'active') return badge('Active', 'ok');
    if (p.status === 'pending') return badge('Pending payment', 'warn');
    if (p.status === 'paused') return badge('Paused', 'muted');
    return badge('Cancelled', 'muted');
  }

  function renderPasses() {
    const rows = passes.map(function (p) {
      const actions = [];
      if (p.status === 'pending') {
        actions.push(button('Activate', 'btn-pool', function () {
          if (window.confirm('Activate this pass with ' + p.sessionsTotal + ' session(s)? Only do this after you have confirmed the payment in Stripe.')) {
            savePass(Object.assign({}, p, { status: 'active', sessionsRemaining: p.sessionsTotal, periodStart: today() }), 'Pass activated.');
          }
        }));
      }
      if (p.status === 'active' && p.type === 'club') {
        actions.push(button('Renew Month', 'btn-pool', function () {
          if (window.confirm('Refill this Swim Club pass to ' + p.sessionsTotal + ' session(s)? Only do this after this month\'s payment has arrived in Stripe.')) {
            savePass(Object.assign({}, p, { sessionsRemaining: p.sessionsTotal, periodStart: today() }), 'Swim Club month renewed.');
          }
        }));
      }
      actions.push(button('Edit', 'btn-ghost', function () { editPass(p); }));
      return el('tr', {}, [
        el('td', {}, cell(p.firstName + ' ' + p.lastName, p.email + (p.phone ? ' | ' + p.phone : ''))),
        el('td', { text: PASS_LABELS[p.type] || p.type }),
        el('td', {}, passStatusBadge(p)),
        el('td', { text: p.sessionsRemaining + ' of ' + p.sessionsTotal }),
        el('td', { text: p.periodStart || '' }),
        el('td', { class: 'actions' }, actions)
      ]);
    });
    renderTable(passesTable, ['Customer', 'Pass', 'Status', 'Sessions left', 'Period start', 'Actions'], rows, 'No passes yet.');
  }

  async function loadPasses() {
    try {
      passes = (await call('adminGetPasses')).passes;
      renderPasses();
    } catch (error) { reportError(error); }
  }

  async function savePass(pass, message) {
    try {
      await call('adminSavePass', { pass: pass });
      toast(message);
      closeDialog();
      await loadPasses();
    } catch (error) { reportError(error); }
  }

  function editPass(existing) {
    const p = existing || { type: 'pack5', status: 'active', firstName: '', lastName: '', email: '', phone: '', dogNames: '', sessionsTotal: 5, sessionsRemaining: 5, periodStart: today(), notes: '' };
    const type = selectInput('type', [['pack5', PASS_LABELS.pack5], ['club', PASS_LABELS.club]], p.type);
    const status = selectInput('status', [['pending', 'Pending payment'], ['active', 'Active'], ['paused', 'Paused'], ['cancelled', 'Cancelled']], p.status);
    const first = textInput('firstName', p.firstName, { maxlength: 60, required: true });
    const last = textInput('lastName', p.lastName, { maxlength: 60, required: true });
    const email = textInput('email', p.email, { type: 'email', maxlength: 254, required: true });
    const phone = textInput('phone', p.phone, { type: 'tel', maxlength: 25 });
    const dogs = textInput('dogNames', p.dogNames, { maxlength: 120 });
    const total = textInput('sessionsTotal', p.sessionsTotal, { type: 'number', min: 0, max: 100, required: true });
    const remaining = textInput('sessionsRemaining', p.sessionsRemaining, { type: 'number', min: 0, max: 100, required: true });
    const period = textInput('periodStart', p.periodStart, { type: 'date' });
    const notes = el('textarea', { name: 'notes', maxlength: 500, text: p.notes || '' });

    if (!existing) {
      type.addEventListener('change', function () {
        total.value = PASS_SESSIONS[type.value];
        remaining.value = PASS_SESSIONS[type.value];
      });
    }

    const form = el('form', { class: 'stack' }, [
      el('div', { class: 'form-grid' }, [
        field('Pass', type), field('Status', status),
        field('First name', first), field('Last name', last),
        field('Email', email), field('Phone', phone),
        field('Sessions per period', total), field('Sessions left', remaining),
        field('Period start', period), field('Dog name(s)', dogs)
      ]),
      field('Notes (only admins see this)', notes)
    ]);

    function submit() {
      if (!form.reportValidity()) return;
      savePass({
        passId: existing ? existing.passId : '',
        type: type.value, status: status.value,
        firstName: first.value, lastName: last.value, email: email.value.trim(), phone: phone.value, dogNames: dogs.value,
        sessionsTotal: Number(total.value), sessionsRemaining: Number(remaining.value),
        periodStart: period.value, notes: notes.value
      }, existing ? 'Pass updated.' : 'Pass added.');
    }
    form.addEventListener('submit', function (event) { event.preventDefault(); submit(); });

    openDialog(existing ? 'Edit pass' : 'Add pass', form, [
      button('Close', 'btn-ghost', closeDialog),
      button('Save', '', submit)
    ]);
  }

  document.getElementById('pass-add').addEventListener('click', function () { editPass(null); });
  document.getElementById('passes-refresh').addEventListener('click', loadPasses);

  // ----- shop -----

  const shopTable = document.getElementById('shop-table');

  function sourceLabel(source) {
    const found = SOURCES.filter(function (s) { return s[0] === source; })[0];
    return found ? found[1] : source;
  }

  function renderShop() {
    const rows = shopItems.map(function (item) {
      return el('tr', {}, [
        el('td', {}, cell(item.name, item.description)),
        el('td', { text: item.category }),
        el('td', { text: sourceLabel(item.source) }),
        el('td', {}, item.active ? badge('Shown', 'ok') : badge('Hidden', 'muted')),
        el('td', { text: String(item.sortOrder) }),
        el('td', { class: 'actions' }, [
          button('Edit', 'btn-ghost', function () { editItem(item); }),
          button('Delete', 'btn-danger', function () { deleteItem(item); })
        ])
      ]);
    });
    renderTable(shopTable, ['Item', 'Category', 'Sold on', 'On site', 'Order', 'Actions'], rows, 'No shop items yet. Click Add Item to create the first one.');
  }

  async function loadShop() {
    try {
      shopItems = (await call('adminGetShopItems')).items;
      renderShop();
    } catch (error) { reportError(error); }
  }

  async function deleteItem(item) {
    if (!window.confirm('Delete "' + item.name + '" from the shop?')) return;
    try {
      await call('adminDeleteShopItem', { itemId: item.itemId });
      toast('Item deleted.');
      await loadShop();
    } catch (error) { reportError(error); }
  }

  function editItem(existing) {
    const it = existing || { name: '', description: '', category: 'Toys', source: 'amazon', linkUrl: '', imageUrl: '', priceText: '', sortOrder: 100, active: true };
    const name = textInput('name', it.name, { maxlength: 100, required: true });
    const description = el('textarea', { name: 'description', maxlength: 400, text: it.description || '' });
    const category = selectInput('category', CATEGORIES, it.category);
    const source = selectInput('source', SOURCES, it.source);
    const link = textInput('linkUrl', it.linkUrl, { type: 'url', maxlength: 600, required: true, placeholder: 'https://' });
    const image = textInput('imageUrl', it.imageUrl, { maxlength: 600, placeholder: 'https:// or /assets/file.jpg' });
    const priceText = textInput('priceText', it.priceText, { maxlength: 30 });
    const sortOrder = textInput('sortOrder', it.sortOrder, { type: 'number', min: 0, max: 9999 });
    const active = el('input', { type: 'checkbox', name: 'active', checked: !!it.active });

    function syncPrice() {
      const amazon = source.value === 'amazon';
      priceText.disabled = amazon;
      if (amazon) priceText.value = '';
    }
    source.addEventListener('change', syncPrice);
    syncPrice();

    const form = el('form', { class: 'stack' }, [
      field('Name', name),
      field('Description (your own words)', description),
      el('div', { class: 'form-grid' }, [
        field('Category', category),
        field('Sold on', source),
        field('Price text', priceText, 'Not allowed for Amazon items.'),
        field('Display order', sortOrder, 'Lower numbers show first.')
      ]),
      field('Link to the product', link, 'For Amazon, paste your Associates link.'),
      field('Image (optional)', image, 'Use only an image you own.'),
      el('label', { class: 'check' }, [active, el('span', { text: 'Show this item on the site' })])
    ]);

    async function submit() {
      if (!form.reportValidity()) return;
      try {
        await call('adminSaveShopItem', {
          item: {
            itemId: existing ? existing.itemId : '',
            name: name.value, description: description.value, category: category.value, source: source.value,
            linkUrl: link.value.trim(), imageUrl: image.value.trim(), priceText: priceText.value,
            sortOrder: Number(sortOrder.value || 100), active: active.checked
          }
        });
        toast(existing ? 'Item updated.' : 'Item added.');
        closeDialog();
        await loadShop();
      } catch (error) { reportError(error); }
    }
    form.addEventListener('submit', function (event) { event.preventDefault(); submit(); });

    openDialog(existing ? 'Edit shop item' : 'Add shop item', form, [
      button('Close', 'btn-ghost', closeDialog),
      button('Save', '', submit)
    ]);
  }

  document.getElementById('item-add').addEventListener('click', function () { editItem(null); });
  document.getElementById('shop-refresh').addEventListener('click', loadShop);

  // ----- waivers -----

  const waiversTable = document.getElementById('waivers-table');

  async function viewWaiver(summary) {
    try {
      const w = (await call('adminGetWaiver', { waiverId: summary.waiverId })).waiver;
      const signatureOk = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(w.signature || '');
      openDialog('Signed waiver', [
        el('div', { class: 'summary' }, el('dl', {}, [
          el('dt', { text: 'Name' }), el('dd', { text: w.fullName }),
          el('dt', { text: 'Email' }), el('dd', { text: w.email }),
          el('dt', { text: 'Date' }), el('dd', { text: w.date }),
          el('dt', { text: 'Signed at' }), el('dd', { text: w.signedAt }),
          el('dt', { text: 'Initials' }), el('dd', { text: w.initials.join(', ') }),
          el('dt', { text: 'Waiver version' }), el('dd', { text: w.version }),
          el('dt', { text: 'Reference' }), el('dd', { text: w.waiverId })
        ])),
        el('p', { class: 'label', text: 'Signature' }),
        signatureOk ? el('img', { class: 'sig-view', src: w.signature, alt: 'Signature of ' + w.fullName })
                    : el('p', { class: 'muted', text: 'No signature image stored.' })
      ], [button('Close', 'btn-ghost', closeDialog)]);
    } catch (error) { reportError(error); }
  }

  async function loadWaivers() {
    try {
      const waivers = (await call('adminGetWaivers')).waivers;
      const rows = waivers.map(function (w) {
        return el('tr', {}, [
          el('td', { text: w.signedAt.substring(0, 16).replace('T', ' ') + ' UTC' }),
          el('td', { text: w.fullName }),
          el('td', { text: w.email }),
          el('td', { text: w.date }),
          el('td', { class: 'actions' }, button('View', 'btn-ghost', function () { viewWaiver(w); }))
        ]);
      });
      renderTable(waiversTable, ['Signed', 'Name', 'Email', 'Date on waiver', 'Actions'], rows, 'No signed waivers yet.');
    } catch (error) { reportError(error); }
  }

  document.getElementById('waivers-refresh').addEventListener('click', loadWaivers);

  // ----- start -----

  async function boot() {
    const match = /^#login=([a-f0-9]{64})$/.exec(window.location.hash);
    if (match) {
      // Remove the one-time token from the address bar and history straight away.
      window.history.replaceState(null, '', window.location.pathname);
      try {
        const result = await api.post('completeAdminLogin', { token: match[1] });
        saveToken(result.adminToken);
        showDash(result.email);
      } catch (error) {
        saveToken('');
        showLogin(error.message, 'bad');
      }
      return;
    }
    if (token) {
      try {
        const who = await api.post('adminWhoAmI', { adminToken: token });
        showDash(who.email);
      } catch (error) {
        saveToken('');
        showLogin(error.code === 'unauthorized' ? 'Your session has ended. Sign in again.' : error.message, 'warn');
      }
      return;
    }
    showLogin('', null);
  }

  // If the sign-in link is opened in a tab that already has this page loaded, only the
  // part after # changes and the page does not reload, so handle that case too.
  window.addEventListener('hashchange', function () {
    if (/^#login=[a-f0-9]{64}$/.test(window.location.hash)) boot();
  });

  boot();
})();
