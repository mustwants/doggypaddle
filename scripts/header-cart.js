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
  }
