(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registration-form');
    const statusBox = document.getElementById('registration-status');

    if (!form || !statusBox) {
      return;
    }

    prefillRegistrationForm();

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';
      setStatus('info', 'Submitting your registration...');

      const formData = new FormData(form);
      const registration = Object.fromEntries(formData.entries());

      try {
        const endpoint = window.DoggyPaddleConfig?.API_ENDPOINT;
        if (!endpoint || endpoint.includes('YOUR_DEPLOYED_WEBAPP_ID')) {
          throw new Error('Backend not configured. Please configure API_ENDPOINT in scripts/config.js.');
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'registerUser', registration })
        });

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        const result = await response.json();
        if (result.status !== 'success') {
          throw new Error(result.message || 'Registration failed');
        }

        setStatus('success', 'Registration received! Status set to pending while we review your details.');
        const savedRegistration = { ...registration, id: result.registrationId, status: 'pending' };
        localStorage.setItem('doggypaddle_registration', JSON.stringify(savedRegistration));
        form.reset();
        syncSubscriptionForm(savedRegistration);
      } catch (error) {
        console.error('Registration error:', error);
        setStatus('error', error.message);
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit registration for approval';
      }
    });

    function setStatus(type, message) {
      statusBox.style.display = 'block';
      statusBox.className = 'alert alert-' + (type === 'error' ? 'error' : type === 'success' ? 'success' : 'info');
      statusBox.textContent = message;
    }

    function prefillRegistrationForm() {
      const saved = JSON.parse(localStorage.getItem('doggypaddle_registration') || 'null');
      if (!saved) return;

      form.firstName.value = saved.firstName || '';
      form.lastName.value = saved.lastName || '';
      form.email.value = saved.email || '';
      form.phone.value = saved.phone || '';
      form.dogNames.value = saved.dogNames || '';
      form.notes.value = saved.notes || '';
      setStatus('info', 'We found a pending registration for you. Update any details and resubmit if needed.');
      syncSubscriptionForm(saved);
    }

    function syncSubscriptionForm(registration) {
      const subForm = document.getElementById('subscription-form');
      if (!subForm) return;

      const mapping = {
        firstName: 'sub-firstName',
        lastName: 'sub-lastName',
        email: 'sub-email',
        phone: 'sub-phone'
      };

      Object.entries(mapping).forEach(([key, id]) => {
        const input = document.getElementById(id);
        if (input && registration[key]) {
          input.value = registration[key];
        }
      });
    }
  });
})();
