//scripts/booking.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("booking-form");
  const submitButton = form.querySelector("button[type='submit']");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Validate required waiver checkbox
    if (!data.waiverAck) {
      alert("You must accept the liability waiver.");
      submitButton.disabled = false;
      submitButton.textContent = "Submit + Pay";
      return;
    }

    // Google Apps Script Web App URL (Replace with your actual deployed URL)
    const endpoint = "https://script.google.com/macros/s/YOUR_DEPLOYED_WEBAPP_ID/exec";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (result.status === "success") {
        alert("Booking submitted! Redirecting to Stripe...");
        window.location.href = "https://buy.stripe.com/14AaEW1GV3vIgaK7fE5J60c"; // Live buy link
      } else {
        throw new Error("Booking failed.");
      }
    } catch (err) {
      console.error("Booking error:", err);
      alert("Error submitting booking. Please try again or contact us.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Submit + Pay";
    }
  });
});
