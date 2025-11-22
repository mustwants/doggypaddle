const { createHmac, createPublicKey, verify } = require('crypto');

const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
let cachedKeys = { keys: {}, expiry: 0 };

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = 4 - (normalized.length % 4 || 4);
  const padded = normalized + '='.repeat(padLength % 4);
  return Buffer.from(padded, 'base64');
}

async function refreshGoogleKeys() {
  const response = await fetch(GOOGLE_CERTS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Google certs: ${response.status}`);
  }

  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeMs = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) * 1000 : 300000;
  const data = await response.json();
  const keys = {};

  for (const jwk of data.keys || []) {
    if (jwk.kid) {
      keys[jwk.kid] = createPublicKey({ key: jwk, format: 'jwk' });
    }
  }

  cachedKeys = {
    keys,
    expiry: Date.now() + maxAgeMs
  };
}

async function getGooglePublicKey(kid) {
  if (cachedKeys.keys[kid] && cachedKeys.expiry > Date.now()) {
    return cachedKeys.keys[kid];
  }

  await refreshGoogleKeys();
  return cachedKeys.keys[kid];
}

async function verifyGoogleIdToken(idToken, audience) {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing ID token');
  }

  const segments = idToken.split('.');
  if (segments.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [headerB64, payloadB64, signatureB64] = segments;
  const header = JSON.parse(base64UrlDecode(headerB64).toString('utf8'));
  const payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8'));

  const issuer = payload.iss;
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(issuer)) {
    throw new Error('Invalid token issuer');
  }

  if (audience && payload.aud !== audience) {
    throw new Error('Invalid token audience');
  }

  if (payload.exp && payload.exp * 1000 < Date.now()) {
    throw new Error('ID token has expired');
  }

  const key = await getGooglePublicKey(header.kid);
  if (!key) {
    throw new Error('Unable to resolve signing key');
  }

  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = base64UrlDecode(signatureB64);
  const isValid = verify('RSA-SHA256', Buffer.from(signingInput), key, signature);
  if (!isValid) {
    throw new Error('Invalid token signature');
  }

  return payload;
}

function createSessionToken(payload, secret, maxAgeSeconds) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const sessionPayload = {
    ...payload,
    iat: nowSeconds,
    exp: nowSeconds + maxAgeSeconds
  };

  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(sessionPayload));
  const hmac = createHmac('sha256', secret);
  hmac.update(`${headerB64}.${payloadB64}`);
  const signature = base64UrlEncode(hmac.digest());

  return `${headerB64}.${payloadB64}.${signature}`;
}

function verifySessionToken(token, secret) {
  const segments = token.split('.');
  if (segments.length !== 3) {
    throw new Error('Invalid session token format');
  }

  const [headerB64, payloadB64, signatureB64] = segments;
  const signingInput = `${headerB64}.${payloadB64}`;
  const expectedSig = createHmac('sha256', secret)
    .update(signingInput)
    .digest();
  const providedSig = base64UrlDecode(signatureB64);

  if (expectedSig.length !== providedSig.length || !cryptoSafeEqual(expectedSig, providedSig)) {
    throw new Error('Invalid session signature');
  }

  const payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8'));
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    throw new Error('Session expired');
  }

  return payload;
}

function cryptoSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((acc, part) => {
    const [name, ...rest] = part.trim().split('=');
    if (!name) return acc;
    acc[name] = rest.join('=');
    return acc;
  }, {});
}

function buildSessionCookie(token, maxAgeSeconds) {
  const sameSite = 'Strict';
  const secureFlag = process.env.NODE_ENV === 'development' ? '' : '; Secure';
  return `admin_session=${token}; HttpOnly; Path=/; SameSite=${sameSite}; Max-Age=${maxAgeSeconds}${secureFlag}`;
}

function buildLogoutCookie() {
  const secureFlag = process.env.NODE_ENV === 'development' ? '' : '; Secure';
  return `admin_session=; HttpOnly; Path=/; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag}`;
}

module.exports = {
  verifyGoogleIdToken,
  createSessionToken,
  verifySessionToken,
  parseCookies,
  buildSessionCookie,
  buildLogoutCookie
};
