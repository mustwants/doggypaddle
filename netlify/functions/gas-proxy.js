// File: netlify/functions/gas-proxy.js
//
// Same-origin proxy between the PupSwim site and the Google Apps Script backend.
// RETURN TYPE: always JSON (Content-Type: application/json). Never HTML.
//
// Configuration (Netlify > Project configuration > Environment variables), all optional:
//   GAS_API_ENDPOINT   Apps Script Web App URL ending in /exec. Falls back to DEFAULT_UPSTREAM.
//   ALLOWED_ORIGINS    Comma-separated extra origins allowed to call this function cross-origin.
//
// Authorization is NOT done here. The Apps Script backend checks the admin session token on
// every admin action. This function only narrows what can reach the backend.

'use strict';

const DEFAULT_UPSTREAM = 'https://script.google.com/macros/s/AKfycbz8spCI4G3t_gicwPhS_uc2AJ1-059ODLCKNOl1j2r9a_cz16QGmAVaiR-AJlqxWiY5ug/exec';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://pupswim.com',
  'https://www.pupswim.com'
];

const ALLOWED_GET_PARAMS = ['action', 'from', 'to'];
const MAX_BODY_BYTES = 120 * 1024;
const UPSTREAM_TIMEOUT_MS = 25000;

function allowedOrigins() {
  const extra = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  // URL is the site's primary address and DEPLOY_PRIME_URL the current deploy's own address;
  // Netlify sets both automatically so previews and the netlify.app address keep working.
  const fromNetlify = [process.env.URL, process.env.DEPLOY_PRIME_URL].filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...fromNetlify, ...extra]);
}

function getHeader(headers, name) {
  if (!headers) return '';
  const wanted = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === wanted) return String(headers[key] || '');
  }
  return '';
}

function buildHeaders(origin) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Origin'
  };
  if (origin && allowedOrigins().has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '600';
  }
  return headers;
}

function reply(statusCode, headers, payload) {
  return { statusCode, headers, body: JSON.stringify(payload) };
}

function upstreamUrl() {
  const configured = String(process.env.GAS_API_ENDPOINT || '').trim();
  const url = configured || DEFAULT_UPSTREAM;
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)) {
    return '';
  }
  return url;
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** True when the request comes from a page served by this same site (any of its addresses). */
function isSameSite(origin, event) {
  const host = getHeader(event.headers, 'host');
  return !!host && origin === 'https://' + host;
}

exports.handler = async function handler(event) {
  const origin = getHeader(event.headers, 'origin');
  const headers = buildHeaders(origin);
  const method = String(event.httpMethod || '').toUpperCase();

  // A browser only sends Origin on cross-origin requests and on same-origin POSTs.
  // An Origin that is neither this site itself nor on the allowlist is refused.
  if (origin && !isSameSite(origin, event) && !allowedOrigins().has(origin)) {
    return reply(403, headers, { status: 'error', code: 'forbidden_origin', message: 'Origin not allowed.' });
  }

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (method !== 'GET' && method !== 'POST') {
    return reply(405, headers, { status: 'error', code: 'method_not_allowed', message: 'Use GET or POST.' });
  }

  const upstream = upstreamUrl();
  if (!upstream) {
    return reply(500, headers, { status: 'error', code: 'not_configured', message: 'Backend address is not configured.' });
  }

  try {
    let response;

    if (method === 'GET') {
      const incoming = event.queryStringParameters || {};
      const query = new URLSearchParams();
      for (const name of ALLOWED_GET_PARAMS) {
        const value = incoming[name];
        if (typeof value === 'string' && value.length > 0 && value.length <= 64) {
          query.set(name, value);
        }
      }
      if (!query.get('action')) {
        return reply(400, headers, { status: 'error', code: 'bad_request', message: 'Missing action.' });
      }
      response = await fetchWithTimeout(`${upstream}?${query.toString()}`, { method: 'GET', redirect: 'follow' });
    } else {
      const contentType = getHeader(event.headers, 'content-type').toLowerCase();
      if (!contentType.startsWith('application/json')) {
        return reply(415, headers, { status: 'error', code: 'unsupported_media_type', message: 'Send JSON.' });
      }
      const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body || '', 'base64').toString('utf8')
        : String(event.body || '');
      if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
        return reply(413, headers, { status: 'error', code: 'too_large', message: 'Request is too large.' });
      }
      let parsed;
      try {
        parsed = JSON.parse(rawBody);
      } catch (parseError) {
        return reply(400, headers, { status: 'error', code: 'bad_request', message: 'Body must be JSON.' });
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || typeof parsed.action !== 'string') {
        return reply(400, headers, { status: 'error', code: 'bad_request', message: 'Missing action.' });
      }
      // Apps Script answers a POST with a 302 to a one-time result URL that must be read with GET.
      // redirect: 'follow' does exactly that. Re-sending the POST to that URL returns HTTP 405.
      response = await fetchWithTimeout(upstream, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
        redirect: 'follow'
      });
    }

    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (parseError) {
      // Apps Script returns an HTML error page when the script itself fails to run.
      console.error('Backend returned non-JSON. HTTP', response.status, text.slice(0, 300));
      return reply(502, headers, { status: 'error', code: 'bad_gateway', message: 'The booking system is temporarily unavailable.' });
    }
    return reply(200, headers, payload);
  } catch (error) {
    const timedOut = error && error.name === 'AbortError';
    console.error('Proxy request failed:', error && error.message);
    return reply(timedOut ? 504 : 502, headers, {
      status: 'error',
      code: timedOut ? 'timeout' : 'bad_gateway',
      message: 'The booking system is temporarily unavailable. Please try again.'
    });
  }
};

// Exposed for tests only.
exports._internal = { allowedOrigins, buildHeaders, upstreamUrl, DEFAULT_ALLOWED_ORIGINS };
