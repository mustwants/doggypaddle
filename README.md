# DoggyPaddle - Dog Swimming Pool Booking Website

A complete website for managing dog swimming pool bookings, including online scheduling, payments via Stripe, waiver management, product sales, and photo gallery.

## 🚨 Important: Backend Setup Required

**If you're seeing CORS errors or "Failed to fetch" errors**, you need to set up the Google Apps Script backend first.

📖 **See [QUICK_START.md](./QUICK_START.md) for setup instructions**

## Features

- 🏊 **Interactive Booking System** - Calendar-based time slot selection
- 💳 **Stripe Payment Integration** - Secure online payments
- 📝 **Digital Waiver System** - Liability waiver with e-signature
- 🏪 **Product Store** - Sell merchandise, treats, and accessories
- 📸 **Photo Gallery** - Customer photo submissions with admin approval
- 👨‍💼 **Admin Dashboard** - Manage bookings, products, and time slots
- 📱 **Fully Responsive** - Works on desktop, tablet, and mobile

## Quick Setup

### 1. Backend Configuration (Required)

The website uses Google Apps Script as a backend. Follow the detailed setup guide:

📖 **[QUICK_START.md](./QUICK_START.md)** - 15-minute setup guide

Or see the complete guide:

📖 **[backend/README.md](./backend/README.md)** - Detailed backend setup instructions

### 2. Deploy to Netlify (or any static host)

1. Push this repository to GitHub
2. Connect to Netlify (or Vercel, GitHub Pages, etc.)
3. Deploy settings:
   - Build command: (leave empty)
   - Publish directory: `/` (root)
4. Your site will be live!

### 3. Configure Custom Domain (Optional)

See Netlify documentation for adding a custom domain.

## Project Structure

```
doggypaddle/
├── index.html              # Home page
├── about.html              # About page
├── booking.html            # Booking system
├── store.html              # Product store
├── photos.html             # Photo gallery
├── admin.html              # Admin dashboard
├── waiver/                 # Waiver system
│   └── waiver.html
├── scripts/                # JavaScript files
│   ├── config.js          # ⚠️ UPDATE THIS with your backend URL
│   ├── booking.js
│   ├── calendar.js
│   ├── store.js
│   └── photos.js
├── backend/                # Google Apps Script backend
│   ├── README.md          # Backend setup guide
│   └── google-apps-script.gs
├── assets/                 # Images and media
└── QUICK_START.md         # Quick setup guide
```

## Configuration Files

### scripts/config.js

**⚠️ Important**: You must update this file with your Google Apps Script deployment URL.

```javascript
API_ENDPOINT: 'https://script.google.com/macros/s/YOUR_ACTUAL_DEPLOYMENT_URL/exec'
```

See [QUICK_START.md](./QUICK_START.md) for details.

## Troubleshooting

### CORS Errors / "Failed to fetch"

This means the backend hasn't been configured yet. See [QUICK_START.md](./QUICK_START.md).

### Photos Not Uploading

Make sure:
1. Backend is configured (see above)
2. Image size is under 5MB
3. Browser console shows no errors

### Bookings Not Saving

The backend must be configured. Until then, the site uses mock data for demonstration.

## Support

For issues or questions:
1. Check [QUICK_START.md](./QUICK_START.md)
2. Check [backend/README.md](./backend/README.md)
3. Review browser console for error messages

## License

Proprietary - All rights reserved
