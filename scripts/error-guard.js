(function() {
  'use strict';

  window.addEventListener('error', event => {
    const filename = event?.filename || '';
    const message = event?.message || '';

    if (filename.includes('content_script.js') && message.includes("reading 'control'")) {
      console.warn('Suppressed third-party content_script control error', {
        filename,
        line: event?.lineno,
        column: event?.colno
      });
      event.preventDefault();
    }
  });
})();
