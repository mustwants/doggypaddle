// ⚠️ IMPORTANT: Update this URL after deploying google-apps-script.gs
//
// DEPLOYMENT STEPS:
// 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1q7yUDjuVSwXfL9PJUTny0oy5Nr5jlVKsdyik2-vTL8I/
// 2. Go to Extensions > Apps Script
// 3. Replace the code with contents from /backend/google-apps-script.gs
// 4. Deploy > New deployment > Web app
// 5. Set "Who has access" to "Anyone"
// 6. Copy the Web App URL
// 7. Either:
//    a) Set GAS_API_ENDPOINT environment variable in Netlify dashboard, OR
//    b) Update DEFAULT_UPSTREAM below with the new URL
//
const DEFAULT_UPSTREAM = 'https://script.google.com/macros/s/AKfycbz8spCI4G3t_gicwPhS_uc2AJ1-059ODLCKNOl1j2r9a_cz16QGmAVaiR-AJlqxWiY5ug/exec';

function buildCorsHeaders(originHeader) {
  const origin = originHeader || 'https://dogpaddle.club';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
}

exports.handler = async function handler(event) {
  const corsHeaders = buildCorsHeaders(event.headers?.origin);

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  const upstream = process.env.GAS_API_ENDPOINT || DEFAULT_UPSTREAM;
  if (!upstream) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ status: 'error', message: 'Missing GAS_API_ENDPOINT configuration' })
    };
  }

  let targetUrl = event.rawQuery ? `${upstream}?${event.rawQuery}` : upstream;

  try {
    // For POST requests, manually handle redirects to preserve POST method
    // Google Apps Script often redirects POST requests, which browsers convert to GET
    let response;

    if (event.httpMethod === 'POST') {
      // First, send request with redirect: 'manual' to get redirect location
      const initialResponse = await fetch(targetUrl, {
        method: event.httpMethod,
        headers: {
          'Content-Type': event.headers['content-type'] || 'application/json'
        },
        body: event.body,
        redirect: 'manual'
      });

      // If redirected, follow to the new location while preserving POST
      if (initialResponse.status >= 300 && initialResponse.status < 400) {
        const redirectUrl = initialResponse.headers.get('location');
        if (redirectUrl) {
          response = await fetch(redirectUrl, {
            method: 'POST',
            headers: {
              'Content-Type': event.headers['content-type'] || 'application/json'
            },
            body: event.body,
            redirect: 'follow'
          });
        } else {
          response = initialResponse;
        }
      } else {
        response = initialResponse;
      }
    } else {
      // GET requests can use normal redirect handling
      response = await fetch(targetUrl, {
        method: event.httpMethod,
        headers: {
          'Content-Type': event.headers['content-type'] || 'application/json'
        },
        redirect: 'follow'
      });
    }

    const responseBody = await response.text();

    return {
      statusCode: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('content-type') || 'application/json'
      },
      body: responseBody
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 'error',
        message: 'Proxy request failed',
        detail: error.message,
        upstream: upstream
      })
    };
  }
};
