// File: site/scripts/waiver.js
// Waiver page: signature pad, validation, and submission.

(function () {
  'use strict';

  const api = window.PupSwimApi;
  const site = window.PupSwimSite;
  const config = window.PupSwimConfig || {};

  const form = document.getElementById('waiver-form');
  if (!form) return;

  const notice = document.getElementById('waiver-notice');
  const canvas = document.getElementById('sig-pad');
  const sigStatus = document.getElementById('sig-status');
  const submitButton = document.getElementById('waiver-submit');
  const done = document.getElementById('waiver-done');
  const MAX_SIGNATURE_CHARS = 45000;

  // Today's date in the pool's time zone, as YYYY-MM-DD.
  form.elements.date.value = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.TIMEZONE || 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());

  // ----- Signature pad -----
  const ctx = canvas.getContext('2d');
  let drawing = false;
  let hasInk = false;

  function resetPad() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0b2b3a';
    hasInk = false;
    sigStatus.textContent = 'Signature required';
  }

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  canvas.addEventListener('pointerdown', function (event) {
    event.preventDefault();
    drawing = true;
    if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  });

  canvas.addEventListener('pointermove', function (event) {
    if (!drawing) return;
    event.preventDefault();
    const p = point(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (!hasInk) {
      hasInk = true;
      sigStatus.textContent = 'Signature captured';
    }
  });

  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (name) {
    canvas.addEventListener(name, function () { drawing = false; });
  });

  document.getElementById('sig-clear').addEventListener('click', resetPad);
  resetPad();

  /** PNG data URL of the signature, scaled down if needed to fit the storage limit. */
  function signatureDataUrl() {
    let scale = 1;
    for (let attempt = 0; attempt < 4; attempt++) {
      const copy = document.createElement('canvas');
      copy.width = Math.round(canvas.width * scale);
      copy.height = Math.round(canvas.height * scale);
      copy.getContext('2d').drawImage(canvas, 0, 0, copy.width, copy.height);
      const url = copy.toDataURL('image/png');
      if (url.length <= MAX_SIGNATURE_CHARS) return url;
      scale *= 0.7;
    }
    return '';
  }

  function printPage() { window.print(); }
  document.getElementById('waiver-print').addEventListener('click', printPage);
  document.getElementById('waiver-print-2').addEventListener('click', printPage);

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    site.setNotice(notice, null, '');
    if (!form.reportValidity()) return;
    if (!hasInk) {
      site.setNotice(notice, 'warn', 'Please sign in the signature box.');
      canvas.scrollIntoView({ block: 'center' });
      return;
    }
    const signature = signatureDataUrl();
    if (!signature) {
      site.setNotice(notice, 'warn', 'That signature is too detailed to store. Clear it and sign again more simply.');
      return;
    }

    const waiver = {
      fullName: form.elements.fullName.value,
      email: form.elements.email.value.trim(),
      date: form.elements.date.value,
      initials: [1, 2, 3, 4, 5].map(function (n) { return form.elements['initial' + n].value.trim().toUpperCase(); }),
      ackRead: form.elements.ackRead.checked,
      ackRights: form.elements.ackRights.checked,
      ackVoluntary: form.elements.ackVoluntary.checked,
      signature: signature,
      version: config.WAIVER_VERSION || '',
      userAgent: navigator.userAgent
    };

    site.setBusy(submitButton, true, 'Submitting...');
    try {
      const result = await api.post('saveWaiver', { waiver: waiver, website: form.elements.website.value });
      if (!result.waiverId) throw new api.ApiError('error', 'We could not save the waiver. Please email us.');
      form.hidden = true;
      document.getElementById('waiver-ref').textContent = result.waiverId;
      done.hidden = false;
      done.focus();
      done.scrollIntoView({ block: 'center' });
    } catch (error) {
      site.setNotice(notice, 'bad', error.message);
      notice.scrollIntoView({ block: 'center' });
    } finally {
      site.setBusy(submitButton, false);
    }
  });
})();
