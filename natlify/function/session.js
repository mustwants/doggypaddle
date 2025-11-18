const { parseCookies, verifySessionToken } = require('./utils');

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: { Allow: 'GET' } };
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Session verification is not configured.' })
    };
  }

  try {
    const cookies = parseCookies(event.headers.cookie || '');
    const token = cookies.admin_session;

    if (!token) {
      return { statusCode: 401, headers: { 'Cache-Control': 'no-store' } };
    }

    const payload = verifySessionToken(token, secret);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        exp: payload.exp
      })
    };
  } catch (error) {
    console.warn('Session validation failed:', error);
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ message: 'Session expired or invalid.' })
    };
  }
};
