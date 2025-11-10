document.getElementById("booking-form").addEventListener("submit", async function (e) {
  e.preventDefault();
  const form = this;
  const data = Object.fromEntries(new FormData(form).entries());

  const payload = {
    timestamp: new Date().toISOString(),
    first_name: data.first_name,
    last_name: data.last_name,
    phone: data.phone,
    email: data.email,
    dog1_name: data.dog1_name,
    dog2_name: data.dog2_name || "",
    breed1: data.breed1,
    breed2: data.breed2 || "",
    num_dogs: data.num_dogs,
    slot: data.slot,
    signature: data.signature
  };

  const webhookURL = "https://script.google.com/macros/s/AKfycbz6RDAN-mci6CMYZ5y46ZVHuJDWSYgqOTAjvneOTu9rcX7MC--emJDxMOUKDpjJ5GCZ/exec";

  try {
    await fetch(webhookURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    alert("Booking submitted! Redirecting to Stripe checkout...");
    window.location.href = "https://buy.stripe.com/14AaEW1GV3vIgaK7fE5J60c"; // Stripe test
  } catch (error) {
    console.error("Booking error:", error);
    alert("Error submitting booking. Please try again.");
  }
});

