// DoggyPaddle Configuration
//
// IMPORTANT: After deploying your Google Apps Script, update the API_ENDPOINT below
// with your actual Web App URL
//
// To get your Web App URL:
// 1. Open your Google Sheet
// 2. Go to Extensions > Apps Script
// 3. Click Deploy > Manage deployments
// 4. Copy the Web App URL
// 5. Paste it below

const CONFIG = {
  // Google Apps Script Web App URL
  //
  // SETUP REQUIRED: Follow the instructions in /backend/README.md to:
  // 1. Set up your Google Apps Script backend
  // 2. Deploy it as a Web App
  // 3. Copy the Web App URL and paste it here
  //
  // The URL should look like: https://script.google.com/macros/s/AKfycbw...LONG_ID.../exec
  //
  // ✓ CONFIGURED: Web App URL from Google Apps Script deployment
  API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbz8spCI4G3t_gicwPhS_uc2AJ1-059ODLCKNOl1j2r9a_cz16QGmAVaiR-AJlqxWiY5ug/exec',

  // Google OAuth Configuration
  // To get your Client ID:
  // 1. Go to https://console.cloud.google.com/
  // 2. Create a new project or select existing
  // 3. Enable Google Identity Services
  // 4. Create OAuth 2.0 credentials
  // 5. Add authorized JavaScript origins (your domain)
  // 6. Copy the Client ID below
  GOOGLE_AUTH: {
    clientId: '20135650074-aae05fujqi58h2kk58idd638p2djmhvt.apps.googleusercontent.com', // <-- Missing quote added here
    allowedAdmins: ['scott@mustwants.com'],
    // Admin allowlist is now managed server-side via the ADMIN_ALLOWLIST script property
  },

  // Stripe Configuration
  STRIPE: {
    // Your live Stripe publishable key (already configured)
    publishableKey: 'pk_live_51Jw6McAWz02Auqyy2ssxTNAhxp3vNGmAfUv4gbUA6NzT8jJb5FefT3lfqObiQwK5ClTRfkzzd3YQaFvZhWIIFsHX00biYat54r',

    // Stripe product links
    singleSession: 'https://buy.stripe.com/14AaEW1GV3vIgaK7fE5J60c',
    fiveSessionPackage: 'https://buy.stripe.com/14AaEW1GV3vIgaK7fE5J60c',
    giftCard: 'https://buy.stripe.com/14AaEW1GV3vIgaK7fE5J60c',
    subscription: 'https://buy.stripe.com/14AaEW1GV3vIgaK7fE5J60c', // TODO: Update with actual subscription product link

    // Stripe buy button ID (already configured)
    buyButtonId: 'buy_btn_1SRg5JAWz02AuqyyQNxXtKgW'
  },

  // Subscription Configuration
  SUBSCRIPTION: {
    name: 'Dog Swim Club',
    price: 75, // per month
    sessionsPerMonth: 4,
    features: [
      '4 sessions per month',
      'Up to 2 dogs per session',
      'Priority booking',
      'Save $25/month vs single sessions',
      'Auto-renews monthly'
    ],
    rolloverSessions: false // Whether unused sessions roll over
  },

  // Social Media
  SOCIAL: {
    facebook: 'https://www.facebook.com/dogpad',
    // Add other social media links as needed
    // instagram: 'https://instagram.com/yourpage',
    // twitter: 'https://twitter.com/yourpage'
  },

  // Image upload service (using imgur as free option)
  // You can also use cloudinary, firebase, or your own server
  IMAGE_UPLOAD: {
    provider: 'imgur',
    clientId: 'YOUR_IMGUR_CLIENT_ID' // Get from https://api.imgur.com/oauth2/addclient
  }
};

// Make config available globally
window.DoggyPaddleConfig = CONFIG;


