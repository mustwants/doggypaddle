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

  const targetUrl = event.rawQuery ? `${upstream}?${event.rawQuery}` : upstream;

  try {
    const response = await fetch(targetUrl, {
      method: event.httpMethod,
      headers: {
        'Content-Type': event.headers['content-type'] || 'application/json'
      },
      body: event.httpMethod === 'GET' ? undefined : event.body
    });

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
      body: JSON.stringify({ status: 'error', message: 'Proxy request failed', detail: error.message })
    };
  }
};
