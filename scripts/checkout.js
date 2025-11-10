// checkout.js – placeholder for future Stripe integration
// This version supports adding additional products or dynamic checkout links.

const buyButton = document.getElementById("buy-session");

if (buyButton) {
  buyButton.addEventListener("click", () => {
    window.location.href = "https://buy.stripe.com/14AaEW1GV3vIgaK7fE5J60c";
  });
}
