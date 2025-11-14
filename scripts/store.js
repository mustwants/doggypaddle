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

    // Save order to backend
    try {
      const orderData = {
        customerName: 'Guest', // You can add a form to collect this
        email: '',
        phone: '',
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        timestamp: new Date().toISOString()
      };

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
});
