// File: tests/proxy.test.js
// Run with: npm test
// Checks netlify/functions/gas-proxy.js with a stand-in for the network.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handler } = require('../netlify/functions/gas-proxy');

function withFetch(fake, fn) {
  const real = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => { calls.push({ url: String(url), options }); return fake(url, options); };
  return fn(calls).finally(() => { global.fetch = real; });
}

const okJson = (payload) => async () => new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });
const body = (result) => JSON.parse(result.body);

test('GET forwards only allowlisted parameters and returns JSON', () => withFetch(okJson({ status: 'success', slots: [] }), async (calls) => {
  const result = await handler({ httpMethod: 'GET', headers: {}, queryStringParameters: { action: 'getAvailableSlots', from: '2026-10-05', adminToken: 'x', evil: '1' } });
  assert.equal(result.statusCode, 200);
  assert.match(result.headers['Content-Type'], /^application\/json/);
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal(body(result).status, 'success');
  const sent = new URL(calls[0].url);
  assert.equal(sent.hostname, 'script.google.com');
  assert.deepEqual([...sent.searchParams.keys()].sort(), ['action', 'from']);
  assert.equal(result.headers['Access-Control-Allow-Origin'], undefined, 'no CORS header without an allowed Origin');
}));

test('POST is sent once and the Apps Script redirect is followed, not re-posted', () => withFetch(okJson({ status: 'success' }), async (calls) => {
  const result = await handler({ httpMethod: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://pupswim.com' }, body: JSON.stringify({ action: 'saveBooking', booking: {} }) });
  assert.equal(result.statusCode, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.redirect, 'follow');
  assert.equal(result.headers['Access-Control-Allow-Origin'], 'https://pupswim.com');
}));

test('requests from other websites are refused before reaching the backend', () => withFetch(okJson({ status: 'success' }), async (calls) => {
  for (const origin of ['https://evil.example', 'https://pupswim.com.evil.example', 'http://pupswim.com', 'null']) {
    const result = await handler({ httpMethod: 'POST', headers: { 'content-type': 'application/json', origin }, body: '{"action":"adminGetBookings"}' });
    assert.equal(result.statusCode, 403, origin);
    assert.equal(result.headers['Access-Control-Allow-Origin'], undefined, origin);
  }
  assert.equal(calls.length, 0);
}));

test('the site can call the function from any of its own addresses', () => withFetch(okJson({ status: 'success' }), async (calls) => {
  const preview = await handler({ httpMethod: 'POST', headers: { 'content-type': 'application/json', origin: 'https://deploy-preview-7--doggypaddle.netlify.app', host: 'deploy-preview-7--doggypaddle.netlify.app' }, body: '{"action":"saveBooking"}' });
  assert.equal(preview.statusCode, 200);
  const spoof = await handler({ httpMethod: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example', host: 'pupswim.com' }, body: '{"action":"saveBooking"}' });
  assert.equal(spoof.statusCode, 403);
  assert.equal(calls.length, 1);
}));

test('bad requests are rejected with JSON errors', () => withFetch(okJson({ status: 'success' }), async (calls) => {
  const cases = [
    [{ httpMethod: 'DELETE', headers: {} }, 405],
    [{ httpMethod: 'GET', headers: {}, queryStringParameters: {} }, 400],
    [{ httpMethod: 'POST', headers: { 'content-type': 'text/plain' }, body: '{"action":"x"}' }, 415],
    [{ httpMethod: 'POST', headers: { 'content-type': 'application/json' }, body: 'not json' }, 400],
    [{ httpMethod: 'POST', headers: { 'content-type': 'application/json' }, body: '[]' }, 400],
    [{ httpMethod: 'POST', headers: { 'content-type': 'application/json' }, body: '{"noaction":1}' }, 400],
    [{ httpMethod: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'x', pad: 'a'.repeat(130 * 1024) }) }, 413]
  ];
  for (const [event, status] of cases) {
    const result = await handler(event);
    assert.equal(result.statusCode, status);
    assert.equal(body(result).status, 'error');
  }
  assert.equal(calls.length, 0);
  const preflight = await handler({ httpMethod: 'OPTIONS', headers: { origin: 'https://www.pupswim.com' } });
  assert.equal(preflight.statusCode, 204);
  assert.equal(preflight.headers['Access-Control-Allow-Origin'], 'https://www.pupswim.com');
}));

test('backend failures never leak details', async () => {
  await withFetch(async () => new Response('<html>Script error at line 12</html>', { status: 200 }), async () => {
    const result = await handler({ httpMethod: 'GET', headers: {}, queryStringParameters: { action: 'ping' } });
    assert.equal(result.statusCode, 502);
    assert.ok(!result.body.includes('line 12'));
    assert.ok(!result.body.includes('script.google.com'));
  });
  await withFetch(async () => { throw new Error('connect ECONNREFUSED 10.0.0.1'); }, async () => {
    const result = await handler({ httpMethod: 'GET', headers: {}, queryStringParameters: { action: 'ping' } });
    assert.equal(result.statusCode, 502);
    assert.ok(!result.body.includes('10.0.0.1'));
  });
});

test('a misconfigured backend address is refused', async () => {
  process.env.GAS_API_ENDPOINT = 'https://evil.example/collect';
  try {
    const result = await handler({ httpMethod: 'GET', headers: {}, queryStringParameters: { action: 'ping' } });
    assert.equal(result.statusCode, 500);
    assert.equal(body(result).code, 'not_configured');
  } finally {
    delete process.env.GAS_API_ENDPOINT;
  }
});
