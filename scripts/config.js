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
  // Replace this with your deployed Web App URL
  API_ENDPOINT: 'https://script.google.com/macros/s/YOUR_DEPLOYED_WEBAPP_ID/exec',

  // Google OAuth Configuration
  // To get your Client ID:
  // 1. Go to https://console.cloud.google.com/
  // 2. Create a new project or select existing
  // 3. Enable Google Identity Services
  // 4. Create OAuth 2.0 credentials
  // 5. Add authorized JavaScript origins (your domain)
  // 6. Copy the Client ID below
  GOOGLE_AUTH: {
    clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    // Allowed admin emails (restrict to specific Google Workspace accounts)
    allowedAdmins: ['Scott@mustwants.com']
  },

  // Stripe Configuration
  STRIPE: {
    // Your live Stripe publishable key (already configured)
    publishableKey: 'pk_live_51Jw6McAWz02Auqyy2ssxTNAhxp3vNGmAfUv4gbUA6NzT8jJb5FefT3lfqObiQwK5ClTRfkzzd3YQaFvZhWIIFsHX00biYat54r',

    // Stripe product links
    singleSession: 'https://buy.stripe.com/14AaEW1GV3vIgaK7fE5J60c',
    fiveSessionPackage: 'https://buy.stripe.com/14AaEW1GV3vIgaK7fE5J60c',
    giftCard: 'https://buy.stripe.com/14AaEW1GV3vIgaK7fE5J60c',

    // Stripe buy button ID (already configured)
    buyButtonId: 'buy_btn_1SRg5JAWz02AuqyyQNxXtKgW'
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
