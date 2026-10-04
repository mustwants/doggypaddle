// File: site/scripts/api.js
// One place for every call to the backend. The backend always answers with JSON.

(function () {
  'use strict';

  class ApiError extends Error {
    constructor(code, message) {
      super(message);
      this.name = 'ApiError';
      this.code = code;
    }
  }

  const endpoint = (window.PupSwimConfig && window.PupSwimConfig.API_ENDPOINT) || '';

  async function readJson(response) {
    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      throw new ApiError('bad_response', 'The booking system is temporarily unavailable. Please try again in a minute.');
    }
    if (!payload || payload.status !== 'success') {
      throw new ApiError((payload && payload.code) || 'error', (payload && payload.message) || 'Something went wrong. Please try again.');
    }
    return payload;
  }

  async function send(url, options) {
    if (!endpoint) throw new ApiError('not_configured', 'The booking system is not configured.');
    let response;
    try {
      response = await fetch(url, options);
    } catch (error) {
      throw new ApiError('network', 'Could not reach the booking system. Check your connection and try again.');
    }
    return readJson(response);
  }

  /** Public read. Returns the parsed JSON payload or throws ApiError. */
  function get(action, params) {
    const query = new URLSearchParams(Object.assign({ action: action }, params || {}));
    return send(endpoint + '?' + query.toString(), { method: 'GET', headers: { Accept: 'application/json' } });
  }

  /** Write or admin call. Returns the parsed JSON payload or throws ApiError. */
  function post(action, payload) {
    return send(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(Object.assign({ action: action }, payload || {}))
    });
  }

  window.PupSwimApi = Object.freeze({ get: get, post: post, ApiError: ApiError });
})();
