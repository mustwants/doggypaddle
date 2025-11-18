// Subscription Management Script
document.addEventListener('DOMContentLoaded', () => {
  checkSubscriptionStatus();
  setupSubscriptionForm();
});

// Check if user has an active subscription
async function checkSubscriptionStatus() {
  // Check for email in URL params or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email') || localStorage.getItem('doggypaddle_subscription_email');

  if (!email) {
    showSignupView();
    return;
  }

  try {
    const endpoint = window.DoggyPaddleConfig?.API_ENDPOINT;
    if (!endpoint || endpoint.includes('YOUR_DEPLOYED_WEBAPP_ID')) {
      showError('Backend not configured');
      return;
    }

    const response = await fetch(`${endpoint}?action=getSubscription&email=${encodeURIComponent(email)}`);
    const result = await response.json();

    if (result.status === 'success' && result.subscription) {
      localStorage.setItem('doggypaddle_subscription_email', email);
      showSubscriptionView(result.subscription);
    } else {
      localStorage.removeItem('doggypaddle_subscription_email');
      showSignupView();
    }
  } catch (error) {
    console.error('Error checking subscription:', error);
    showSignupView();
  }
}

// Show subscription management view
function showSubscriptionView(subscription) {
  document.getElementById('subscription-view').style.display = 'block';
  document.getElementById('signup-view').style.display = 'none';

  // Update subscription details
  document.getElementById('subscriber-name').textContent = `Welcome back, ${subscription.firstName}!`;
  document.getElementById('subscriber-email').textContent = subscription.email;
  document.getElementById('sessions-remaining').textContent = subscription.sessionsRemaining;
  document.getElementById('sessions-used').textContent = subscription.sessionsUsedThisMonth;
  document.getElementById('status-badge').textContent = subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1);

  // Format next billing date
  const nextBillingDate = new Date(subscription.nextBillingDate);
  document.getElementById('next-billing').textContent = nextBillingDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  // Store subscription info for booking
  localStorage.setItem('doggypaddle_subscription', JSON.stringify(subscription));
}

// Show signup view
function showSignupView() {
  document.getElementById('subscription-view').style.display = 'none';
  document.getElementById('signup-view').style.display = 'block';
}

// Setup subscription form submission
function setupSubscriptionForm() {
  const form = document.getElementById('subscription-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Processing...';
    form.classList.add('loading');

    const formData = new FormData(form);
    const data = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      phone: formData.get('phone')
    };

    try {
      const endpoint = window.DoggyPaddleConfig?.API_ENDPOINT;
      if (!endpoint || endpoint.includes('YOUR_DEPLOYED_WEBAPP_ID')) {
        throw new Error('Backend not configured. Please set up the Google Apps Script backend.');
      }

      // Save subscription to backend
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'saveSubscription',
          subscription: data
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        // Store email for later
        localStorage.setItem('doggypaddle_subscription_email', data.email);
        localStorage.setItem('doggypaddle_subscription_pending', JSON.stringify(data));

        // Redirect to Stripe for payment
        const stripeUrl = window.DoggyPaddleConfig?.STRIPE?.subscription ||
                         window.DoggyPaddleConfig?.STRIPE?.singleSession;

        // Add email to URL so we can identify the customer after payment
        const checkoutUrl = `${stripeUrl}?client_reference_id=${encodeURIComponent(data.email)}`;

        showSuccess('Subscription created! Redirecting to payment...');

        setTimeout(() => {
          window.location.href = checkoutUrl;
        }, 1500);
      } else {
        throw new Error(result.message || 'Failed to create subscription');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      showError(error.message);
      submitButton.disabled = false;
      submitButton.textContent = 'Subscribe Now - $75/month';
      form.classList.remove('loading');
    }
  });
}

// Cancel subscription
async function cancelSubscription() {
  if (!confirm('Are you sure you want to cancel your subscription? You can continue using your remaining sessions until the end of your billing period.')) {
    return;
  }

  const subscription = JSON.parse(localStorage.getItem('doggypaddle_subscription') || '{}');

  try {
    const endpoint = window.DoggyPaddleConfig?.API_ENDPOINT;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'cancelSubscription',
        subscriptionId: subscription.id
      })
    });

    const result = await response.json();

    if (result.status === 'success') {
      showSuccess('Subscription cancelled successfully');
      setTimeout(() => {
        localStorage.removeItem('doggypaddle_subscription_email');
        localStorage.removeItem('doggypaddle_subscription');
        window.location.reload();
      }, 2000);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Cancel error:', error);
    showError('Failed to cancel subscription: ' + error.message);
  }
}

// View billing history (placeholder - would integrate with Stripe)
function viewBillingHistory() {
  alert('Billing history feature coming soon! For now, please check your email for payment receipts or contact us.');
}

// Show success message
function showSuccess(message) {
  const alert = document.createElement('div');
  alert.className = 'alert alert-success';
  alert.innerHTML = `<strong>✓ Success!</strong><br>${message}`;
  alert.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000; max-width: 400px;';
  document.body.appendChild(alert);

  setTimeout(() => alert.remove(), 5000);
}

// Show error message
function showError(message) {
  const alert = document.createElement('div');
  alert.className = 'alert alert-error';
  alert.innerHTML = `<strong>✗ Error</strong><br>${message}`;
  alert.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000; max-width: 400px;';
  document.body.appendChild(alert);

  setTimeout(() => alert.remove(), 5000);
}

// Make functions available globally
window.cancelSubscription = cancelSubscription;
window.viewBillingHistory = viewBillingHistory;
