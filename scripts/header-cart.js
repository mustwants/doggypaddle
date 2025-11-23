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

  function calculateSummary(cart) {
    const totals = cart.reduce(
      (acc, item) => {
        acc.count += item.quantity;
        acc.total += item.price * item.quantity;
        return acc;
      },
      { count: 0, total: 0 }
    );

    return {
      count: totals.count,
      total: Number.isFinite(totals.total) ? totals.total : 0
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
    const cartSidebar = document.getElementById('cart-sidebar');

    if (cartSidebar) {
      cartSidebar.classList.add('open');
      cartSidebar.setAttribute('aria-hidden', 'false');
      return;
    }

    localStorage.setItem('doggypaddle_open_cart', 'true');
    window.location.href = '/store#cart';
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

  window.addEventListener('storage', (event) => {
    if (event.key === 'doggypaddle_cart') {
      updateHeaderCart();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => updateHeaderCart());
  } else {
    updateHeaderCart();
  }
})();
