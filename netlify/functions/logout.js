const { buildLogoutCookie } = require('./utils');

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { Allow: 'POST' } };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Set-Cookie': buildLogoutCookie()
    },
    body: JSON.stringify({ status: 'signed_out' })
  };
};
