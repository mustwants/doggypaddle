// File: site/scripts/site.js
// Shared behavior and small helpers used by every page.

(function () {
  'use strict';

  const config = window.PupSwimConfig || {};
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  /** Builds an element. Text is always set as text, never as HTML. */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      const value = attrs[key];
      if (value === null || value === undefined || value === false) return;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'dataset') Object.assign(node.dataset, value);
      else if (key.indexOf('on') === 0 && typeof value === 'function') node.addEventListener(key.substring(2), value);
      else if (value === true) node.setAttribute(key, '');
      else node.setAttribute(key, String(value));
    });
    [].concat(children || []).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  /** "2026-10-05" -> { dow, dom, month, long } without any time zone shifting. */
  function dateParts(dateString) {
    const p = String(dateString).split('-').map(Number);
    const d = new Date(Date.UTC(p[0], p[1] - 1, p[2], 12, 0, 0));
    return {
      dow: DAYS[d.getUTCDay()],
      dom: d.getUTCDate(),
      month: MONTHS[d.getUTCMonth()],
      long: DAYS[d.getUTCDay()] + ', ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear()
    };
  }

  /** "14:30" -> "2:30 PM" */
  function formatTime(time) {
    const m = /^(\d{2}):(\d{2})$/.exec(String(time));
    if (!m) return String(time);
    const h = Number(m[1]);
    return (h % 12 === 0 ? 12 : h % 12) + ':' + m[2] + ' ' + (h >= 12 ? 'PM' : 'AM');
  }

  /** Only https links are ever turned into clickable links. */
  function safeHttpsUrl(value) {
    try {
      const url = new URL(String(value));
      return url.protocol === 'https:' ? url.href : '';
    } catch (error) {
      return '';
    }
  }

  function setNotice(node, kind, message) {
    if (!node) return;
    if (!message) {
      node.hidden = true;
      node.textContent = '';
      return;
    }
    node.className = 'notice' + (kind === 'ok' ? ' notice-ok' : kind === 'bad' ? ' notice-bad' : kind === 'warn' ? ' notice-warn' : '');
    node.textContent = message;
    node.hidden = false;
  }

  function setBusy(button, busy, busyLabel) {
    if (!button) return;
    if (busy) {
      button.dataset.label = button.textContent;
      button.disabled = true;
      button.textContent = busyLabel || 'Working...';
    } else {
      button.disabled = false;
      if (button.dataset.label) button.textContent = button.dataset.label;
    }
  }

  function randomId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  function initPage() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('site-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        const open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
    }

    document.querySelectorAll('[data-year]').forEach(function (node) {
      node.textContent = String(new Date().getFullYear());
    });

    const email = config.CONTACT_EMAIL || '';
    document.querySelectorAll('[data-contact-email]').forEach(function (node) {
      if (!email) return;
      const subject = node.getAttribute('data-subject');
      node.setAttribute('href', 'mailto:' + email + (subject ? '?subject=' + encodeURIComponent(subject) : ''));
      if (node.hasAttribute('data-show-email')) node.textContent = email;
    });

    // Payment buttons: use the Stripe link when one is configured, otherwise fall back to email.
    document.querySelectorAll('[data-stripe-link]').forEach(function (node) {
      const link = safeHttpsUrl((config.STRIPE_LINKS || {})[node.getAttribute('data-stripe-link')] || '');
      if (link) {
        node.setAttribute('href', link);
        node.setAttribute('rel', 'noopener');
      } else if (email) {
        const subject = node.getAttribute('data-subject') || 'PupSwim purchase';
        node.setAttribute('href', 'mailto:' + email + '?subject=' + encodeURIComponent(subject));
        const fallback = node.getAttribute('data-fallback-label');
        if (fallback) node.textContent = fallback;
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPage);
  else initPage();

  window.PupSwimSite = Object.freeze({
    el: el,
    clear: clear,
    dateParts: dateParts,
    formatTime: formatTime,
    safeHttpsUrl: safeHttpsUrl,
    setNotice: setNotice,
    setBusy: setBusy,
    randomId: randomId
  });
})();
