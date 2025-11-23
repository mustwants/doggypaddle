// DoggyPaddle Store JavaScript

// Security: HTML escaping function to prevent XSS attacks
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener('DOMContentLoaded', async () => {
  const productsGrid = document.getElementById('products-grid');
  const cartSidebar = document.getElementById('cart-sidebar');
  const cartBadge = document.getElementById('cart-badge');
  const cartCount = document.getElementById('cart-count');
  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
  const closeCartBtn = document.getElementById('close-cart');
  const checkoutBtn = document.getElementById('checkout-btn');
  const categoryBtns = document.querySelectorAll('.category-btn');

  let products = [];
  let cart = JSON.parse(localStorage.getItem('doggypaddle_cart')) || [];
  let currentCategory = 'all';

  // API endpoint
  const API_ENDPOINT = window.DoggyPaddleConfig?.API_ENDPOINT ||
                       'https://script.google.com/macros/s/YOUR_DEPLOYED_WEBAPP_ID/exec';

  // Check if backend is configured
  const isBackendConfigured = API_ENDPOINT && !API_ENDPOINT.includes('YOUR_DEPLOYED_WEBAPP_ID');

  // NO MOCK DATA - All products must come from Google Sheets backend

  // Load products
  async function loadProducts() {
    // REQUIRED: Backend must be configured - NO localStorage or mock data
    if (!isBackendConfigured) {
      console.error(
        "%c⚠️ BACKEND NOT CONFIGURED - NO PRODUCTS AVAILABLE",
        "color: #ff0000; font-size: 16px; font-weight: bold;",
        "\n\nThe Google Apps Script backend is REQUIRED.",
        "\nNo mock data - all products must come from Google Sheets.",
        "\n\nTo fix this:",
        "\n1. Verify the API_ENDPOINT in /scripts/config.js",
        "\n2. Ensure your Google Apps Script is deployed",
        "\n3. Check that the deployment has 'Anyone' access",
        "\n4. Add products to the 'Products' sheet in your Google Sheet",
        "\n\nCurrent API_ENDPOINT:", API_ENDPOINT
      );
      products = [];
      renderProducts();
      return;
    }

    // Load products from Google Sheets backend ONLY
    try {
      console.log('Fetching products from Google Sheets backend...');
      const response = await fetch(`${API_ENDPOINT}?action=getProducts`);

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.products) {
          products = data.products;
          console.log(`✓ Loaded ${products.length} products from Google Sheets`);
        } else {
          console.error('Backend returned error:', data.message);
          products = [];
        }
      } else {
        console.error('Failed to fetch products. HTTP status:', response.status);
        products = [];
      }
    } catch (error) {
      console.error('Error fetching products from backend:', error);
      products = [];
    }

    renderProducts();
  }

  // Render products
  function renderProducts() {
    if (!productsGrid) return;

    const filteredProducts = currentCategory === 'all'
      ? products
      : products.filter(p => p.category === currentCategory);

    productsGrid.innerHTML = filteredProducts.map(product => {
      // Security: Escape all user-supplied fields to prevent XSS
      const escapedImageUrl = escapeHtml(product.imageUrl);
      const escapedName = escapeHtml(product.name);
      const escapedCategory = escapeHtml(product.category);
      const escapedDescription = escapeHtml(product.description);
      const escapedPurchaseLink = escapeHtml(product.purchaseLink);
      const escapedId = escapeHtml(product.id);

      return `
      <div class="product-card ${!product.inStock ? 'out-of-stock' : ''}">
        <img src="${escapedImageUrl}" alt="${escapedName}" class="product-image"
             onerror="this.src='/assets/logo.png'" />
        <div class="product-details">
          <div class="product-category">${escapedCategory}</div>
          <div class="product-name">${escapedName}</div>
          <div class="product-description">${escapedDescription}</div>
          <div class="product-footer">
            <div class="product-price">$${product.price.toFixed(2)}</div>
            ${!product.inStock
              ? `<span class="out-of-stock-badge">Out of Stock</span>`
              : product.purchaseLink
              ? `<a href="${escapedPurchaseLink}" target="_blank" rel="noopener noreferrer" class="add-to-cart-btn" style="text-decoration: none; display: inline-block;">
                   Buy Now →
                 </a>`
              : `<button class="add-to-cart-btn" data-product-id="${escapedId}">
                   Add to Cart
                 </button>`
            }
          </div>
        </div>
      </div>
      `;
    }).join('');

    // Add event listeners to add-to-cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const productId = e.target.dataset.productId;
        addToCart(productId);
      });
    });
  }

  // Add to cart
  function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }

    saveCart();
    updateCartUI();
    showNotification('Added to cart!');
  }

  // Remove from cart
  function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
  }

  // Update quantity
  function updateQuantity(productId, delta) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(productId);
    } else {
      saveCart();
      updateCartUI();
    }
  }

  // Save cart to localStorage
  function saveCart() {
    localStorage.setItem('doggypaddle_cart', JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent('storeCartUpdated', { detail: { cart } }));
  }

  // Update cart UI
  function updateCartUI() {
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (cartCount) {
      cartCount.textContent = itemCount;
    }
    if (cartTotal) {
      cartTotal.textContent = `$${total.toFixed(2)}`;
    }

    if (cartBadge) {
      if (itemCount > 0) {
        cartBadge.style.display = 'flex';
      } else {
        cartBadge.style.display = 'none';
      }
    }

    renderCartItems();
        window.dispatchEvent(new CustomEvent('storeCartUpdated', { detail: { cart } }));
  }

  // Render cart items
  function renderCartItems() {
    if (!cartItems) return;

    if (cart.length === 0) {
      cartItems.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
      return;
    }

    cartItems.innerHTML = cart.map(item => {
      // Security: Escape all user-supplied fields to prevent XSS
      const escapedImageUrl = escapeHtml(item.imageUrl);
      const escapedName = escapeHtml(item.name);
      const escapedId = escapeHtml(item.id);

      return `
      <div class="cart-item">
        <img src="${escapedImageUrl}" alt="${escapedName}" class="cart-item-image"
             onerror="this.src='/assets/logo.png'" />
        <div class="cart-item-details">
          <div class="cart-item-name">${escapedName}</div>
          <div class="cart-item-price">$${item.price.toFixed(2)}</div>
          <div class="cart-item-quantity">
            <button class="qty-btn" data-action="decrease" data-product-id="${escapedId}">-</button>
            <span>${item.quantity}</span>
            <button class="qty-btn" data-action="increase" data-product-id="${escapedId}">+</button>
          </div>
          <div class="remove-item" data-product-id="${escapedId}">Remove</div>
        </div>
      </div>
      `;
    }).join('');

    // Add event listeners
    cartItems.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const productId = e.target.dataset.productId;
        const action = e.target.dataset.action;
        updateQuantity(productId, action === 'increase' ? 1 : -1);
      });
    });

    cartItems.querySelectorAll('.remove-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const productId = e.target.dataset.productId;
        removeFromCart(productId);
      });
    });
  }

  // Show notification
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--primary);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 10001;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
  }

  // Category filter
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      renderProducts();
    });
  });

  // Cart badge click
  if (cartBadge) {
    cartBadge.addEventListener('click', () => {
      cartSidebar.classList.add('open');
    });
  }

  // Close cart
  if (closeCartBtn) {
    closeCartBtn.addEventListener('click', () => {
      cartSidebar.classList.remove('open');
    });
  }

  // Checkout
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async () => {
    if (cart.length === 0) {
      alert('Your cart is empty!');
      return;
    }

    // Save order to backend and localStorage
    try {
      const orderData = {
        customerName: 'Guest', // You can add a form to collect this
        email: '',
        phone: '',
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        timestamp: new Date().toISOString()
      };

      // Save to localStorage for admin viewing
      const savedOrders = JSON.parse(localStorage.getItem('doggypaddle_orders') || '[]');
      savedOrders.push(orderData);
      localStorage.setItem('doggypaddle_orders', JSON.stringify(savedOrders));

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveOrder', order: orderData })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          localStorage.setItem('doggypaddle_order_id', result.orderId);
        }
      }
    } catch (error) {
      console.warn('Could not save order:', error);
    }

    // Redirect to Stripe (you'll need to create a checkout session)
    // For now, using the same link as sessions
    const stripeUrl = window.DoggyPaddleConfig?.STRIPE?.singleSession ||
                     'https://buy.stripe.com/14AaEW1GV3vIgaK7fE5J60c';

    window.location.href = stripeUrl;
    });
  }

  // Expose reload function for admin dashboard
  window.reloadStoreProducts = function() {
    const savedProducts = localStorage.getItem('doggypaddle_products');
    if (savedProducts) {
      try {
        const parsedProducts = JSON.parse(savedProducts);
        if (parsedProducts.length > 0) {
          products = parsedProducts;
          renderProducts();
          console.log('✓ Store products reloaded from localStorage');
        }
      } catch (error) {
        console.warn('Could not reload products:', error);
      }
    }
  };

  // Initialize
  await loadProducts();
  updateCartUI();

    const shouldOpenCart = localStorage.getItem('doggypaddle_open_cart') === 'true';
  if (shouldOpenCart && cartSidebar) {
    cartSidebar.classList.add('open');
    cartSidebar.setAttribute('aria-hidden', 'false');
    localStorage.removeItem('doggypaddle_open_cart');
  }


  // ============================================
  // ADMIN FUNCTIONALITY
  // ============================================

  let isAdminLoggedIn = false;
  let adminUserEmail = null;
  let currentEditingProduct = null;
  let googleAuth = null;
  let cachedAllowedAdmins = [];
  let allowlistLoaded = false;

  // Check stored admin session
  const storedAdminSession = localStorage.getItem('doggypaddle_admin_session');
  if (storedAdminSession) {
    console.log('Found stored admin session, validating...');
    try {
      const session = JSON.parse(storedAdminSession);
      console.log('Session data:', { email: session.email, name: session.name });

      // Validate session is still valid (within 7 days)
      const sessionAge = Date.now() - session.timestamp;
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      console.log(`Session age: ${Math.round(sessionAge / 1000 / 60 / 60)} hours (max: ${maxAge / 1000 / 60 / 60} hours)`);

      if (sessionAge < maxAge) {
        isAdminLoggedIn = true;
        adminUserEmail = session.email;
        console.log('✓ Session valid! Admin auto-logged in as:', session.email);
      } else {
        // Session expired, clear it
        console.warn('Session expired, clearing...');
        localStorage.removeItem('doggypaddle_admin_session');
      }
    } catch (error) {
      console.warn('Invalid admin session:', error);
      localStorage.removeItem('doggypaddle_admin_session');
    }
  } else {
    console.log('No stored admin session found');
  }

  function updateAllowedAdminListDisplay(admins) {
    const adminListElement = document.getElementById('admin-allowed-list');

    if (!adminListElement) {
      return;
    }

    if (Array.isArray(admins) && admins.length > 0) {
      adminListElement.textContent = admins.join(', ');
    } else {
      adminListElement.textContent = 'Admin allowlist is managed on the backend.';
    }
  }

  async function loadAdminAllowlist() {
    if (allowlistLoaded && cachedAllowedAdmins.length > 0) {
      updateAllowedAdminListDisplay(cachedAllowedAdmins);
      return cachedAllowedAdmins;
    }

    if (!isBackendConfigured) {
      console.warn('Backend is not configured; cannot load admin allowlist.');
      return cachedAllowedAdmins;
    }

    try {
      const response = await fetch(`${API_ENDPOINT}?action=getAdminAllowlist`);

      if (!response.ok) {
        throw new Error(`Failed to load allowlist (HTTP ${response.status})`);
      }

      const data = await response.json();

      if (data.status === 'success' && Array.isArray(data.allowedAdmins)) {
        cachedAllowedAdmins = data.allowedAdmins;
        allowlistLoaded = true;
        updateAllowedAdminListDisplay(cachedAllowedAdmins);
      } else {
        console.warn('Backend did not return an allowlist:', data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error loading admin allowlist:', error);
    }

    return cachedAllowedAdmins;
  }

  function getApiEndpointOrThrow() {
    if (!API_ENDPOINT || API_ENDPOINT.includes('YOUR_DEPLOYED_WEBAPP_ID')) {
      throw new Error('Backend API endpoint is not configured.');
    }

    return API_ENDPOINT;
  }

  async function verifyAdminIdToken(idToken) {
    const endpoint = getApiEndpointOrThrow();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'verifyAdminToken',
        idToken
      })
    });

    if (!response.ok) {
      throw new Error(`Backend verification failed with status ${response.status}`);
    }

    const result = await response.json();

    if (result.status !== 'success' || !result.admin) {
      throw new Error(result.message || 'Admin verification failed');
    }

    if (Array.isArray(result.allowedAdmins)) {
      cachedAllowedAdmins = result.allowedAdmins;
      allowlistLoaded = true;
      updateAllowedAdminListDisplay(cachedAllowedAdmins);
    }

    return result.admin;
  }

  // Modal elements
  const adminLoginModal = document.getElementById('admin-login-modal');
  const adminPanel = document.getElementById('admin-panel');
  const productFormModal = document.getElementById('product-form-modal');

  // Buttons
  const adminLoginBtn = document.getElementById('admin-login-btn');
  const adminLogoutBtn = document.getElementById('admin-logout-btn');
  const closeAdminLoginBtn = document.getElementById('close-admin-login');
  const closeAdminPanelBtn = document.getElementById('close-admin-panel');
  const closeProductFormBtn = document.getElementById('close-product-form');
  const cancelProductFormBtn = document.getElementById('cancel-product-form');
  const addProductBtn = document.getElementById('add-product-btn');

  // Forms
  const adminLoginForm = document.getElementById('admin-login-form');
  const productForm = document.getElementById('product-form');

  // Tab elements
  const adminTabs = document.querySelectorAll('.admin-tab');
  const adminProductsTab = document.getElementById('admin-products-tab');
  const adminOrdersTab = document.getElementById('admin-orders-tab');

  // Lists
  const adminProductsList = document.getElementById('admin-products-list');
  const adminOrdersList = document.getElementById('admin-orders-list');

  // Admin Login Button Click
  if (adminLoginBtn) {
    adminLoginBtn.addEventListener('click', async () => {
      if (isAdminLoggedIn) {
        console.log('Admin already logged in, opening panel...');
        openAdminPanel();
      } else {
        console.log('Admin not logged in, showing login modal...');
        await loadAdminAllowlist();
        adminLoginModal.style.display = 'flex';
      }
    });
  }

  // Close modals
  if (closeAdminLoginBtn) {
    closeAdminLoginBtn.addEventListener('click', () => {
      adminLoginModal.style.display = 'none';
    });
  }

  if (closeAdminPanelBtn) {
    closeAdminPanelBtn.addEventListener('click', () => {
      adminPanel.style.display = 'none';
    });
  }

  // Admin logout button
  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', () => {
      console.log('Logout button clicked');
      if (confirm('Are you sure you want to logout?')) {
        console.log('User confirmed logout');
        handleAdminLogout();
        adminPanel.style.display = 'none';
        console.log('Admin panel closed');
        showNotification('Logged out successfully');
        console.log('✓ Logged out successfully');
      } else {
        console.log('User cancelled logout');
      }
    });
  } else {
    console.warn('Admin logout button not found');
  }

  if (closeProductFormBtn) {
    closeProductFormBtn.addEventListener('click', () => {
      productFormModal.style.display = 'none';
    });
  }

  if (cancelProductFormBtn) {
    cancelProductFormBtn.addEventListener('click', () => {
      productFormModal.style.display = 'none';
    });
  }

  // Initialize Google Sign-In
  async function initGoogleSignIn() {
    const clientId = window.DoggyPaddleConfig?.GOOGLE_AUTH?.clientId;
    const googleBtnContainer = document.getElementById('google-signin-button');

    await loadAdminAllowlist();

    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
      console.warn('Google OAuth not configured. Using development login mode.');

      // Render a simple dev login button when Google OAuth is not configured
      if (googleBtnContainer) {
        googleBtnContainer.innerHTML = `
          <button type="button" class="dev-login-btn" style="
            background: #4285f4;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            width: 350px;
            max-width: 100%;
            transition: background 0.3s;
          " onmouseover="this.style.background='#357ae8'" onmouseout="this.style.background='#4285f4'">
            <svg style="width: 18px; height: 18px; vertical-align: middle; margin-right: 8px;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Login as Admin (Dev Mode)
          </button>
          <p style="font-size: 12px; color: #666; margin-top: 12px; font-style: italic;">
            ⚠️ Development Mode: Google OAuth not configured<br>
            See GOOGLE_AUTH_SETUP.md to enable production login
          </p>
        `;

        // Add click handler for dev login
        const devLoginBtn = googleBtnContainer.querySelector('.dev-login-btn');
        devLoginBtn.addEventListener('click', handleDevLogin);
      }
      return;
    }

    // Load Google Identity Services (production mode)
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleSignIn,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // Render the Google Sign-In button
      if (googleBtnContainer) {
        google.accounts.id.renderButton(
          googleBtnContainer,
          {
            theme: 'filled_blue',
            size: 'large',
            text: 'signin_with',
            width: 350
          }
        );
      }
    }
  }

  // Handle dev login (for development/testing when Google OAuth is not configured)
  async function handleDevLogin() {
    const allowedAdmins = await loadAdminAllowlist();
    const devEmail = (allowedAdmins[0] || 'admin@dogpaddle.club').toLowerCase();

    console.log('Dev login activated for:', devEmail);

    // Grant admin access
    isAdminLoggedIn = true;
    adminUserEmail = devEmail;

    // Store session
    const session = {
      email: devEmail,
      loginTime: new Date().toISOString(),
      isDev: true
    };
    localStorage.setItem('doggypaddle_admin_session', JSON.stringify(session));

    // Close login modal and open admin panel
    adminLoginModal.style.display = 'none';
    openAdminPanel();

    // Show success message
    console.log('✓ Admin access granted (Dev Mode)');
  }

  // Handle Google Sign-In callback
  async function handleGoogleSignIn(response) {
    try {
      console.log('Google Sign-In callback triggered');

      const verifiedAdmin = await verifyAdminIdToken(response.credential);

      // Grant admin access
      isAdminLoggedIn = true;
      adminUserEmail = verifiedAdmin.email.toLowerCase();

      // Store session
      const session = {
        email: adminUserEmail,
        name: verifiedAdmin.name,
        picture: verifiedAdmin.picture,
        timestamp: Date.now()
      };
      localStorage.setItem('doggypaddle_admin_session', JSON.stringify(session));
      console.log('Admin session saved to localStorage');

      // Close login modal
      adminLoginModal.style.display = 'none';
      console.log('Login modal closed');

      // Update admin button
      updateAdminButton();
      console.log('Admin button updated');

      // Show welcome notification
      showNotification(`Welcome, ${verifiedAdmin.name}!`);
      console.log('Welcome notification shown');

      // Open admin panel
      console.log('Opening admin panel...');
      openAdminPanel();
      console.log('Admin panel should now be visible');
    } catch (error) {
      console.error('Error handling Google Sign-In:', error);
      alert('Authentication failed. Please try again.\n\nError: ' + error.message);
      handleAdminLogout();
    }
  }

  // Handle admin logout
  function handleAdminLogout() {
    console.log('handleAdminLogout() called');
    isAdminLoggedIn = false;
    adminUserEmail = null;
    console.log('Admin flags reset');

    localStorage.removeItem('doggypaddle_admin_session');
    console.log('Admin session removed from localStorage');

    // Also clear old localStorage key if exists
    localStorage.removeItem('doggypaddle_admin_logged_in');

    updateAdminButton();
    console.log('Admin button updated to login state');

    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      google.accounts.id.disableAutoSelect();
      console.log('Google auto-select disabled');
    }


    console.log('✓ Logout complete');
  }

  // Update admin button text and functionality
  function updateAdminButton() {
    // Check if button exists (may not exist on all pages)
    if (!adminLoginBtn) return;

    if (isAdminLoggedIn) {
      adminLoginBtn.innerHTML = `
        <span>${currentAdminSession?.name || 'Admin'}</span>
        <span style="font-size: 0.85em; opacity: 0.8; margin-left: 0.5rem;">(Admin Panel)</span>
      `;
    } else {
      adminLoginBtn.textContent = 'Admin Login';
    }
  }

  // Initialize Google Sign-In on page load
  window.addEventListener('load', initGoogleSignIn);

  // Tab Switching
  adminTabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      const sessionValid = await refreshAdminSession();
      if (!sessionValid) return;

      const targetTab = tab.dataset.tab;

      // Update active tab button
      adminTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update active tab content
      document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
      });

      if (targetTab === 'products') {
        adminProductsTab.classList.add('active');
        loadAdminProducts();
      } else if (targetTab === 'orders') {
        adminOrdersTab.classList.add('active');
        loadAdminOrders();
      }
    });
  });

  // Add Product Button
  if (addProductBtn) {
    addProductBtn.addEventListener('click', () => {
      currentEditingProduct = null;
      document.getElementById('product-form-title').textContent = 'Add Product';
      productForm.reset();

      // Reset image input to URL mode
      const urlRadio = document.querySelector('input[name="image-type"][value="url"]');
      if (urlRadio) urlRadio.checked = true;
      const urlContainer = document.getElementById('url-input-container');
      const uploadContainer = document.getElementById('upload-input-container');
      const previewContainer = document.getElementById('product-image-preview');
      if (urlContainer) urlContainer.style.display = 'block';
      if (uploadContainer) uploadContainer.style.display = 'none';
      if (previewContainer) previewContainer.style.display = 'none';

      productFormModal.style.display = 'flex';
    });
  }

  // Product Form Submit
  if (productForm) {
    productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const isUpdate = !!currentEditingProduct;
    const quantity = parseInt(document.getElementById('product-quantity').value) || 0;
    const purchaseLink = document.getElementById('product-purchase-link')?.value || '';

    // Get image from either URL input or uploaded file
    let imageUrl = '';
    const imageType = document.querySelector('input[name="image-type"]:checked')?.value;
    if (imageType === 'upload') {
      // Use base64 from file upload (stored in preview)
      const previewImg = document.getElementById('product-image-preview-img');
      imageUrl = previewImg.src || '';
    } else {
      // Use URL input
      imageUrl = document.getElementById('product-image').value;
    }

    // Validate that we have an image
    if (!imageUrl) {
      showNotification('Please provide a product image (URL or upload)', 'error');
      return;
    }

    const productData = {
      id: currentEditingProduct?.id || `prod-${Date.now()}`,
      name: document.getElementById('product-name').value,
      description: document.getElementById('product-description').value,
      price: parseFloat(document.getElementById('product-price').value),
      category: document.getElementById('product-category').value,
      imageUrl: imageUrl,
      purchaseLink: purchaseLink,
      inStock: document.getElementById('product-instock').checked,
      quantity: quantity,
      lowStockThreshold: parseInt(document.getElementById('product-low-stock').value) || 5
    };

    if (isUpdate) {
      // Update existing product
      const index = products.findIndex(p => p.id === currentEditingProduct.id);
      if (index !== -1) {
        products[index] = productData;
      }
    } else {
      // Add new product
      products.push(productData);
    }

    // Save to backend
    try {
      await saveProductToBackend(productData, isUpdate);
    } catch (error) {
      console.warn('Could not save to backend:', error);
      showNotification('Product saved locally (backend sync failed)', 'warning');
    }

    // Update local storage as fallback
    localStorage.setItem('doggypaddle_products', JSON.stringify(products));

    productFormModal.style.display = 'none';
    renderProducts();
    loadAdminProducts();
    showNotification(isUpdate ? 'Product updated!' : 'Product added!');
    });
  }

  // Product Image Type Toggle
  const imageTypeRadios = document.querySelectorAll('input[name="image-type"]');
  const urlInputContainer = document.getElementById('url-input-container');
  const uploadInputContainer = document.getElementById('upload-input-container');
  const productImageInput = document.getElementById('product-image');
  const productImageFileInput = document.getElementById('product-image-file');
  const productImagePreview = document.getElementById('product-image-preview');
  const productImagePreviewImg = document.getElementById('product-image-preview-img');

  if (imageTypeRadios.length > 0) {
    imageTypeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'url') {
          urlInputContainer.style.display = 'block';
          uploadInputContainer.style.display = 'none';
          productImageFileInput.value = ''; // Clear file input
        } else {
          urlInputContainer.style.display = 'none';
          uploadInputContainer.style.display = 'block';
          productImageInput.value = ''; // Clear URL input
        }
      });
    });
  }

  // Handle file upload and preview
  if (productImageFileInput) {
    productImageFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          showNotification('Please select a valid image file', 'error');
          productImageFileInput.value = '';
          return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          showNotification('Image file size must be less than 5MB', 'error');
          productImageFileInput.value = '';
          return;
        }

        // Convert to base64 and show preview
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Image = event.target.result;
          productImagePreviewImg.src = base64Image;
          productImagePreview.style.display = 'block';
        };
        reader.onerror = () => {
          showNotification('Error reading image file', 'error');
          productImageFileInput.value = '';
        };
        reader.readAsDataURL(file);
      } else {
        productImagePreview.style.display = 'none';
      }
    });
  }

  // Handle URL input preview
  if (productImageInput) {
    productImageInput.addEventListener('blur', (e) => {
      const url = e.target.value.trim();
      if (url) {
        productImagePreviewImg.src = url;
        productImagePreview.style.display = 'block';
      } else {
        productImagePreview.style.display = 'none';
      }
    });
  }

  // Open Admin Panel
  function openAdminPanel() {
    console.log('openAdminPanel() called');
    console.log('Admin panel element:', adminPanel);
    console.log('isAdminLoggedIn:', isAdminLoggedIn);
    console.log('adminUserEmail:', adminUserEmail);

    if (!adminPanel) {
      console.error('Admin panel element not found!');
      alert('Error: Admin panel not found. Please refresh the page and try again.');
      return;
    }

    adminPanel.style.display = 'flex';
    console.log('Admin panel display set to flex');

    // Update admin user info
    const adminUserInfo = document.getElementById('admin-user-info');
    if (adminUserInfo && adminUserEmail) {
      adminUserInfo.textContent = `Logged in as: ${currentAdminSession?.name || adminUserEmail}`;
      console.log('Admin user info updated:', adminUserInfo.textContent);
    }

    console.log('Loading admin products...');
    loadAdminProducts();
    console.log('Admin panel fully loaded!');
  }

  // Load Admin Products
  function loadAdminProducts() {
    if (!adminProductsList) return;

    adminProductsList.innerHTML = products.map(product => {
      const quantity = product.quantity || 0;
      const lowStockThreshold = product.lowStockThreshold || 5;
      const isLowStock = quantity > 0 && quantity <= lowStockThreshold;

      // Security: Escape all user-supplied fields to prevent XSS
      const escapedImageUrl = escapeHtml(product.imageUrl);
      const escapedName = escapeHtml(product.name);
      const escapedCategory = escapeHtml(product.category);
      const escapedDescription = escapeHtml(product.description);
      const escapedId = escapeHtml(product.id);

      return `
      <div class="admin-product-item">
        <img src="${escapedImageUrl}" alt="${escapedName}" class="admin-product-image"
             onerror="this.src='/assets/logo.png'" />
        <div class="admin-item-details">
          <div class="admin-item-name">
            ${escapedName}
            <span class="stock-badge ${product.inStock ? 'in-stock' : 'out-of-stock'}">
              ${product.inStock ? 'Active' : 'Inactive'}
            </span>
            ${isLowStock ? '<span class="stock-badge" style="background: #ff9800;">⚠️ Low Stock</span>' : ''}
            ${quantity === 0 ? '<span class="stock-badge out-of-stock">0 Stock</span>' : ''}
          </div>
          <div class="admin-item-info">${escapedCategory}</div>
          <div class="admin-item-info">${escapedDescription}</div>
          <div class="admin-item-info"><strong>Quantity:</strong> ${quantity} ${isLowStock ? '⚠️' : ''}</div>
          <div class="admin-item-price">$${product.price.toFixed(2)}</div>
        </div>
        <div class="admin-item-actions">
          <button class="admin-btn admin-btn-edit" data-product-id="${escapedId}">Edit</button>
          <button class="admin-btn admin-btn-toggle" data-product-id="${escapedId}">
            ${product.inStock ? 'Mark Inactive' : 'Mark Active'}
          </button>
          <button class="admin-btn admin-btn-delete" data-product-id="${escapedId}">Delete</button>
        </div>
      </div>
    `;
    }).join('');

    // Add event listeners
    adminProductsList.querySelectorAll('.admin-btn-edit').forEach(btn => {
      btn.addEventListener('click', () => editProduct(btn.dataset.productId));
    });

    adminProductsList.querySelectorAll('.admin-btn-toggle').forEach(btn => {
      btn.addEventListener('click', () => toggleProductStock(btn.dataset.productId));
    });

    adminProductsList.querySelectorAll('.admin-btn-delete').forEach(btn => {
      btn.addEventListener('click', () => deleteProduct(btn.dataset.productId));
    });
  }

  // Edit Product
  function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    currentEditingProduct = product;
    document.getElementById('product-form-title').textContent = 'Edit Product';
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-description').value = product.description;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-category').value = product.category;

    // Handle image based on type (URL or base64)
    const isBase64 = product.imageUrl && product.imageUrl.startsWith('data:image/');
    const urlRadio = document.querySelector('input[name="image-type"][value="url"]');
    const uploadRadio = document.querySelector('input[name="image-type"][value="upload"]');
    const urlContainer = document.getElementById('url-input-container');
    const uploadContainer = document.getElementById('upload-input-container');
    const previewContainer = document.getElementById('product-image-preview');
    const previewImg = document.getElementById('product-image-preview-img');

    if (isBase64) {
      // This is an uploaded image (base64)
      if (uploadRadio) uploadRadio.checked = true;
      if (urlContainer) urlContainer.style.display = 'none';
      if (uploadContainer) uploadContainer.style.display = 'block';
      document.getElementById('product-image').value = '';
      // Show preview with the base64 image
      if (previewImg) previewImg.src = product.imageUrl;
      if (previewContainer) previewContainer.style.display = 'block';
    } else {
      // This is a URL
      if (urlRadio) urlRadio.checked = true;
      if (urlContainer) urlContainer.style.display = 'block';
      if (uploadContainer) uploadContainer.style.display = 'none';
      document.getElementById('product-image').value = product.imageUrl;
      document.getElementById('product-image-file').value = '';
      // Show preview with the URL
      if (previewImg) previewImg.src = product.imageUrl;
      if (previewContainer) previewContainer.style.display = 'block';
    }

    // Set purchase link if field exists
    const purchaseLinkField = document.getElementById('product-purchase-link');
    if (purchaseLinkField) {
      purchaseLinkField.value = product.purchaseLink || '';
    }

    document.getElementById('product-instock').checked = product.inStock;
    document.getElementById('product-quantity').value = product.quantity || 0;
    document.getElementById('product-low-stock').value = product.lowStockThreshold || 5;

    productFormModal.style.display = 'flex';
  }

  // Toggle Product Stock
  async function toggleProductStock(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    product.inStock = !product.inStock;

    // Update backend
    try {
      await saveProductToBackend(product, true);
    } catch (error) {
      console.warn('Could not save to backend:', error);
      showNotification('Stock status saved locally (backend sync failed)', 'warning');
    }

    localStorage.setItem('doggypaddle_products', JSON.stringify(products));
    renderProducts();
    loadAdminProducts();
    showNotification(`Product marked as ${product.inStock ? 'in stock' : 'out of stock'}`);
  }

  // Delete Product
  async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    products = products.filter(p => p.id !== productId);

    // Delete from backend
    try {
      await deleteProductFromBackend(productId);
    } catch (error) {
      console.warn('Could not delete from backend:', error);
      showNotification('Product deleted locally (backend sync failed)', 'warning');
    }

    localStorage.setItem('doggypaddle_products', JSON.stringify(products));
    renderProducts();
    loadAdminProducts();
    showNotification('Product deleted');
  }

  // Save Products to Backend
  async function saveProductToBackend(product, isUpdate = false) {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: isUpdate ? 'updateProduct' : 'saveProduct',
          product: product
        })
      });

      const result = await response.json();
      if (result.status !== 'success') {
        throw new Error(result.message || 'Failed to save product');
      }
      return result;
    } catch (error) {
      console.error('Error saving product to backend:', error);
      throw error;
    }
  }

  async function deleteProductFromBackend(productId) {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'deleteProduct',
          productId: productId
        })
      });

      const result = await response.json();
      if (result.status !== 'success') {
        throw new Error(result.message || 'Failed to delete product');
      }
      return result;
    } catch (error) {
      console.error('Error deleting product from backend:', error);
      throw error;
    }
  }

  // Legacy function for backward compatibility
  async function saveProductsToBackend() {
    // Deprecated: Use saveProductToBackend instead
    return Promise.resolve();
  }

  // Load Admin Orders
  async function loadAdminOrders() {
    if (!adminOrdersList) return;

    // Try to load orders from localStorage
    const orders = [];

    // Check for saved orders
    const savedOrders = JSON.parse(localStorage.getItem('doggypaddle_orders') || '[]');
    orders.push(...savedOrders);

    if (orders.length === 0) {
      adminOrdersList.innerHTML = '<div class="empty-cart">No orders yet</div>';
      return;
    }

    adminOrdersList.innerHTML = orders.map((order, index) => `
      <div class="admin-order-item">
        <div class="admin-item-details">
          <div class="admin-item-name">Order #${index + 1}</div>
          <div class="admin-item-info">Customer: ${order.customerName || 'Guest'}</div>
          <div class="admin-item-info">Email: ${order.email || 'N/A'}</div>
          <div class="admin-item-info">Items: ${order.items?.length || 0}</div>
          <div class="admin-item-info">Date: ${new Date(order.timestamp).toLocaleString()}</div>
          <div class="admin-item-price">Total: $${order.total?.toFixed(2) || '0.00'}</div>
        </div>
      </div>
    `).join('');
  }

  // Update Admin Button Text on load
  updateAdminButton();
});
