// scripts/booking.js - Enhanced with Cart Support

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("booking-form");
  const submitButton = form.querySelector("button[type='submit']");

  // Check for active subscription
  checkSubscriptionStatus();

  // Display cart summary in booking section
  displayCartSummary();

   // Enable collapsible booking steps
  initBookingAccordions();
  
  // Form validation
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Check if cart has items
    const cart = JSON.parse(localStorage.getItem('doggypaddle_booking_cart')) || [];
    if (cart.length === 0) {
      alert("Your cart is empty. Please select time slots from the calendar above.");
      return;
    }

    // Disable button to prevent double submission
    submitButton.disabled = true;
    submitButton.textContent = "Processing...";
    form.classList.add("loading");

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Validate number of dogs
    const numDogs = parseInt(data.numDogs);
    if (numDogs < 1 || numDogs > 2) {
      alert("Please select 1 or 2 dogs.");
      resetForm();
      return;
    }

    // Validate checkboxes
    if (!data.ownershipConfirmed) {
      alert("You must confirm ownership or authorization.");
      resetForm();
      return;
    }

    if (!data.waiverAck) {
      alert("You must accept the liability waiver to proceed.");
      resetForm();
      return;
    }

    // Get pricing info
    const pricing = JSON.parse(localStorage.getItem('checkout_pricing') || '{}');

    // Check if user has active subscription
    const subscription = JSON.parse(localStorage.getItem('doggypaddle_subscription') || 'null');
    const isSubscription = subscription && subscription.status === 'active' && cart.length === 1;

    // Format data for submission
    const bookingData = {
      ...data,
      sessions: cart,
      pricing: pricing,
      timestamp: new Date().toISOString(),
      status: "pending",
      isSubscription: isSubscription,
      slotId: cart[0]?.id || ''
    };

    try {
      // Get API endpoint from config
      const endpoint = window.DoggyPaddleConfig?.API_ENDPOINT ||
                       "https://script.google.com/macros/s/YOUR_DEPLOYED_WEBAPP_ID/exec";

      // Check if backend is configured
      const isBackendConfigured = endpoint && !endpoint.includes('YOUR_DEPLOYED_WEBAPP_ID');

      if (!isBackendConfigured) {
        throw new Error(
          "Backend not configured. Please set up the Google Apps Script backend. " +
          "See /backend/README.md for setup instructions."
        );
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "saveBooking", booking: bookingData }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const result = await response.json();

      if (result.status === "success") {
        // Save booking ID for reference
        localStorage.setItem('doggypaddle_booking_id', result.bookingId);

        // Show success message
        showSuccessMessage(isSubscription);

        // Clear cart after successful booking
        localStorage.removeItem('doggypaddle_booking_cart');
        localStorage.removeItem('checkout_cart');
        localStorage.removeItem('checkout_pricing');

        if (isSubscription) {
          // Subscription booking - no payment needed
          setTimeout(() => {
            window.location.href = '/subscription.html?email=' + encodeURIComponent(data.email) + '&booked=true';
          }, 2000);
        } else {
          // Regular booking - redirect to Stripe checkout
          const stripeUrl = window.DoggyPaddleConfig?.STRIPE?.singleSession ||
                          "https://buy.stripe.com/14AaEW1GV3vIgaK7fE5J60c";

          setTimeout(() => {
            window.location.href = stripeUrl;
          }, 2000);
        }
      } else {
        throw new Error(result.message || "Booking submission failed");
      }
    } catch (error) {
      console.error("Booking error:", error);
      showErrorMessage(error.message);
    } finally {
      resetForm();
    }
  });

  function displayCartSummary() {
    const cart = JSON.parse(localStorage.getItem('doggypaddle_booking_cart')) || [];
    const bookingSection = document.getElementById('booking');
       const cartMount = document.getElementById('cart-summary-mount');

    // Remove existing cart summary if present
    const existingSummary = document.getElementById('cart-summary-display');
    if (existingSummary) existingSummary.remove();

    if (cart.length === 0) {
      return; // No cart to display
    }

    // Calculate pricing
    const PRICE_PER_SLOT = 25;
    const DISCOUNT_THRESHOLD = 5;
    const totalSlots = cart.length;
    const fullPriceSlots = totalSlots - Math.floor(totalSlots / DISCOUNT_THRESHOLD);
    const freeSlots = Math.floor(totalSlots / DISCOUNT_THRESHOLD);
    const subtotal = totalSlots * PRICE_PER_SLOT;
    const discount = freeSlots * PRICE_PER_SLOT;
    const total = fullPriceSlots * PRICE_PER_SLOT;

    // Create cart summary element
    const summaryDiv = document.createElement('div');
    summaryDiv.id = 'cart-summary-display';
    summaryDiv.className = 'cart-summary-display';
    summaryDiv.innerHTML = `
      <div class="cart-summary-header">
        <h3>Your Selected Sessions</h3>
        <button type="button" class="edit-cart-btn" onclick="document.getElementById('booking-cart-sidebar').classList.add('open')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit Cart
        </button>
      </div>
      <div class="cart-summary-items">
        ${cart.map(item => `
          <div class="cart-summary-item">
            <div class="item-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div class="item-details">
              <div class="item-date">${formatDateLong(item.date)}</div>
              <div class="item-time">${formatTime(item.time)} (${item.duration} min)</div>
            </div>
            <div class="item-price">$${item.price}</div>
          </div>
        `).join('')}
      </div>
      <div class="cart-summary-pricing">
        ${freeSlots > 0 ? `
          <div class="pricing-discount-badge">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            You're saving $${discount.toFixed(2)} with ${freeSlots} free session${freeSlots > 1 ? 's' : ''}!
          </div>
        ` : ''}
        <div class="pricing-row">
          <span>Subtotal (${totalSlots} session${totalSlots > 1 ? 's' : ''})</span>
          <span>$${subtotal.toFixed(2)}</span>
        </div>
        ${discount > 0 ? `
          <div class="pricing-row discount">
            <span>Discount (${freeSlots} free)</span>
            <span>-$${discount.toFixed(2)}</span>
          </div>
        ` : ''}
        <div class="pricing-row total">
          <span>Total Amount</span>
          <span>$${total.toFixed(2)}</span>
        </div>
      </div>
    `;

    // Insert at the beginning of the booking section
    // Insert at the beginning of the booking section
    if (cartMount) {
      cartMount.innerHTML = '';
      cartMount.appendChild(summaryDiv);
    } else {
      const firstElement = bookingSection.querySelector('h2');
      if (firstElement) {
        firstElement.after(summaryDiv);
      } else {
        bookingSection.insertBefore(summaryDiv, bookingSection.firstChild);
      }
    }
  }

function initBookingAccordions() {
    const steps = Array.from(document.querySelectorAll('.booking-step'));

    if (steps.length === 0) return;

    const toggleStep = (step, expand) => {
      const header = step.querySelector('.step-header');
      const content = step.querySelector('.step-content');

      if (!header || !content) return;

      if (expand) {
        step.classList.add('expanded');
        header.setAttribute('aria-expanded', 'true');
        content.removeAttribute('hidden');
      } else {
        step.classList.remove('expanded');
        header.setAttribute('aria-expanded', 'false');
        content.setAttribute('hidden', 'true');
      }
    };

    steps.forEach((step, index) => {
      const header = step.querySelector('.step-header');
      if (!header) return;

      header.addEventListener('click', () => {
        const shouldExpand = !step.classList.contains('expanded');
        steps.forEach((s) => toggleStep(s, false));
        if (shouldExpand) {
          toggleStep(step, true);
        }
      });

      header.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          header.click();
        }
      });

      // Default to expanded for the first step to guide users
      if (index === 0) {
        toggleStep(step, true);
      } else {
        toggleStep(step, false);
      }
    });
  }
  function formatTime(timeString) {
    if (!timeString) {
      return 'Invalid Time';
    }

    // Handle ISO datetime strings (e.g., "1899-12-30T14:00:00.000Z")
    if (typeof timeString === 'string' && timeString.includes('T')) {
      try {
        const date = new Date(timeString);
        const hour = date.getUTCHours();
        const min = date.getUTCMinutes();
        const ampm = hour >= 12 ? "pm" : "am";
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const displayMinutes = String(min).padStart(2, '0');
        return `${displayHour}:${displayMinutes}${ampm}`;
      } catch (e) {
        console.error('Error parsing datetime:', timeString, e);
        return 'Invalid Time';
      }
    }

    // Handle simple time strings (e.g., "14:00")
    if (typeof timeString !== 'string') {
      return 'Invalid Time';
    }

    const parts = timeString.split(":");
    if (parts.length < 2) {
      return 'Invalid Time';
    }

    const [hours, minutes] = parts;
    const hour = parseInt(hours, 10);
    const min = parseInt(minutes, 10);

    // Validate hour and minute ranges
    if (isNaN(hour) || isNaN(min) || hour < 0 || hour > 23 || min < 0 || min > 59) {
      console.error('Invalid time format:', timeString);
      return 'Invalid Time';
    }

    const ampm = hour >= 12 ? "pm" : "am";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const displayMinutes = String(min).padStart(2, '0');
    return `${displayHour}:${displayMinutes}${ampm}`;
  }

  function formatDateLong(dateString) {
    const date = new Date(dateString + 'T12:00:00');
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function resetForm() {
    submitButton.disabled = false;
    submitButton.textContent = "Complete Booking & Pay with Stripe";
    form.classList.remove("loading");
  }

  function showSuccessMessage(isSubscription = false) {
    const message = document.createElement("div");
    message.className = "alert alert-success";
    message.innerHTML = `
      <strong>✓ Booking Submitted!</strong><br>
      ${isSubscription ? 'Your session has been booked using your subscription!' : 'Redirecting you to secure payment...'}
    `;
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #d4edda;
      color: #155724;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      max-width: 400px;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(message);

    setTimeout(() => {
      message.remove();
    }, 5000);
  }

  function showErrorMessage(errorMsg) {
    const message = document.createElement("div");
    message.className = "alert alert-error";

    // Prevent XSS by using textContent instead of innerHTML for user/server-provided messages
    const title = document.createElement("strong");
    title.textContent = "✗ Booking Failed";

    const br = document.createElement("br");

    const errorText = document.createTextNode(
      errorMsg || "Please try again or contact us for assistance."
    );

    message.appendChild(title);
    message.appendChild(br);
    message.appendChild(errorText);

    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f8d7da;
      color: #721c24;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      max-width: 400px;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(message);

    setTimeout(() => {
      message.remove();
    }, 5000);
  }

  // Real-time form validation feedback
  const inputs = form.querySelectorAll("input[required], select[required]");
  inputs.forEach((input) => {
    input.addEventListener("blur", () => {
      if (!input.value) {
        input.style.borderColor = "#dc3545";
      } else {
        input.style.borderColor = "#28a745";
      }
    });

    input.addEventListener("input", () => {
      if (input.value) {
        input.style.borderColor = "#28a745";
      }
    });
  });

  // Email validation
  const emailInput = document.getElementById("email");
  if (emailInput) {
    emailInput.addEventListener("blur", () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailInput.value && !emailRegex.test(emailInput.value)) {
        emailInput.style.borderColor = "#dc3545";
        showTooltip(emailInput, "Please enter a valid email address");
      } else if (emailInput.value) {
        emailInput.style.borderColor = "#28a745";
      }
    });
  }

  // Phone validation
  const phoneInput = document.getElementById("phone");
  if (phoneInput) {
    phoneInput.addEventListener("blur", () => {
      const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
      if (phoneInput.value && !phoneRegex.test(phoneInput.value)) {
        phoneInput.style.borderColor = "#dc3545";
        showTooltip(phoneInput, "Please enter a valid phone number");
      } else if (phoneInput.value) {
        phoneInput.style.borderColor = "#28a745";
      }
    });
  }

  function showTooltip(element, message) {
    const existing = element.parentElement.querySelector(".tooltip");
    if (existing) existing.remove();

    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.textContent = message;
    tooltip.style.cssText = `
      position: absolute;
      background: #dc3545;
      color: white;
      padding: 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
      margin-top: 0.25rem;
      z-index: 100;
    `;

    element.parentElement.style.position = "relative";
    element.parentElement.appendChild(tooltip);

    setTimeout(() => tooltip.remove(), 3000);
  }

  // Listen for cart changes to update the summary
  window.addEventListener('storage', (e) => {
    if (e.key === 'doggypaddle_booking_cart') {
      displayCartSummary();
    }
  });

  // Also listen for custom event from calendar
  window.addEventListener('cartUpdated', () => {
    displayCartSummary();
  });

  // Check subscription status and display banner
  async function checkSubscriptionStatus() {
    const email = localStorage.getItem('doggypaddle_subscription_email');
    if (!email) return;

    try {
      const endpoint = window.DoggyPaddleConfig?.API_ENDPOINT;
      if (!endpoint || endpoint.includes('YOUR_DEPLOYED_WEBAPP_ID')) {
        return;
      }

      const response = await fetch(`${endpoint}?action=getSubscription&email=${encodeURIComponent(email)}`);
      const result = await response.json();

      if (result.status === 'success' && result.subscription) {
        const subscription = result.subscription;
        localStorage.setItem('doggypaddle_subscription', JSON.stringify(subscription));
        displaySubscriptionBanner(subscription);
      } else {
        localStorage.removeItem('doggypaddle_subscription_email');
        localStorage.removeItem('doggypaddle_subscription');
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  }

  function displaySubscriptionBanner(subscription) {
    const bookingSection = document.getElementById('booking');
    if (!bookingSection) return;

    // Remove existing banner if present
    const existingBanner = document.getElementById('subscription-banner');
    if (existingBanner) existingBanner.remove();

    // Create banner
    const banner = document.createElement('div');
    banner.id = 'subscription-banner';
    banner.className = 'subscription-banner';
    banner.innerHTML = `
      <div class="banner-content">
        <div class="banner-icon">🏊</div>
        <div class="banner-text">
          <h3>Dog Swim Club Member</h3>
          <p>You have <strong>${subscription.sessionsRemaining} sessions</strong> remaining this month</p>
        </div>
        <a href="/subscription.html?email=${encodeURIComponent(subscription.email)}" class="banner-button">
          Manage Subscription
        </a>
      </div>
    `;

    // Insert at the beginning of the booking section
    const firstElement = bookingSection.querySelector('h2');
    if (firstElement) {
      firstElement.after(banner);
    } else {
      bookingSection.insertBefore(banner, bookingSection.firstChild);
    }
  }
});

// Add styles for cart summary and subscription banner
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .subscription-banner {
    background: linear-gradient(135deg, #028090 0%, #02C39A 100%);
    border-radius: 16px;
    padding: 2rem;
    margin: 2rem 0;
    box-shadow: 0 4px 16px rgba(2, 128, 144, 0.2);
  }

  .banner-content {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    color: white;
  }

  .banner-icon {
    font-size: 3rem;
    flex-shrink: 0;
  }

  .banner-text {
    flex: 1;
  }

  .banner-text h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    color: white;
  }

  .banner-text p {
    margin: 0;
    opacity: 0.95;
  }

  .banner-button {
    background: white;
    color: var(--primary);
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .banner-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  @media (max-width: 768px) {
    .banner-content {
      flex-direction: column;
      text-align: center;
    }

    .banner-button {
      width: 100%;
    }
  }

  .cart-summary-display {
    background: linear-gradient(135deg, #e6f7f9 0%, #f0fbfd 100%);
    border: 2px solid var(--primary);
    border-radius: 16px;
    padding: 2rem;
    margin: 2rem 0;
    box-shadow: 0 4px 16px rgba(2, 128, 144, 0.15);
  }

  .cart-summary-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid rgba(2, 128, 144, 0.2);
  }

  .cart-summary-header h3 {
    margin: 0;
    color: var(--secondary);
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .edit-cart-btn {
    background: var(--primary);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
  }

  .edit-cart-btn:hover {
    background: var(--primary-dark);
    transform: translateY(-2px);
  }

  .cart-summary-items {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .cart-summary-item {
    background: white;
    padding: 1rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transition: all 0.2s ease;
  }

  .cart-summary-item:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  .item-icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }

  .item-details {
    flex: 1;
  }

  .item-date {
    font-weight: 600;
    color: var(--secondary);
    margin-bottom: 0.25rem;
  }

  .item-time {
    color: var(--text-light);
    font-size: 0.9rem;
  }

  .item-price {
    font-weight: 700;
    color: var(--primary);
    font-size: 1.1rem;
  }

  .cart-summary-pricing {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .pricing-discount-badge {
    background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
    color: white;
    padding: 0.875rem 1rem;
    border-radius: 10px;
    margin-bottom: 1rem;
    font-weight: 600;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
  }

  .pricing-row {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem 0;
    color: var(--text);
    border-bottom: 1px solid var(--border);
  }

  .pricing-row:last-child {
    border-bottom: none;
  }

  .pricing-row.discount {
    color: #22c55e;
    font-weight: 600;
  }

  .pricing-row.total {
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--secondary);
    padding-top: 1rem;
    margin-top: 0.5rem;
    border-top: 2px solid var(--border);
    border-bottom: none;
  }

  @media (max-width: 768px) {
    .cart-summary-display {
      padding: 1.5rem;
    }

    .cart-summary-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .edit-cart-btn {
      width: 100%;
      justify-content: center;
    }

    .cart-summary-item {
      flex-direction: column;
      align-items: flex-start;
      text-align: left;
    }

    .item-price {
      align-self: flex-end;
    }
  }
`;
document.head.appendChild(style);
