// scripts/booking.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("booking-form");
  const submitButton = form.querySelector("button[type='submit']");

  // Set minimum date/time to now
  const sessionTimeInput = document.getElementById("sessionTime");
  const now = new Date();
  const minDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  sessionTimeInput.min = minDateTime;

  // Form validation
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

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

    // Validate date is in the future
    const selectedDate = new Date(data.sessionTime);
    if (selectedDate <= new Date()) {
      alert("Please select a future date and time.");
      resetForm();
      return;
    }

    // Format data for submission
    const bookingData = {
      ...data,
      timestamp: new Date().toISOString(),
      status: "pending",
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
        showSuccessMessage();

        // Redirect to Stripe checkout with booking metadata
        const stripeUrl = window.DoggyPaddleConfig?.STRIPE?.singleSession ||
                         "https://buy.stripe.com/14AaEW1GV3vIgaK7fE5J60c";

        setTimeout(() => {
          window.location.href = stripeUrl;
        }, 2000);
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

  function resetForm() {
    submitButton.disabled = false;
    submitButton.textContent = "Submit Booking & Pay with Stripe";
    form.classList.remove("loading");
  }

  function showSuccessMessage() {
    const message = document.createElement("div");
    message.className = "alert alert-success";
    message.innerHTML = `
      <strong>✓ Booking Submitted!</strong><br>
      Redirecting you to secure payment...
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
    message.innerHTML = `
      <strong>✗ Booking Failed</strong><br>
      ${errorMsg || "Please try again or contact us for assistance."}
    `;
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
  emailInput.addEventListener("blur", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailInput.value && !emailRegex.test(emailInput.value)) {
      emailInput.style.borderColor = "#dc3545";
      showTooltip(emailInput, "Please enter a valid email address");
    } else if (emailInput.value) {
      emailInput.style.borderColor = "#28a745";
    }
  });

  // Phone validation
  const phoneInput = document.getElementById("phone");
  phoneInput.addEventListener("blur", () => {
    const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
    if (phoneInput.value && !phoneRegex.test(phoneInput.value)) {
      phoneInput.style.borderColor = "#dc3545";
      showTooltip(phoneInput, "Please enter a valid phone number");
    } else if (phoneInput.value) {
      phoneInput.style.borderColor = "#28a745";
    }
  });

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
});

// Add animation keyframes
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
`;
document.head.appendChild(style);
