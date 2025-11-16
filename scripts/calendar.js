// scripts/calendar.js - Enhanced Calendar with Cart & Discounts

document.addEventListener("DOMContentLoaded", () => {
  const calendarPlaceholder = document.getElementById("calendar-placeholder");

  if (!calendarPlaceholder) {
    console.warn("Calendar placeholder not found");
    return;
  }

  // Configuration
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();
  let cart = JSON.parse(localStorage.getItem('doggypaddle_booking_cart')) || [];

  // Pricing constants
  const PRICE_PER_SLOT = 25;
  const DISCOUNT_THRESHOLD = 5; // Every 5 slots

  // API endpoint for fetching available slots
  const API_ENDPOINT = window.DoggyPaddleConfig?.API_ENDPOINT ||
                       "https://script.google.com/macros/s/YOUR_DEPLOYED_WEBAPP_ID/exec";

  // Check if API endpoint is configured
  const isBackendConfigured = API_ENDPOINT && !API_ENDPOINT.includes('YOUR_DEPLOYED_WEBAPP_ID');

  // Mock available slots from admin (will be replaced by API call)
  // Slots are now 30 minutes at top and bottom of hour
  let availableSlots = [
    { id: "slot-1", date: "2025-11-15", time: "10:00", duration: 30 },
    { id: "slot-2", date: "2025-11-15", time: "10:30", duration: 30 },
    { id: "slot-3", date: "2025-11-15", time: "14:00", duration: 30 },
    { id: "slot-4", date: "2025-11-15", time: "14:30", duration: 30 },
    { id: "slot-5", date: "2025-11-16", time: "11:00", duration: 30 },
    { id: "slot-6", date: "2025-11-16", time: "11:30", duration: 30 },
    { id: "slot-7", date: "2025-11-16", time: "15:00", duration: 30 },
    { id: "slot-8", date: "2025-11-16", time: "15:30", duration: 30 },
    { id: "slot-9", date: "2025-11-20", time: "09:00", duration: 30 },
    { id: "slot-10", date: "2025-11-20", time: "09:30", duration: 30 },
    { id: "slot-11", date: "2025-11-20", time: "12:00", duration: 30 },
    { id: "slot-12", date: "2025-11-20", time: "12:30", duration: 30 },
    { id: "slot-13", date: "2025-11-20", time: "16:00", duration: 30 },
    { id: "slot-14", date: "2025-11-20", time: "16:30", duration: 30 },
    { id: "slot-15", date: "2025-11-22", time: "10:00", duration: 30 },
    { id: "slot-16", date: "2025-11-22", time: "11:00", duration: 30 },
    { id: "slot-17", date: "2025-11-22", time: "13:00", duration: 30 },
    { id: "slot-18", date: "2025-11-22", time: "14:00", duration: 30 },
    { id: "slot-19", date: "2025-11-22", time: "15:00", duration: 30 },
    { id: "slot-20", date: "2025-11-22", time: "16:00", duration: 30 },
  ];

  const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Fetch available slots from server
  async function fetchAvailableSlots() {
    // Check if backend is configured
    if (!isBackendConfigured) {
      console.warn(
        "%c⚠️ Backend Not Configured",
        "color: #ff9800; font-size: 14px; font-weight: bold;",
        "\n\nThe Google Apps Script backend hasn't been set up yet.",
        "\nChecking for admin-created time slots in local storage...",
        "\n\nTo enable live booking:",
        "\n1. Follow the instructions in /backend/README.md",
        "\n2. Deploy the Google Apps Script",
        "\n3. Update the API_ENDPOINT in /scripts/config.js",
        "\n\nFor detailed setup instructions, see: /backend/README.md"
      );

      // Check for admin-created time slots in localStorage
      const adminSlots = JSON.parse(localStorage.getItem('doggypaddle_timeslots') || '[]');
      if (adminSlots.length > 0) {
        // Filter only available slots for the current/future dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        availableSlots = adminSlots
          .filter(slot => {
            const slotDate = new Date(slot.date);
            return slotDate >= today && slot.status === 'available';
          })
          .map(slot => ({
            id: slot.id,
            date: slot.date,
            time: slot.time,
            duration: slot.duration || 30,
            status: slot.status
          }));

        console.log(`✓ Loaded ${availableSlots.length} admin-created time slots from local storage`);
      } else {
        console.log('No admin time slots found. Using mock data for demonstration.');
      }

      return; // Use admin slots or mock data
    }

    try {
      const response = await fetch(`${API_ENDPOINT}?action=getAvailableSlots&month=${currentMonth + 1}&year=${currentYear}`);
      if (response.ok) {
        const data = await response.json();
        availableSlots = data.slots || availableSlots;
      }
    } catch (error) {
      console.warn("Could not fetch slots from server, using mock data:", error);
    }
  }

  function getSlotsForDate(dateString) {
    // Filter out slots already in cart
    const cartSlotIds = cart.map(item => item.id);
    return availableSlots.filter(slot =>
      slot.date === dateString && !cartSlotIds.includes(slot.id)
    );
  }

  function formatTime(timeString) {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "pm" : "am";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes}${ampm}`;
  }

  function formatDateLong(dateString) {
    const date = new Date(dateString + 'T12:00:00');
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function generateCalendar(month, year) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = `
      <div class="calendar-header">
        <button id="prev-month" class="calendar-nav-btn" aria-label="Previous month">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"/>
          </svg>
        </button>
        <h3 class="calendar-title">${firstDay.toLocaleString("default", { month: "long" })} ${year}</h3>
        <button id="next-month" class="calendar-nav-btn" aria-label="Next month">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"/>
          </svg>
        </button>
      </div>
      <div class="calendar-grid">
    `;

    // Day headers
    DAYS_OF_WEEK.forEach((day) => {
      html += `<div class="calendar-day-header">${day}</div>`;
    });

    // Empty cells before first day
    for (let i = 0; i < startingDayOfWeek; i++) {
      html += `<div class="calendar-cell empty"></div>`;
    }

    // Calendar days
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isPast = currentDate < today;
      const isToday = currentDate.getTime() === today.getTime();

      const slots = getSlotsForDate(dateString);

      let cellClass = "calendar-cell";
      if (isPast) cellClass += " past";
      if (isToday) cellClass += " today";
      if (slots.length > 0 && !isPast) cellClass += " has-slots";

      html += `<div class="${cellClass}" data-date="${dateString}">`;
      html += `<div class="day-number">${day}</div>`;

      if (!isPast && slots.length > 0) {
        html += `<div class="slot-indicator">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 14a6 6 0 110-12 6 6 0 010 12z"/>
            <circle cx="8" cy="8" r="3"/>
          </svg>
          <span>${slots.length}</span>
        </div>`;
      }

      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }

  function showTimeSlotsModal(dateString, slots) {
    const existingModal = document.querySelector(".time-slots-modal");
    if (existingModal) existingModal.remove();

    const formattedDate = formatDateLong(dateString);

    const modal = document.createElement("div");
    modal.className = "time-slots-modal";
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <button class="modal-close" aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        <div class="modal-header">
          <div class="modal-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </div>
          <h3>Select Time Slots</h3>
          <p class="modal-date">${formattedDate}</p>
        </div>
        <div class="time-slots-grid">
          ${slots.map(slot => `
            <button class="time-slot-btn" data-slot='${JSON.stringify(slot)}'>
              <div class="slot-time">${formatTime(slot.time)}</div>
              <div class="slot-duration">${slot.duration} min</div>
              <div class="slot-price">$${PRICE_PER_SLOT}</div>
            </button>
          `).join("")}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";

    // Close modal handlers
    const closeModal = () => {
      modal.classList.remove("show");
      setTimeout(() => {
        modal.remove();
        document.body.style.overflow = "";
      }, 300);
    };

    modal.querySelector(".modal-close").addEventListener("click", closeModal);
    modal.querySelector(".modal-overlay").addEventListener("click", closeModal);

    const escHandler = (e) => {
      if (e.key === "Escape") {
        closeModal();
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);

    // Time slot selection
    modal.querySelectorAll(".time-slot-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const slot = JSON.parse(btn.dataset.slot);
        addToCart(slot);
        showNotification(`Added ${formatDateLong(slot.date)} at ${formatTime(slot.time)}`);

        // Re-render the modal with updated available slots
        const updatedSlots = getSlotsForDate(dateString);
        if (updatedSlots.length === 0) {
          closeModal();
          renderCalendar();
        } else {
          const updatedGrid = modal.querySelector('.time-slots-grid');
          updatedGrid.innerHTML = updatedSlots.map(slot => `
            <button class="time-slot-btn" data-slot='${JSON.stringify(slot)}'>
              <div class="slot-time">${formatTime(slot.time)}</div>
              <div class="slot-duration">${slot.duration} min</div>
              <div class="slot-price">$${PRICE_PER_SLOT}</div>
            </button>
          `).join("");

          // Re-attach event listeners
          updatedGrid.querySelectorAll(".time-slot-btn").forEach(newBtn => {
            newBtn.addEventListener("click", () => {
              const newSlot = JSON.parse(newBtn.dataset.slot);
              addToCart(newSlot);
              showNotification(`Added ${formatDateLong(newSlot.date)} at ${formatTime(newSlot.time)}`);

              const finalSlots = getSlotsForDate(dateString);
              if (finalSlots.length === 0) {
                closeModal();
                renderCalendar();
              } else {
                location.reload(); // Simple refresh to update
              }
            });
          });
        }
      });
    });

    setTimeout(() => modal.classList.add("show"), 10);
  }

  // Cart functions
  function addToCart(slot) {
    cart.push({
      id: slot.id,
      date: slot.date,
      time: slot.time,
      duration: slot.duration,
      price: PRICE_PER_SLOT
    });
    saveCart();
    updateCartUI();
  }

  function removeFromCart(slotId) {
    cart = cart.filter(item => item.id !== slotId);
    saveCart();
    updateCartUI();
    renderCalendar(); // Refresh calendar to show slot as available again
  }

  function clearCart() {
    cart = [];
    saveCart();
    updateCartUI();
    renderCalendar();
  }

  function saveCart() {
    localStorage.setItem('doggypaddle_booking_cart', JSON.stringify(cart));
  }

  function calculatePricing() {
    const totalSlots = cart.length;
    const fullPriceSlots = totalSlots - Math.floor(totalSlots / DISCOUNT_THRESHOLD);
    const freeSlots = Math.floor(totalSlots / DISCOUNT_THRESHOLD);
    const subtotal = totalSlots * PRICE_PER_SLOT;
    const discount = freeSlots * PRICE_PER_SLOT;
    const total = fullPriceSlots * PRICE_PER_SLOT;

    return {
      totalSlots,
      fullPriceSlots,
      freeSlots,
      subtotal,
      discount,
      total
    };
  }

  function updateCartUI() {
    let cartSidebar = document.getElementById('booking-cart-sidebar');

    if (!cartSidebar) {
      // Create cart sidebar if it doesn't exist
      cartSidebar = document.createElement('div');
      cartSidebar.id = 'booking-cart-sidebar';
      cartSidebar.className = 'booking-cart-sidebar';
      document.body.appendChild(cartSidebar);
    }

    const pricing = calculatePricing();
    const cartCount = cart.length;

    cartSidebar.innerHTML = `
      <div class="cart-header">
        <h3>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
          </svg>
          Session Cart (${cartCount})
        </h3>
        <button class="close-cart-btn" onclick="document.getElementById('booking-cart-sidebar').classList.remove('open')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="cart-items">
        ${cart.length === 0 ? `
          <div class="empty-cart">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
            </svg>
            <p>Your cart is empty</p>
            <small>Click on available dates to add sessions</small>
          </div>
        ` : cart.map(item => `
          <div class="cart-item">
            <div class="cart-item-details">
              <div class="cart-item-date">${formatDateLong(item.date)}</div>
              <div class="cart-item-time">${formatTime(item.time)} (${item.duration} min)</div>
            </div>
            <div class="cart-item-actions">
              <div class="cart-item-price">$${item.price}</div>
              <button class="remove-item-btn" data-slot-id="${item.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        `).join('')}
      </div>

      ${cart.length > 0 ? `
        <div class="cart-summary">
          ${pricing.freeSlots > 0 ? `
            <div class="discount-banner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 12v-1.5a2.5 2.5 0 00-5 0V12m-7 0v-1.5a2.5 2.5 0 00-5 0V12"/>
                <path d="M3 12a9 9 0 0018 0"/>
              </svg>
              <span>You're saving ${pricing.freeSlots} slot${pricing.freeSlots > 1 ? 's' : ''}!
              ${pricing.totalSlots % DISCOUNT_THRESHOLD !== 0 ? `(${DISCOUNT_THRESHOLD - (pricing.totalSlots % DISCOUNT_THRESHOLD)} more for another free slot)` : ''}</span>
            </div>
          ` : pricing.totalSlots > 0 ? `
            <div class="discount-info">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <span>Add ${DISCOUNT_THRESHOLD - pricing.totalSlots} more slot${DISCOUNT_THRESHOLD - pricing.totalSlots > 1 ? 's' : ''} to get 1 free!</span>
            </div>
          ` : ''}

          <div class="summary-row">
            <span>Subtotal (${pricing.totalSlots} slots)</span>
            <span>$${pricing.subtotal.toFixed(2)}</span>
          </div>

          ${pricing.discount > 0 ? `
            <div class="summary-row discount">
              <span>Discount (${pricing.freeSlots} free)</span>
              <span>-$${pricing.discount.toFixed(2)}</span>
            </div>
          ` : ''}

          <div class="summary-row total">
            <span>Total</span>
            <span>$${pricing.total.toFixed(2)}</span>
          </div>
        </div>

        <div class="cart-actions">
          <button class="checkout-btn" onclick="proceedToCheckout()">
            Proceed to Checkout
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
          <button class="clear-cart-btn" onclick="clearBookingCart()">Clear Cart</button>
        </div>
      ` : ''}
    `;

    // Attach event listeners for remove buttons
    cartSidebar.querySelectorAll('.remove-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        removeFromCart(btn.dataset.slotId);
      });
    });

    // Update cart badge
    updateCartBadge();
  }

  function updateCartBadge() {
    let cartBtn = document.getElementById('open-cart-btn');

    if (!cartBtn) {
      // Create floating cart button
      cartBtn = document.createElement('button');
      cartBtn.id = 'open-cart-btn';
      cartBtn.className = 'floating-cart-btn';
      cartBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="9" cy="21" r="1"/>
          <circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
        </svg>
        <span class="cart-badge">0</span>
      `;
      cartBtn.onclick = () => {
        document.getElementById('booking-cart-sidebar').classList.toggle('open');
      };
      document.body.appendChild(cartBtn);
    }

    const badge = cartBtn.querySelector('.cart-badge');
    badge.textContent = cart.length;
    badge.style.display = cart.length > 0 ? 'flex' : 'none';
  }

  function attachCalendarListeners() {
    const prevBtn = document.getElementById("prev-month");
    const nextBtn = document.getElementById("next-month");

    if (prevBtn) {
      prevBtn.addEventListener("click", async () => {
        currentMonth--;
        if (currentMonth < 0) {
          currentMonth = 11;
          currentYear--;
        }
        await renderCalendar();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", async () => {
        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
        await renderCalendar();
      });
    }

    document.querySelectorAll(".calendar-cell.has-slots").forEach(cell => {
      cell.addEventListener("click", () => {
        const dateString = cell.dataset.date;
        const slots = getSlotsForDate(dateString);
        if (slots.length > 0) {
          showTimeSlotsModal(dateString, slots);
        }
      });
    });
  }

  async function renderCalendar() {
    calendarPlaceholder.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading available slots...</p></div>';
    await fetchAvailableSlots();
    calendarPlaceholder.innerHTML = generateCalendar(currentMonth, currentYear);
    attachCalendarListeners();
  }

  function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
        <path d="M22 4L12 14.01l-3-3"/>
      </svg>
      <span>${message}</span>
    `;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Global functions for cart actions
  window.clearBookingCart = clearCart;
  window.proceedToCheckout = function() {
    if (cart.length === 0) {
      alert('Your cart is empty. Please add some time slots first.');
      return;
    }

    // Store cart data for checkout
    localStorage.setItem('checkout_cart', JSON.stringify(cart));
    localStorage.setItem('checkout_pricing', JSON.stringify(calculatePricing()));

    // Scroll to booking form
    const bookingForm = document.getElementById('booking');
    if (bookingForm) {
      bookingForm.scrollIntoView({ behavior: 'smooth' });
      // Show success message
      showNotification('Please fill out your information to complete the booking');
    }
  };

  // Add enhanced styles
  const style = document.createElement("style");
  style.textContent = `
    /* Enhanced Calendar Styles */
    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      border-radius: 16px;
      color: white;
      box-shadow: 0 4px 20px rgba(2, 128, 144, 0.3);
    }

    .calendar-title {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.5px;
    }

    .calendar-nav-btn {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      width: 48px;
      height: 48px;
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
    }

    .calendar-nav-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      border-color: rgba(255, 255, 255, 0.5);
      transform: scale(1.05);
    }

    .calendar-nav-btn:active {
      transform: scale(0.95);
    }

    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 12px;
      background: white;
      padding: 1.5rem;
      border-radius: 16px;
      box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
    }

    .calendar-day-header {
      text-align: center;
      font-weight: 700;
      color: var(--secondary);
      padding: 1rem 0.5rem;
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .calendar-cell {
      aspect-ratio: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      border-radius: 12px;
      background: #fafafa;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      border: 2px solid transparent;
      min-height: 90px;
    }

    .calendar-cell.empty {
      background: transparent;
      cursor: default;
    }

    .calendar-cell.past {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .calendar-cell.today {
      background: linear-gradient(135deg, #fff9e6 0%, #fff3cc 100%);
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(240, 162, 2, 0.1);
    }

    .calendar-cell.has-slots {
      background: linear-gradient(135deg, #e6f7f9 0%, #d4f1f4 100%);
      border-color: var(--primary);
      cursor: pointer;
    }

    .calendar-cell.has-slots:hover {
      transform: translateY(-4px) scale(1.02);
      box-shadow: 0 8px 24px rgba(2, 128, 144, 0.25);
      border-color: var(--primary-dark);
    }

    .day-number {
      font-weight: 700;
      font-size: 1.5rem;
      color: var(--secondary);
      margin-bottom: 0.5rem;
    }

    .calendar-cell.today .day-number {
      color: var(--accent);
    }

    .slot-indicator {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      background: var(--primary);
      color: white;
      padding: 0.35rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(2, 128, 144, 0.3);
    }

    /* Modal Enhancements */
    .time-slots-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .time-slots-modal.show {
      opacity: 1;
    }

    .modal-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
    }

    .modal-content {
      position: relative;
      background: white;
      border-radius: 24px;
      padding: 2.5rem;
      max-width: 600px;
      width: 90%;
      max-height: 85vh;
      overflow-y: auto;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.4);
      transform: scale(0.9);
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .time-slots-modal.show .modal-content {
      transform: scale(1);
    }

    .modal-close {
      position: absolute;
      top: 1.5rem;
      right: 1.5rem;
      background: #f5f5f5;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      color: var(--text-light);
    }

    .modal-close:hover {
      background: #e0e0e0;
      color: var(--text);
      transform: rotate(90deg);
    }

    .modal-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .modal-icon {
      display: inline-flex;
      padding: 1rem;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      border-radius: 16px;
      color: white;
      margin-bottom: 1rem;
      box-shadow: 0 4px 16px rgba(2, 128, 144, 0.3);
    }

    .modal-header h3 {
      margin: 0.5rem 0;
      color: var(--secondary);
      font-size: 1.75rem;
    }

    .modal-date {
      color: var(--text-light);
      font-size: 1rem;
      margin: 0;
    }

    .time-slots-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 1rem;
    }

    .time-slot-btn {
      background: white;
      border: 2px solid var(--border);
      padding: 1.5rem 1rem;
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      position: relative;
      overflow: hidden;
    }

    .time-slot-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .time-slot-btn > * {
      position: relative;
      z-index: 1;
    }

    .time-slot-btn:hover {
      border-color: var(--primary);
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(2, 128, 144, 0.25);
    }

    .time-slot-btn:hover::before {
      opacity: 1;
    }

    .time-slot-btn:hover .slot-time,
    .time-slot-btn:hover .slot-duration,
    .time-slot-btn:hover .slot-price {
      color: white;
    }

    .slot-time {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--secondary);
      transition: color 0.3s ease;
    }

    .slot-duration {
      font-size: 0.9rem;
      color: var(--text-light);
      transition: color 0.3s ease;
    }

    .slot-price {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--primary);
      margin-top: 0.25rem;
      transition: color 0.3s ease;
    }

    /* Cart Sidebar */
    .booking-cart-sidebar {
      position: fixed;
      top: 0;
      right: -420px;
      width: 420px;
      height: 100vh;
      background: white;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
      transition: right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 9999;
      display: flex;
      flex-direction: column;
    }

    .booking-cart-sidebar.open {
      right: 0;
    }

    .cart-header {
      padding: 1.5rem;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    }

    .cart-header h3 {
      margin: 0;
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .close-cart-btn {
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

    .close-cart-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .cart-items {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
    }

    .empty-cart {
      text-align: center;
      padding: 3rem 1.5rem;
      color: var(--text-light);
    }

    .empty-cart svg {
      margin-bottom: 1rem;
      opacity: 0.3;
    }

    .empty-cart p {
      font-weight: 600;
      color: var(--text);
      margin-bottom: 0.5rem;
    }

    .cart-item {
      background: #fafafa;
      border-radius: 12px;
      padding: 1rem;
      margin-bottom: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      border: 2px solid transparent;
      transition: all 0.2s ease;
    }

    .cart-item:hover {
      border-color: var(--primary);
      background: #f0f9fb;
    }

    .cart-item-details {
      flex: 1;
    }

    .cart-item-date {
      font-weight: 600;
      color: var(--secondary);
      margin-bottom: 0.25rem;
      font-size: 0.9rem;
    }

    .cart-item-time {
      color: var(--text-light);
      font-size: 0.85rem;
    }

    .cart-item-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .cart-item-price {
      font-weight: 700;
      color: var(--primary);
      font-size: 1.1rem;
    }

    .remove-item-btn {
      background: #fee;
      border: none;
      color: #c33;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .remove-item-btn:hover {
      background: #fcc;
      transform: scale(1.1);
    }

    .cart-summary {
      padding: 1.5rem;
      border-top: 2px solid var(--border);
      background: #fafafa;
    }

    .discount-banner {
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      color: white;
      padding: 1rem;
      border-radius: 12px;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 600;
      font-size: 0.9rem;
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
    }

    .discount-info {
      background: #e6f7f9;
      color: var(--primary-dark);
      padding: 0.875rem;
      border-radius: 12px;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.85rem;
      border: 2px solid var(--primary);
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 0;
      color: var(--text);
    }

    .summary-row.discount {
      color: #22c55e;
      font-weight: 600;
    }

    .summary-row.total {
      border-top: 2px solid var(--border);
      margin-top: 0.5rem;
      padding-top: 1rem;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--secondary);
    }

    .cart-actions {
      padding: 1.5rem;
      background: white;
      border-top: 2px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .checkout-btn {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      border: none;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      box-shadow: 0 4px 12px rgba(2, 128, 144, 0.3);
    }

    .checkout-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(2, 128, 144, 0.4);
    }

    .clear-cart-btn {
      background: transparent;
      color: var(--text-light);
      border: 2px solid var(--border);
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .clear-cart-btn:hover {
      border-color: #c33;
      color: #c33;
      background: #fee;
    }

    /* Floating Cart Button */
    .floating-cart-btn {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      border: none;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(2, 128, 144, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      z-index: 9998;
    }

    .floating-cart-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 12px 32px rgba(2, 128, 144, 0.5);
    }

    .cart-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: var(--accent);
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    /* Notification */
    .notification {
      position: fixed;
      top: 2rem;
      right: 2rem;
      background: white;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 0.75rem;
      z-index: 10001;
      transform: translateX(400px);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border-left: 4px solid var(--primary);
    }

    .notification.show {
      transform: translateX(0);
    }

    .notification svg {
      color: var(--primary);
      flex-shrink: 0;
    }

    .loading-spinner {
      text-align: center;
      padding: 4rem 2rem;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid var(--border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .booking-cart-sidebar {
        width: 100%;
        right: -100%;
      }

      .calendar-grid {
        gap: 8px;
        padding: 1rem;
      }

      .calendar-cell {
        padding: 0.5rem;
        min-height: 70px;
      }

      .day-number {
        font-size: 1.25rem;
      }

      .slot-indicator {
        font-size: 0.7rem;
        padding: 0.25rem 0.5rem;
      }

      .modal-content {
        padding: 2rem 1.5rem;
        width: 95%;
      }

      .time-slots-grid {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      }

      .floating-cart-btn {
        width: 56px;
        height: 56px;
        bottom: 1.5rem;
        right: 1.5rem;
      }

      .notification {
        right: 1rem;
        left: 1rem;
      }
    }
  `;
  document.head.appendChild(style);

  // Initialize
  renderCalendar();
  updateCartUI();
});
