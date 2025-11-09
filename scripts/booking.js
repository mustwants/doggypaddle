document.getElementById("booking-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(this).entries());

  // Replace with your Google Apps Script Webhook or Supabase call
  fetch("https://your-backend-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  alert("Booking submitted! Redirecting to Stripe...");
  window.location.href = "https://buy.stripe.com/test_dummyCheckoutURL";
});
