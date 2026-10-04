# PupSwim

Website for PupSwim, private pool rentals for dogs in St. Augustine, Florida. Live address: https://pupswim.com (the old address, dogpaddle.club, redirects to it).

## How it fits together

| Part | Where it lives | What it does |
| --- | --- | --- |
| Website | `site/` | Static HTML, CSS, and JavaScript. Netlify publishes this folder only. |
| Proxy | `netlify/functions/gas-proxy.js` | Netlify Function. Passes requests from the site to the backend. Returns JSON only. |
| Backend | `backend/Code.gs` | Google Apps Script Web App attached to the PupSwim Google Sheet. `doGet` and `doPost` return JSON only (ContentService), never HTML. |
| Data | Google Sheet tabs named `PupSwim Slots`, `PupSwim Bookings`, `PupSwim Waivers`, `PupSwim Passes`, `PupSwim Shop` | Created automatically by the backend. Tabs from the old site are not touched. |
| Tests | `tests/` | Run locally. Never deployed. |

## Pages

- `/` home, pricing, pool rules
- `/book/` choose a time and reserve a rental
- `/waiver/` sign the liability waiver
- `/club/` request a 5-Session Pack or Swim Club pass, check a pass balance
- `/shop/` product picks that link out to Amazon, Etsy, Printify, or Shopify (no on-site checkout)
- `/admin/` admin dashboard (bookings, time slots, passes, shop items, waivers)

## Security model

- The backend is the only security boundary. Every admin action requires a session token that the backend issues and checks. Nothing the browser stores or claims is trusted.
- Admin sign-in is a one-time link emailed to an address on the allowlist (Apps Script property `ADMIN_ALLOWLIST`, default `scott@mustwants.com`). Links expire in 15 minutes and work once. Sessions last 12 hours.
- Public actions are limited to: list open slots, list shop items, create a booking, sign a waiver, request a pass, check a pass balance.
- A pass requested from the site is always created as pending with zero sessions. Only an admin can activate it.
- Text typed by visitors is cleaned before it is written to the sheet so it cannot run as a spreadsheet formula, and the site never inserts it as HTML.
- Known limit: bookings and pass lookups identify a customer by email address only. Someone who knows a pass holder's email could book with that pass. The pass holder receives a confirmation email for every booking, and an admin can cancel it to return the session.

## Settings you can change without code knowledge

`site/scripts/config.js`: contact email, Stripe Payment Link addresses, merch store address.

## Commands (optional, for a developer)

```
npm test            # backend and proxy tests, no install needed (Node 20 or newer)
npm run preview     # local preview at http://localhost:8788 with an in-memory backend
npm run test:e2e    # browser test, needs Playwright installed
```

Deployment steps are in `docs/DEPLOY.md`.
