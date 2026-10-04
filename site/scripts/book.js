// File: site/scripts/book.js
// Booking page: lists open slots, reserves one, then offers payment, waiver, and a calendar file.

(function () {
  'use strict';

  const api = window.PupSwimApi;
  const site = window.PupSwimSite;
  const config = window.PupSwimConfig || {};
  const el = site.el;

  const form = document.getElementById('booking-form');
  if (!form) return;

  const notice = document.getElementById('book-notice');
  const loading = document.getElementById('slots-loading');
  const empty = document.getElementById('slots-empty');
  const picker = document.getElementById('slots-picker');
  const dayStrip = document.getElementById('day-strip');
  const slotGrid = document.getElementById('slot-grid');
  const summary = document.getElementById('summary');
  const submitButton = document.getElementById('book-submit');
  const done = document.getElementById('booking-done');

  let slotsByDate = {};
  let selectedDate = '';
  let selectedSlot = null;
  let requestId = site.randomId();

  function price() {
    return (config.PRICES && config.PRICES.single) || 25;
  }

  function payingWithPass() {
    return form.elements.payWith.value === 'pass';
  }

  function whenText(slot) {
    return site.dateParts(slot.date).long + ' at ' + site.formatTime(slot.time) + ' Eastern';
  }

  function renderSummary() {
    if (!selectedSlot) {
      summary.hidden = true;
      return;
    }
    document.getElementById('summary-when').textContent = whenText(selectedSlot);
    document.getElementById('summary-length').textContent = selectedSlot.duration + ' minutes';
    document.getElementById('summary-pay').textContent = payingWithPass()
      ? 'One session from your pass'
      : '$' + price() + ' by card after reserving';
    summary.hidden = false;
  }

  function renderSlots() {
    site.clear(slotGrid);
    (slotsByDate[selectedDate] || []).forEach(function (slot) {
      slotGrid.appendChild(el('button', {
        type: 'button',
        class: 'slot-btn',
        'aria-pressed': String(!!selectedSlot && selectedSlot.id === slot.id),
        text: site.formatTime(slot.time),
        onclick: function () {
          selectedSlot = slot;
          requestId = site.randomId();
          renderSlots();
          renderSummary();
        }
      }));
    });
  }

  function renderDays() {
    site.clear(dayStrip);
    Object.keys(slotsByDate).sort().forEach(function (date) {
      const parts = site.dateParts(date);
      const count = slotsByDate[date].length;
      dayStrip.appendChild(el('button', {
        type: 'button',
        class: 'day-btn',
        'aria-pressed': String(date === selectedDate),
        'aria-label': parts.long + ', ' + count + (count === 1 ? ' open time' : ' open times'),
        onclick: function () {
          selectedDate = date;
          selectedSlot = null;
          renderDays();
          renderSlots();
          renderSummary();
        }
      }, [
        el('span', { class: 'dow', text: parts.dow.substring(0, 3) }),
        el('span', { class: 'dom', text: String(parts.dom) }),
        el('span', { class: 'mon', text: parts.month.substring(0, 3) }),
        el('span', { class: 'count', text: count + ' open' })
      ]));
    });
  }

  async function loadSlots() {
    loading.hidden = false;
    empty.hidden = true;
    picker.hidden = true;
    try {
      const result = await api.get('getAvailableSlots');
      slotsByDate = {};
      result.slots.forEach(function (slot) {
        (slotsByDate[slot.date] = slotsByDate[slot.date] || []).push(slot);
      });
      const dates = Object.keys(slotsByDate).sort();
      loading.hidden = true;
      if (dates.length === 0) {
        empty.hidden = false;
        selectedDate = '';
        selectedSlot = null;
        renderSummary();
        return;
      }
      if (!slotsByDate[selectedDate]) selectedDate = dates[0];
      selectedSlot = null;
      picker.hidden = false;
      renderDays();
      renderSlots();
      renderSummary();
    } catch (error) {
      loading.hidden = true;
      site.setNotice(notice, 'bad', error.message);
    }
  }

  /** UTC instant for a wall-clock time in the pool's time zone (handles daylight saving). */
  function zonedToUtc(date, time) {
    const d = date.split('-').map(Number);
    const t = time.split(':').map(Number);
    const zone = config.TIMEZONE || 'America/New_York';
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const wanted = Date.UTC(d[0], d[1] - 1, d[2], t[0], t[1], 0);
    let guess = wanted;
    for (let i = 0; i < 3; i++) {
      const parts = {};
      formatter.formatToParts(new Date(guess)).forEach(function (p) { parts[p.type] = Number(p.value); });
      const shown = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
      guess += wanted - shown;
    }
    return new Date(guess);
  }

  function icsStamp(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }

  function downloadIcs(booking) {
    const start = zonedToUtc(booking.slot.date, booking.slot.time);
    const end = new Date(start.getTime() + booking.slot.duration * 60000);
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PupSwim//Pool Rental//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + booking.bookingId + '@pupswim.com',
      'DTSTAMP:' + icsStamp(new Date()),
      'DTSTART:' + icsStamp(start),
      'DTEND:' + icsStamp(end),
      'SUMMARY:PupSwim pool rental',
      'DESCRIPTION:Booking reference ' + booking.bookingId + '. Bring a towel and a leash. Pool rules: https://pupswim.com/#rules',
      'LOCATION:PupSwim\\, St. Augustine\\, FL',
      'BEGIN:VALARM',
      'TRIGGER:-PT60M',
      'ACTION:DISPLAY',
      'DESCRIPTION:PupSwim pool rental in 1 hour',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    const blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = el('a', { href: url, download: 'pupswim-rental.ics' });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function showDone(result, email) {
    form.hidden = true;
    site.setNotice(notice, null, '');
    document.getElementById('done-when').textContent = whenText(result.slot);
    document.getElementById('done-length').textContent = result.slot.duration + ' minutes';
    document.getElementById('done-ref').textContent = result.bookingId;

    const payCell = document.getElementById('done-pay');
    const message = document.getElementById('done-message');
    const payButton = document.getElementById('done-pay-btn');

    if (result.paymentStatus === 'pass') {
      payCell.textContent = 'Covered by your pass';
      message.textContent = result.sessionsRemaining === null || result.sessionsRemaining === undefined
        ? 'This rental uses one session from your pass.'
        : 'This rental used one session from your pass. Sessions left: ' + result.sessionsRemaining + '.';
      payButton.hidden = true;
    } else {
      payCell.textContent = '$' + price() + ' due';
      const stripeLink = site.safeHttpsUrl((config.STRIPE_LINKS || {}).single || '');
      if (stripeLink) {
        const url = new URL(stripeLink);
        url.searchParams.set('client_reference_id', result.bookingId);
        url.searchParams.set('prefilled_email', email);
        payButton.href = url.href;
        payButton.rel = 'noopener';
        payButton.textContent = 'Pay $' + price() + ' Now';
        message.textContent = 'Your time is held. Complete payment now to confirm your rental.';
      } else {
        payButton.href = 'mailto:' + (config.CONTACT_EMAIL || '') + '?subject=' + encodeURIComponent('Payment for booking ' + result.bookingId);
        payButton.textContent = 'Email Us to Pay';
        message.textContent = 'Your time is held. Email us to arrange payment and confirm your rental.';
      }
      payButton.hidden = false;
    }

    document.getElementById('done-ics').onclick = function () { downloadIcs(result); };
    done.hidden = false;
    done.focus();
    done.scrollIntoView({ block: 'start' });
  }

  form.addEventListener('change', renderSummary);

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    site.setNotice(notice, null, '');
    if (!selectedSlot) {
      site.setNotice(notice, 'warn', 'Choose a day and a start time first.');
      notice.scrollIntoView({ block: 'center' });
      return;
    }
    if (!form.reportValidity()) return;

    const email = form.elements.email.value.trim();
    const booking = {
      requestId: requestId,
      slotId: selectedSlot.id,
      firstName: form.elements.firstName.value,
      lastName: form.elements.lastName.value,
      email: email,
      phone: form.elements.phone.value,
      dogNames: form.elements.dogNames.value,
      dogBreeds: form.elements.dogBreeds.value,
      numDogs: Number(form.elements.numDogs.value),
      ownershipConfirmed: form.elements.ownershipConfirmed.checked,
      waiverAck: form.elements.waiverAck.checked,
      usePass: payingWithPass()
    };

    site.setBusy(submitButton, true, 'Reserving...');
    try {
      const result = await api.post('saveBooking', { booking: booking, website: form.elements.website.value });
      if (!result.bookingId) throw new api.ApiError('error', 'We could not complete the booking. Please email us.');
      showDone(result, email);
    } catch (error) {
      site.setNotice(notice, 'bad', error.message);
      notice.scrollIntoView({ block: 'center' });
      if (error.code === 'conflict') {
        requestId = site.randomId();
        await loadSlots();
      }
    } finally {
      site.setBusy(submitButton, false);
    }
  });

  loadSlots();
})();
