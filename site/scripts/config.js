// File: site/scripts/config.js
// Site-wide settings. This file is public: never put a secret key or password here.
//
// STRIPE_LINKS: paste Stripe Payment Link addresses (they start with https://buy.stripe.com/).
//   Leave a value as '' until that link exists. The page then shows an "email us" button
//   for that product instead of a payment button.
// MERCH_STORE_URL: the address of your Printify Pop-Up Store. Leave as '' to hide the merch button.

window.PupSwimConfig = Object.freeze({
  API_ENDPOINT: '/.netlify/functions/gas-proxy',
  CONTACT_EMAIL: 'pupswim@mustwants.com',
  PRICES: Object.freeze({ single: 25, pack5: 100, club: 75 }),
  STRIPE_LINKS: Object.freeze({
    single: 'https://buy.stripe.com/14AaEW1GV3vIgaK7fE5J60c',
    pack5: '',
    club: '',
    giftCard: ''
  }),
  MERCH_STORE_URL: '',
  WAIVER_VERSION: '2026-10-03',
  TIMEZONE: 'America/New_York'
});
