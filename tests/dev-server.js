// File: tests/dev-server.js
// Local preview server. Serves the site/ folder and answers /.netlify/functions/gas-proxy
// from an in-memory copy of the backend (tests/gas-mock.js), so the whole site can be clicked
// through without touching Google or Netlify. Nothing here is deployed.
//
// Run: node tests/dev-server.js   then open http://localhost:8788
// Emails "sent" by the backend are printed to this terminal and listed at /__outbox.

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { createBackend } = require('./gas-mock');

const SITE_DIR = path.join(__dirname, '..', 'site');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.json': 'application/json'
};

// Same policy as netlify.toml, so the preview catches anything the live policy would block.
const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self'; " +
  "connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

function startServer(port, options) {
  const backend = createBackend(options);
  backend.properties.set('SITE_URL', 'http://localhost:' + port);

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname === '/__outbox') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(backend.outbox));
      return;
    }

    if (url.pathname === '/.netlify/functions/gas-proxy') {
      const finish = (payload) => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(payload));
      };
      if (req.method === 'GET') {
        finish(backend.get(Object.fromEntries(url.searchParams)));
        return;
      }
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        const before = backend.outbox.length;
        const payload = backend.postRaw(body);
        backend.outbox.slice(before).forEach((mail) => {
          if (!options || !options.quiet) console.log('\n--- email to ' + mail.to + ' ---\n' + mail.subject + '\n' + mail.body + '\n');
        });
        finish(payload);
      });
      return;
    }

    let filePath = path.normalize(path.join(SITE_DIR, decodeURIComponent(url.pathname)));
    if (!filePath.startsWith(SITE_DIR)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': CSP });
      res.end(fs.readFileSync(path.join(SITE_DIR, '404.html')));
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(filePath)] || 'application/octet-stream',
      'Content-Security-Policy': CSP,
      'Cache-Control': 'no-store'
    });
    res.end(fs.readFileSync(filePath));
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({ server, backend, origin: 'http://localhost:' + port }));
  });
}

module.exports = { startServer };

if (require.main === module) {
  const port = Number(process.env.PORT || 8788);
  startServer(port).then(({ origin }) => {
    console.log('PupSwim preview running at ' + origin);
    console.log('Admin sign-in links are printed here instead of being emailed.');
  });
}
