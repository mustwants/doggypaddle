# PupSwim deployment checklist

Do the steps in this order. Steps 1 to 3 must be finished before step 4, because step 4 turns on the redirect from dogpaddle.club to pupswim.com.

The screen labels below were not re-checked against the live Google, Netlify, and Stripe screens on the day this file was written. If a label does not match what you see, stop and ask rather than guessing.

## 1. Backend: Google Apps Script (returns JSON only)

1. Open the PupSwim Google Sheet, then `Extensions` > `Apps Script`.
2. In the file `Code.gs`, select everything and delete it. Paste the full contents of `backend/Code.gs` from this repository. If the project has other `.gs` files from the old site, delete them.
3. Click the `Save project to Drive` icon.
4. In the function dropdown in the toolbar choose `setup`, then click `Run`. Approve the permission prompts (Google Sheets, and send email as you). The Execution log should end with "Email sends remaining today".
5. Optional: choose `sendTestEmail` and click `Run`. Confirm the test email arrives at scott@mustwants.com.
6. Click `Deploy` > `Manage deployments`. Select the existing Web app deployment, click the pencil (`Edit`) icon, set `Version` to `New version`, confirm `Execute as` is `Me` and `Who has access` is `Anyone`, then click `Deploy`. Editing the existing deployment keeps the same Web app URL, so nothing else has to change.
7. If you instead create a brand new deployment, copy its Web app URL (it ends in `/exec`) and set it in Netlify as the environment variable `GAS_API_ENDPOINT` (step 3).

Optional Script Properties (`Project Settings` > `Script Properties`): `ADMIN_ALLOWLIST`, `SITE_URL`, `CONTACT_EMAIL`, `NOTIFY_EMAIL`. Defaults are listed at the top of `backend/Code.gs`.

## 2. Domain: attach pupswim.com in Netlify

1. In Netlify open the project `doggypaddle` > `Domain management`.
2. Add `pupswim.com` as a domain and follow Netlify's DNS instructions at the registrar where you bought pupswim.com.
3. Make `pupswim.com` the primary domain. Keep `dogpaddle.club` attached as a domain alias (the redirect only works while it stays attached).
4. Wait until the HTTPS certificate for pupswim.com shows as active. Open https://pupswim.com in an incognito window and confirm there is no certificate warning.

## 3. Netlify settings

1. Environment variable `GAS_API_ENDPOINT`: only needed if step 1 produced a new Web app URL.
2. No other variables are required.

## 4. Publish the code

Merge the `pupswim-rebuild` branch into `main`. Netlify builds from `main` and publishes the `site/` folder.

## 5. Test in an incognito window

1. https://pupswim.com loads with the PupSwim logo and no certificate warning.
2. https://dogpaddle.club redirects to https://pupswim.com.
3. https://pupswim.com/admin/ : enter scott@mustwants.com, click `Email Me a Sign-In Link`, open the emailed link, and confirm the dashboard appears.
4. In `Time Slots`, add open times for the coming week.
5. On https://pupswim.com/book/ reserve one slot with your own details. Confirm the confirmation email arrives and the `Pay $25 Now` button opens Stripe.
6. Sign the waiver at https://pupswim.com/waiver/ with the same email. In the admin `Bookings` tab the waiver column should read `On file`.
7. In the admin `Bookings` tab click `Cancel` on your test booking. Confirm the slot is open again on the booking page.

## 6. Payments (Stripe)

`site/scripts/config.js` has four Stripe Payment Link settings. Only `single` ($25) is filled in. Create Payment Links in Stripe for the 5-Session Pack ($100, one time), Swim Club ($75, monthly subscription), and gift cards, then paste each address between the quotes. Until a link is filled in, that product shows an email button instead of a payment button.

Payments are not connected to bookings automatically. A new booking shows as `Unpaid` until you click `Mark Paid`. Stripe shows the booking reference on each payment (as the client reference ID) so you can match them.

## 7. Shop

- Amazon: join Amazon Associates first. Then add each pick in the admin `Shop` tab using your Associates link.
- Merch: create a Printify Pop-Up Store and paste its address into `MERCH_STORE_URL` in `site/scripts/config.js`.

## 8. Housekeeping

- Supabase project `Pupswim` (xsmwymqnzwhkcjcbueks) is not used by this site. A `service_role` key for it is still readable in this repository's history (commit a85d44b). Rotate the project's API keys in the Supabase dashboard, or delete the project if you have no plans for it.
- Consider making this GitHub repository private. Netlify keeps working with a private repository.
- The old sheet tabs (`available_slots`, `Products`, and so on) hold test data only and are no longer read. Delete them when convenient.
