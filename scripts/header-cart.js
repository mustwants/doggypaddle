'use strict';

(function initHeaderCart() {
  const headerCartButton = document.getElementById('header-cart-button');
  const headerCartAmount = document.getElementById('header-cart-amount');
  const headerCartCount = document.getElementById('header-cart-count');

  function getCart() {
    try {
      const storedCart = localStorage.getItem('doggypaddle_cart');
      return storedCart ? JSON.parse(storedCart) : [];
    } catch (error) {
      console.warn('Could not parse cart from localStorage:', error);
      return [];
    }
  }

  function getBookingCart() {
    try {
      const storedCart = localStorage.getItem('doggypaddle_booking_cart');
      return storedCart ? JSON.parse(storedCart) : [];
    } catch (error) {
      console.warn('Could not parse booking cart from localStorage:', error);
      return [];
    }
  }

  function calculateSummary(cart) {
    // Calculate store cart items (with quantity)
    const storeTotals = cart.reduce(
      (acc, item) => {
        const quantity = item.quantity || 1;
        acc.count += quantity;
        acc.total += item.price * quantity;
        return acc;
      },
      { count: 0, total: 0 }
    );

    // Calculate booking cart items (sessions)
    const bookingCart = getBookingCart();
    const bookingTotals = bookingCart.reduce(
      (acc, item) => {
        acc.count += 1; // Each session is one item
        acc.total += item.price || 0;
        return acc;
      },
      { count: 0, total: 0 }
    );

    // Combine both carts
    return {
      count: storeTotals.count + bookingTotals.count,
      total: Number.isFinite(storeTotals.total + bookingTotals.total)
        ? storeTotals.total + bookingTotals.total
        : 0
    };
  }

  function updateHeaderCart(summaryCart) {
    const cartData = Array.isArray(summaryCart) ? summaryCart : getCart();
    const summary = calculateSummary(cartData);

    if (headerCartAmount) {
      headerCartAmount.textContent = `$${summary.total.toFixed(2)}`;
    }

    if (headerCartCount) {
      headerCartCount.textContent = summary.count;
    }
  }

  function openStoreCart() {
    // Always show unified cart modal to display both sessions and products
    showUnifiedCart();
  }

  function showUnifiedCart() {
    const modal = document.getElementById('unified-cart-modal');
    if (!modal) {
      createUnifiedCartModal();
    }

    renderUnifiedCart();
    const unifiedModal = document.getElementById('unified-cart-modal');
    if (unifiedModal) {
      unifiedModal.style.display = 'flex';
      setTimeout(() => unifiedModal.classList.add('show'), 10);
    }
  }

  function createUnifiedCartModal() {
    const modal = document.createElement('div');
    modal.id = 'unified-cart-modal';
    modal.className = 'unified-cart-modal';
    modal.innerHTML = `
      <div class="unified-modal-overlay"></div>
      <div class="unified-modal-content">
        <div class="unified-cart-header">
          <h2>Shopping Cart</h2>
          <button class="unified-cart-close" id="close-unified-cart">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="unified-cart-body" id="unified-cart-items"></div>
        <div class="unified-cart-footer">
          <div class="unified-cart-total">
            <span>Total:</span>
            <span id="unified-cart-total">$0.00</span>
          </div>
          <button class="unified-checkout-btn" id="unified-checkout-btn">Proceed to Checkout</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .unified-cart-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        display: none;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .unified-cart-modal.show {
        opacity: 1;
      }
      .unified-modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
      }
      .unified-modal-content {
        position: relative;
        background: white;
        border-radius: 16px;
        width: 90%;
        max-width: 600px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.4);
        transform: scale(0.9);
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .unified-cart-modal.show .unified-modal-content {
        transform: scale(1);
      }
      .unified-cart-header {
        padding: 1.5rem;
        border-bottom: 2px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(135deg, #028090 0%, #026873 100%);
        color: white;
        border-radius: 16px 16px 0 0;
      }
      .unified-cart-header h2 {
        margin: 0;
        font-size: 1.5rem;
      }
      .unified-cart-close {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      .unified-cart-close:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      .unified-cart-body {
        flex: 1;
        overflow-y: auto;
        padding: 1.5rem;
      }
      .unified-cart-section {
        margin-bottom: 2rem;
      }
      .unified-cart-section h3 {
        font-size: 1.1rem;
        color: #028090;
        margin: 0 0 1rem 0;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #e5e7eb;
      }
      .unified-cart-item {
        background: #fafafa;
        border-radius: 12px;
        padding: 1rem;
        margin-bottom: 0.75rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border: 2px solid transparent;
        transition: all 0.2s ease;
      }
      .unified-cart-item:hover {
        border-color: #028090;
        background: #f0f9fb;
      }
      .unified-item-details {
        flex: 1;
      }
      .unified-item-name {
        font-weight: 600;
        color: #14532d;
        margin-bottom: 0.25rem;
      }
      .unified-item-info {
        color: #6b7280;
        font-size: 0.85rem;
      }
      .unified-item-price {
        font-weight: 700;
        color: #028090;
        font-size: 1.1rem;
      }
      .unified-empty-cart {
        text-align: center;
        padding: 3rem 1.5rem;
        color: #6b7280;
      }
      .unified-cart-footer {
        padding: 1.5rem;
        border-top: 2px solid #e5e7eb;
        background: #fafafa;
        border-radius: 0 0 16px 16px;
      }
      .unified-cart-total {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 1.25rem;
        font-weight: 700;
        color: #14532d;
        margin-bottom: 1rem;
      }
      .unified-checkout-btn {
        width: 100%;
        background: linear-gradient(135deg, #028090 0%, #026873 100%);
        color: white;
        border: none;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(2, 128, 144, 0.3);
      }
      .unified-checkout-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(2, 128, 144, 0.4);
      }
      .unified-checkout-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
    `;
    document.head.appendChild(style);

    // Add event listeners
    const closeBtn = modal.querySelector('#close-unified-cart');
    const overlay = modal.querySelector('.unified-modal-overlay');
    const checkoutBtn = modal.querySelector('#unified-checkout-btn');

    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    };

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    checkoutBtn.addEventListener('click', handleUnifiedCheckout);
  }

  function renderUnifiedCart() {
    const itemsContainer = document.getElementById('unified-cart-items');
    const totalElement = document.getElementById('unified-cart-total');
    const checkoutBtn = document.getElementById('unified-checkout-btn');

    if (!itemsContainer) return;

    const storeCart = getCart();
    const bookingCart = getBookingCart();
    const summary = calculateSummary(storeCart);

    let html = '';

    // Render booking sessions
    if (bookingCart.length > 0) {
      html += `
        <div class="unified-cart-section">
          <h3>Swimming Sessions (${bookingCart.length})</h3>
      `;

      bookingCart.forEach(item => {
        const date = new Date(item.date + 'T12:00:00');
        const formattedDate = date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        html += `
          <div class="unified-cart-item">
            <div class="unified-item-details">
              <div class="unified-item-name">${formattedDate}</div>
              <div class="unified-item-info">${formatTime(item.time)} (${item.duration} min)</div>
            </div>
            <div class="unified-item-price">$${item.price.toFixed(2)}</div>
          </div>
        `;
      });

      html += `</div>`;
    }

    // Render store products
    if (storeCart.length > 0) {
      html += `
        <div class="unified-cart-section">
          <h3>Products (${storeCart.reduce((sum, item) => sum + (item.quantity || 1), 0)})</h3>
      `;

      storeCart.forEach(item => {
        const quantity = item.quantity || 1;
        const itemTotal = item.price * quantity;

        html += `
          <div class="unified-cart-item">
            <div class="unified-item-details">
              <div class="unified-item-name">${escapeHtml(item.name)}</div>
              <div class="unified-item-info">Quantity: ${quantity} × $${item.price.toFixed(2)}</div>
            </div>
            <div class="unified-item-price">$${itemTotal.toFixed(2)}</div>
          </div>
        `;
      });

      html += `</div>`;
    }

    // Empty state
    if (bookingCart.length === 0 && storeCart.length === 0) {
      html = `
        <div class="unified-empty-cart">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
          </svg>
          <p style="margin-top: 1rem; font-weight: 600;">Your cart is empty</p>
          <small>Add sessions or products to get started</small>
        </div>
      `;
    }

    itemsContainer.innerHTML = html;

    if (totalElement) {
      totalElement.textContent = `$${summary.total.toFixed(2)}`;
    }

    if (checkoutBtn) {
      checkoutBtn.disabled = (bookingCart.length === 0 && storeCart.length === 0);
    }
  }

  function formatTime(timeString) {
    if (!timeString) return 'Invalid Time';

    // Handle ISO datetime strings
    if (typeof timeString === 'string' && timeString.includes('T')) {
      try {
        const date = new Date(timeString);
        const hour = date.getUTCHours();
        const min = date.getUTCMinutes();
        const ampm = hour >= 12 ? 'pm' : 'am';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const displayMinutes = String(min).padStart(2, '0');
        return `${displayHour}:${displayMinutes}${ampm}`;
      } catch (e) {
        return 'Invalid Time';
      }
    }

    // Handle simple time strings
    if (typeof timeString !== 'string') return 'Invalid Time';

    const parts = timeString.split(':');
    if (parts.length < 2) return 'Invalid Time';

    const hour = parseInt(parts[0], 10);
    const min = parseInt(parts[1], 10);

    if (isNaN(hour) || isNaN(min) || hour < 0 || hour > 23 || min < 0 || min > 59) {
      return 'Invalid Time';
    }

    const ampm = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const displayMinutes = String(min).padStart(2, '0');
    return `${displayHour}:${displayMinutes}${ampm}`;
  }

  function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function handleUnifiedCheckout() {
    const storeCart = getCart();
    const bookingCart = getBookingCart();

    if (storeCart.length === 0 && bookingCart.length === 0) {
      alert('Your cart is empty!');
      return;
    }

    // Store unified cart data for checkout page
    const unifiedCartData = {
      sessions: bookingCart,
      products: storeCart,
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('doggypaddle_unified_checkout', JSON.stringify(unifiedCartData));

    // Calculate total
    const summary = calculateSummary(storeCart);

    // For now, redirect to Stripe with the total amount
    // In the future, you should create a Stripe checkout session with line items
    const stripeUrl = window.DoggyPaddleConfig?.STRIPE?.singleSession ||
                     'https://buy.stripe.com/14AaEW1GV3vIgaK7fE5J60c';

    window.location.href = stripeUrl;
  }

  if (headerCartButton) {
    headerCartButton.addEventListener('click', (event) => {
      event.preventDefault();
      openStoreCart();
    });
  }

  window.addEventListener('storeCartUpdated', (event) => {
    updateHeaderCart(event?.detail?.cart);
  });

  // Listen for booking cart updates (from calendar.js)
  window.addEventListener('cartUpdated', () => {
    updateHeaderCart();
  });

  window.addEventListener('storage', (event) => {
    if (event.key === 'doggypaddle_cart' || event.key === 'doggypaddle_booking_cart') {
      updateHeaderCart();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => updateHeaderCart());
  } else {
    updateHeaderCart();
  }
})();
