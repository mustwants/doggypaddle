const {
  verifyGoogleIdToken,
  createSessionToken,
  buildSessionCookie
} = require('./utils');

function parseAllowedAdmins() {
  const envValue = process.env.ALLOWED_ADMINS || '';
  return envValue
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { Allow: 'POST' } };
  }

  const audience = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.SESSION_SECRET;
  const maxAgeSeconds = Number(process.env.SESSION_MAX_AGE || 1800);
  const allowDev = process.env.ALLOW_DEV_LOGIN === 'true';

  if (!audience || !secret) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Authentication is not configured on the server.' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { credential, devEmail } = body;
    let payload;

    if (devEmail) {
      if (!allowDev) {
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Dev login is disabled.' })
        };
      }

      payload = {
        email: devEmail,
        name: 'Development Admin',
        picture: '',
        sub: 'dev-login'
      };
    } else {
      payload = await verifyGoogleIdToken(credential, audience);
    }

    const email = (payload.email || '').toLowerCase();
    const allowedAdmins = parseAllowedAdmins();
    if (allowedAdmins.length > 0 && !allowedAdmins.includes(email)) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Access denied for this account.' })
      };
    }

    const sessionToken = createSessionToken(
      {
        sub: payload.sub || email,
        email,
        name: payload.name || email,
        picture: payload.picture || ''
      },
      secret,
      maxAgeSeconds
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Set-Cookie': buildSessionCookie(sessionToken, maxAgeSeconds)
      },
      body: JSON.stringify({
        email,
        name: payload.name || email,
        picture: payload.picture || '',
        expiresIn: maxAgeSeconds
      })
    };
  } catch (error) {
    console.error('Login failed:', error);
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ message: error.message || 'Unauthorized' })
    };
  }
};
