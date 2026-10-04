// File: site/scripts/club.js
// Passes page: request a 5-Session Pack or Swim Club pass, and look up a pass balance.

(function () {
  'use strict';

  const api = window.PupSwimApi;
  const site = window.PupSwimSite;
  const config = window.PupSwimConfig || {};
  const el = site.el;

  const passForm = document.getElementById('pass-form');
  if (!passForm) return;

  const LABELS = { pack5: '5-Session Pack', club: 'Swim Club' };
  const STATUS_TEXT = {
    pending: 'Waiting for payment confirmation',
    active: 'Active',
    paused: 'Paused'
  };

  const passNotice = document.getElementById('pass-notice');
  const passSubmit = document.getElementById('pass-submit');
  const passDone = document.getElementById('pass-done');
  const balanceForm = document.getElementById('balance-form');
  const balanceSubmit = document.getElementById('balance-submit');
  const balanceResult = document.getElementById('balance-result');

  const wanted = new URLSearchParams(window.location.search).get('type');
  if (wanted === 'pack5' || wanted === 'club') passForm.elements.type.value = wanted;

  passForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    site.setNotice(passNotice, null, '');
    if (!passForm.reportValidity()) return;

    const type = passForm.elements.type.value;
    const email = passForm.elements.email.value.trim();
    const pass = {
      type: type,
      firstName: passForm.elements.firstName.value,
      lastName: passForm.elements.lastName.value,
      email: email,
      phone: passForm.elements.phone.value,
      dogNames: passForm.elements.dogNames.value
    };

    site.setBusy(passSubmit, true, 'Sending...');
    try {
      const result = await api.post('requestPass', { pass: pass, website: passForm.elements.website.value });
      if (!result.passId) throw new api.ApiError('error', 'We could not save your request. Please email us.');

      const message = document.getElementById('pass-done-message');
      const payButton = document.getElementById('pass-pay-btn');
      const stripeLink = site.safeHttpsUrl((config.STRIPE_LINKS || {})[type] || '');

      if (result.passStatus === 'active') {
        message.textContent = 'You already have an active ' + LABELS[type] + ' on this email. Check your balance, then book a rental.';
        payButton.hidden = true;
      } else if (stripeLink) {
        const url = new URL(stripeLink);
        url.searchParams.set('client_reference_id', result.passId);
        url.searchParams.set('prefilled_email', email);
        payButton.href = url.href;
        payButton.rel = 'noopener';
        payButton.hidden = false;
        message.textContent = 'Your ' + LABELS[type] + ' request is saved. Complete payment now. We activate the pass once payment is confirmed.';
      } else {
        payButton.hidden = true;
        message.textContent = 'Your ' + LABELS[type] + ' request is saved. We will email payment details to ' + email + ' and activate the pass once payment is confirmed.';
      }
      passForm.hidden = true;
      passDone.hidden = false;
      passDone.focus();
    } catch (error) {
      site.setNotice(passNotice, 'bad', error.message);
    } finally {
      site.setBusy(passSubmit, false);
    }
  });

  balanceForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    site.clear(balanceResult);
    if (!balanceForm.reportValidity()) return;
    site.setBusy(balanceSubmit, true, 'Checking...');
    try {
      const result = await api.post('getPassStatus', { email: balanceForm.elements.email.value.trim() });
      if (!result.passes.length) {
        balanceResult.appendChild(el('p', { class: 'notice notice-warn', text: 'No pass was found for that email.' }));
        return;
      }
      result.passes.forEach(function (pass) {
        const active = pass.status === 'active';
        balanceResult.appendChild(el('div', { class: 'summary' }, el('dl', {}, [
          el('dt', { text: 'Pass' }), el('dd', { text: LABELS[pass.type] || pass.type }),
          el('dt', { text: 'Status' }), el('dd', {}, el('span', { class: 'badge ' + (active ? 'badge-ok' : 'badge-warn'), text: STATUS_TEXT[pass.status] || pass.status })),
          el('dt', { text: 'Sessions left' }), el('dd', { text: String(pass.sessionsRemaining) })
        ])));
      });
    } catch (error) {
      balanceResult.appendChild(el('p', { class: 'notice notice-bad', text: error.message }));
    } finally {
      site.setBusy(balanceSubmit, false);
    }
  });
})();
