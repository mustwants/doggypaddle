// DoggyPaddle Store JavaScript

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

  // Sample products (fallback if API not configured)
  const sampleProducts = [
    {
      id: 'prod-1',
      name: 'Dog Treats - Peanut Butter',
      description: 'Delicious all-natural peanut butter treats. Made with real peanut butter and no artificial ingredients.',
      price: 12.99,
      category: 'Treats',
      imageUrl: '/assets/products/treats1.jpg',
      inStock: true
    },
    {
      id: 'prod-2',
      name: 'Dog Treats - Bacon Flavor',
      description: 'Crispy bacon-flavored treats your dog will love. Perfect for training or as a special reward.',
      price: 14.99,
      category: 'Treats',
      imageUrl: '/assets/products/treats2.jpg',
      inStock: true
    },
    {
      id: 'prod-3',
      name: 'Swimming Vest - Small',
      description: 'Safety vest for small dogs (up to 25 lbs). Bright orange color for visibility.',
      price: 29.99,
      category: 'Accessories',
      imageUrl: '/assets/products/vest-small.jpg',
      inStock: true
    },
    {
      id: 'prod-4',
      name: 'Swimming Vest - Large',
      description: 'Safety vest for large dogs (25+ lbs). Adjustable straps and durable construction.',
      price: 34.99,
      category: 'Accessories',
      imageUrl: '/assets/products/vest-large.jpg',
      inStock: true
    },
    {
      id: 'prod-5',
      name: 'DoggyPaddle T-Shirt',
      description: 'Show your DoggyPaddle pride! Comfortable cotton t-shirt with our logo.',
      price: 24.99,
      category: 'Merchandise',
      imageUrl: '/assets/products/tshirt.jpg',
      inStock: true
    },
    {
      id: 'prod-6',
      name: 'Waterproof Toy Bundle',
      description: 'Set of 3 floating toys perfect for pool time. Durable and easy to clean.',
      price: 19.99,
      category: 'Toys',
      imageUrl: '/assets/products/toys.jpg',
      inStock: true
    },
    {
      id: 'prod-7',
      name: 'Dog Shampoo - Fresh Scent',
      description: 'Gentle shampoo perfect for after-swim rinse. Fresh scent, moisturizing formula.',
      price: 16.99,
      category: 'Accessories',
      imageUrl: '/assets/products/shampoo.jpg',
      inStock: true
    },
    {
      id: 'prod-8',
      name: 'DoggyPaddle Water Bowl',
      description: 'Collapsible water bowl for on-the-go hydration. Easy to pack and clean.',
      price: 9.99,
      category: 'Accessories',
      imageUrl: '/assets/products/bowl.jpg',
      inStock: true
    }
  ];

  // Load products
  async function loadProducts() {
    // Check if backend is configured
    if (!isBackendConfigured) {
      console.warn(
        "%c⚠️ Backend Not Configured - Using Sample Products",
        "color: #ff9800; font-size: 14px; font-weight: bold;",
        "\n\nThe Google Apps Script backend hasn't been set up yet.",
        "\nDisplaying sample products for demonstration purposes.",
        "\n\nTo enable live product management:",
        "\n1. Follow the instructions in /backend/README.md",
        "\n2. Deploy the Google Apps Script",
        "\n3. Update the API_ENDPOINT in /scripts/config.js"
      );
      products = sampleProducts;
      renderProducts();
      return;
    }

    try {
      const response = await fetch(`${API_ENDPOINT}?action=getProducts`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.products.length > 0) {
          products = data.products;
        } else {
          products = sampleProducts;
        }
      } else {
        products = sampleProducts;
      }
    } catch (error) {
      console.warn('Using sample products:', error);
      products = sampleProducts;
    }
    renderProducts();
  }

  // Render products
  function renderProducts() {
    const filteredProducts = currentCategory === 'all'
      ? products
      : products.filter(p => p.category === currentCategory);

    productsGrid.innerHTML = filteredProducts.map(product => `
      <div class="product-card ${!product.inStock ? 'out-of-stock' : ''}">
        <img src="${product.imageUrl}" alt="${product.name}" class="product-image"
             onerror="this.src='/assets/logo.png'" />
        <div class="product-details">
          <div class="product-category">${product.category}</div>
          <div class="product-name">${product.name}</div>
          <div class="product-description">${product.description}</div>
          <div class="product-footer">
            <div class="product-price">$${product.price.toFixed(2)}</div>
            ${product.inStock
              ? `<button class="add-to-cart-btn" data-product-id="${product.id}">
                   Add to Cart
                 </button>`
              : `<span class="out-of-stock-badge">Out of Stock</span>`
            }
          </div>
        </div>
      </div>
    `).join('');

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
  }

  // Update cart UI
  function updateCartUI() {
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    cartCount.textContent = itemCount;
    cartTotal.textContent = `$${total.toFixed(2)}`;

    if (itemCount > 0) {
      cartBadge.style.display = 'flex';
    } else {
      cartBadge.style.display = 'none';
    }

    renderCartItems();
  }

  // Render cart items
  function renderCartItems() {
    if (cart.length === 0) {
      cartItems.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
      return;
    }

    cartItems.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-image"
             onerror="this.src='/assets/logo.png'" />
        <div class="cart-item-details">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">$${item.price.toFixed(2)}</div>
          <div class="cart-item-quantity">
            <button class="qty-btn" data-action="decrease" data-product-id="${item.id}">-</button>
            <span>${item.quantity}</span>
            <button class="qty-btn" data-action="increase" data-product-id="${item.id}">+</button>
          </div>
          <div class="remove-item" data-product-id="${item.id}">Remove</div>
        </div>
      </div>
    `).join('');

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
  cartBadge.addEventListener('click', () => {
    cartSidebar.classList.add('open');
  });

  // Close cart
  closeCartBtn.addEventListener('click', () => {
    cartSidebar.classList.remove('open');
  });

  // Checkout
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

  // Initialize
  await loadProducts();
  updateCartUI();

  // ============================================
  // ADMIN FUNCTIONALITY
  // ============================================

  let isAdminLoggedIn = false;
  let adminUserEmail = null;
  let currentEditingProduct = null;
  let googleAuth = null;

  // Check stored admin session
  const storedAdminSession = localStorage.getItem('doggypaddle_admin_session');
  if (storedAdminSession) {
    try {
      const session = JSON.parse(storedAdminSession);
      // Validate session is still valid (within 7 days)
      const sessionAge = Date.now() - session.timestamp;
      if (sessionAge < 7 * 24 * 60 * 60 * 1000) { // 7 days
        isAdminLoggedIn = true;
        adminUserEmail = session.email;
      } else {
        // Session expired, clear it
        localStorage.removeItem('doggypaddle_admin_session');
      }
    } catch (error) {
      console.warn('Invalid admin session:', error);
      localStorage.removeItem('doggypaddle_admin_session');
    }
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
  adminLoginBtn.addEventListener('click', () => {
    if (isAdminLoggedIn) {
      openAdminPanel();
    } else {
      adminLoginModal.style.display = 'flex';
    }
  });

  // Close modals
  closeAdminLoginBtn.addEventListener('click', () => {
    adminLoginModal.style.display = 'none';
  });

  closeAdminPanelBtn.addEventListener('click', () => {
    adminPanel.style.display = 'none';
  });

  // Admin logout button
  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to logout?')) {
        handleAdminLogout();
        adminPanel.style.display = 'none';
        showNotification('Logged out successfully');
      }
    });
  }

  closeProductFormBtn.addEventListener('click', () => {
    productFormModal.style.display = 'none';
  });

  cancelProductFormBtn.addEventListener('click', () => {
    productFormModal.style.display = 'none';
  });

  // Initialize Google Sign-In
  function initGoogleSignIn() {
    const clientId = window.DoggyPaddleConfig?.GOOGLE_AUTH?.clientId;
    const googleBtnContainer = document.getElementById('google-signin-button');

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
  function handleDevLogin() {
    const allowedAdmins = window.DoggyPaddleConfig?.GOOGLE_AUTH?.allowedAdmins || ['Scott@mustwants.com'];
    const devEmail = allowedAdmins[0].toLowerCase(); // Use first allowed admin

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
  function handleGoogleSignIn(response) {
    try {
      // Decode the JWT token to get user info
      const payload = parseJwt(response.credential);
      const userEmail = payload.email.toLowerCase();

      // Check if user is in allowed admins list
      const allowedAdmins = window.DoggyPaddleConfig?.GOOGLE_AUTH?.allowedAdmins || [];
      const allowedAdminsLower = allowedAdmins.map(email => email.toLowerCase());

      if (allowedAdminsLower.includes(userEmail)) {
        // Grant admin access
        isAdminLoggedIn = true;
        adminUserEmail = userEmail;

        // Store session
        const session = {
          email: userEmail,
          name: payload.name,
          picture: payload.picture,
          timestamp: Date.now()
        };
        localStorage.setItem('doggypaddle_admin_session', JSON.stringify(session));

        adminLoginModal.style.display = 'none';
        updateAdminButton();
        showNotification(`Welcome, ${payload.name}!`);
        openAdminPanel();
      } else {
        alert(`Access denied. Only authorized Google Workspace accounts can access the admin panel.\n\nYour email: ${userEmail}`);
        handleAdminLogout();
      }
    } catch (error) {
      console.error('Error handling Google Sign-In:', error);
      alert('Authentication failed. Please try again.');
    }
  }

  // Parse JWT token
  function parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error parsing JWT:', error);
      return null;
    }
  }

  // Handle admin logout
  function handleAdminLogout() {
    isAdminLoggedIn = false;
    adminUserEmail = null;
    localStorage.removeItem('doggypaddle_admin_session');
    // Also clear old localStorage key if exists
    localStorage.removeItem('doggypaddle_admin_logged_in');
    updateAdminButton();
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      google.accounts.id.disableAutoSelect();
    }
  }

  // Update admin button text and functionality
  function updateAdminButton() {
    if (isAdminLoggedIn) {
      const session = JSON.parse(localStorage.getItem('doggypaddle_admin_session') || '{}');
      adminLoginBtn.innerHTML = `
        <span>${session.name || 'Admin'}</span>
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
    tab.addEventListener('click', () => {
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
  addProductBtn.addEventListener('click', () => {
    currentEditingProduct = null;
    document.getElementById('product-form-title').textContent = 'Add Product';
    productForm.reset();
    productFormModal.style.display = 'flex';
  });

  // Product Form Submit
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const isUpdate = !!currentEditingProduct;
    const quantity = parseInt(document.getElementById('product-quantity').value) || 0;
    const productData = {
      id: currentEditingProduct?.id || `prod-${Date.now()}`,
      name: document.getElementById('product-name').value,
      description: document.getElementById('product-description').value,
      price: parseFloat(document.getElementById('product-price').value),
      category: document.getElementById('product-category').value,
      imageUrl: document.getElementById('product-image').value,
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

  // Open Admin Panel
  function openAdminPanel() {
    adminPanel.style.display = 'flex';

    // Update admin user info
    const adminUserInfo = document.getElementById('admin-user-info');
    if (adminUserInfo && adminUserEmail) {
      const session = JSON.parse(localStorage.getItem('doggypaddle_admin_session') || '{}');
      adminUserInfo.textContent = `Logged in as: ${session.name || adminUserEmail}`;
    }

    loadAdminProducts();
  }

  // Load Admin Products
  function loadAdminProducts() {
    adminProductsList.innerHTML = products.map(product => {
      const quantity = product.quantity || 0;
      const lowStockThreshold = product.lowStockThreshold || 5;
      const isLowStock = quantity > 0 && quantity <= lowStockThreshold;

      return `
      <div class="admin-product-item">
        <img src="${product.imageUrl}" alt="${product.name}" class="admin-product-image"
             onerror="this.src='/assets/logo.png'" />
        <div class="admin-item-details">
          <div class="admin-item-name">
            ${product.name}
            <span class="stock-badge ${product.inStock ? 'in-stock' : 'out-of-stock'}">
              ${product.inStock ? 'Active' : 'Inactive'}
            </span>
            ${isLowStock ? '<span class="stock-badge" style="background: #ff9800;">⚠️ Low Stock</span>' : ''}
            ${quantity === 0 ? '<span class="stock-badge out-of-stock">0 Stock</span>' : ''}
          </div>
          <div class="admin-item-info">${product.category}</div>
          <div class="admin-item-info">${product.description}</div>
          <div class="admin-item-info"><strong>Quantity:</strong> ${quantity} ${isLowStock ? '⚠️' : ''}</div>
          <div class="admin-item-price">$${product.price.toFixed(2)}</div>
        </div>
        <div class="admin-item-actions">
          <button class="admin-btn admin-btn-edit" data-product-id="${product.id}">Edit</button>
          <button class="admin-btn admin-btn-toggle" data-product-id="${product.id}">
            ${product.inStock ? 'Mark Inactive' : 'Mark Active'}
          </button>
          <button class="admin-btn admin-btn-delete" data-product-id="${product.id}">Delete</button>
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
    document.getElementById('product-image').value = product.imageUrl;
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

  // Load products from localStorage if available
  const savedProducts = localStorage.getItem('doggypaddle_products');
  if (savedProducts && products.length === sampleProducts.length) {
    try {
      const parsedProducts = JSON.parse(savedProducts);
      if (parsedProducts.length > 0) {
        products = parsedProducts;
        renderProducts();
      }
    } catch (error) {
      console.warn('Could not load saved products:', error);
    }
  }
});
