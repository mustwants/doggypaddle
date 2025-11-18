// DoggyPaddle Admin Module
// This file provides admin functionality for the standalone admin dashboard

(function() {
  'use strict';

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

  // API endpoint
  const API_ENDPOINT = window.DoggyPaddleConfig?.API_ENDPOINT ||
                       'https://script.google.com/macros/s/YOUR_DEPLOYED_WEBAPP_ID/exec';

  // Check if backend is configured
  const isBackendConfigured = API_ENDPOINT && !API_ENDPOINT.includes('YOUR_DEPLOYED_WEBAPP_ID');

  // Data storage
  let products = [];
  let timeSlots = [];
  let bookings = [];
  let photos = [];
  let orders = [];

  // Initialize admin module when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    console.log('Admin module initializing...');
    // Wait for main dashboard to be ready
    setTimeout(() => {
      if (typeof window.isAdminLoggedIn !== 'undefined' && window.isAdminLoggedIn) {
        setupAdminFeatures();
      }
    }, 1000);
  }

  function setupAdminFeatures() {
    console.log('Setting up admin features...');

    // Load data from localStorage
    loadLocalData();

    // Set up event listeners
    setupEventListeners();

    // Expose functions globally for the main dashboard
    // Don't overwrite loadAdminProducts if it already exists (admin-dashboard.js provides a better version)
    if (!window.loadAdminProducts) {
      window.loadAdminProducts = loadAdminProducts;
    }
    window.loadTimeSlots = loadTimeSlots;
    window.loadBookings = loadBookings;
    window.loadPhotos = loadPhotos;
    window.loadOrders = loadOrders;
    window.showNotification = showNotification;

    console.log('Admin features ready!');

    // Load the initial active tab (Products by default)
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      const activeTab = document.querySelector('.admin-tab.active');
      if (activeTab) {
        const tabName = activeTab.dataset.tab;
        console.log('Loading initial tab:', tabName);
        // Use window.loadAdminProducts to call whichever version is available
        if (tabName === 'products') window.loadAdminProducts();
        else if (tabName === 'timeslots') loadTimeSlots();
        else if (tabName === 'bookings') loadBookings();
        else if (tabName === 'photos') loadPhotos();
        else if (tabName === 'orders') loadOrders();
      }
    }, 100);
  }

  function loadLocalData() {
    try {
      products = JSON.parse(localStorage.getItem('doggypaddle_products')) || [];
      timeSlots = JSON.parse(localStorage.getItem('doggypaddle_timeslots')) || [];
      bookings = JSON.parse(localStorage.getItem('doggypaddle_bookings')) || [];
      photos = JSON.parse(localStorage.getItem('doggypaddle_photos')) || [];
      orders = JSON.parse(localStorage.getItem('doggypaddle_orders')) || [];
      console.log('Local data loaded:', { products: products.length, timeSlots: timeSlots.length, bookings: bookings.length });
    } catch (e) {
      console.error('Error loading local data:', e);
    }
  }

  function setupEventListeners() {
    // Products - handled by store.js modal
    // Time Slots - handled by admin-dashboard.js
    // Photos - handled by admin-dashboard.js

    // Bookings
    const exportBookingsBtn = document.getElementById('export-bookings-btn');
    if (exportBookingsBtn) {
      exportBookingsBtn.addEventListener('click', exportBookings);
    }

    // Photos
    const selectAllPhotos = document.getElementById('select-all-photos');
    const bulkApproveBtn = document.getElementById('bulk-approve-photos');
    const bulkRejectBtn = document.getElementById('bulk-reject-photos');

    if (selectAllPhotos) {
      selectAllPhotos.addEventListener('change', handleSelectAllPhotos);
    }
    if (bulkApproveBtn) {
      bulkApproveBtn.addEventListener('click', handleBulkApprove);
    }
    if (bulkRejectBtn) {
      bulkRejectBtn.addEventListener('click', handleBulkReject);
    }
  }

  // Products Management
  function loadAdminProducts() {
    const listContainer = document.getElementById('admin-products-list');
    if (!listContainer) return;

    console.log('Loading products...', products.length);

    if (products.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: #666;">
          <p style="font-size: 1.1rem; margin-bottom: 1rem;">No products found</p>
          <p style="font-size: 0.9rem;">Click "Add New Product/Treat" to create your first product</p>
        </div>
      `;
      return;
    }

    let html = `
      <style>
        .product-card {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1rem;
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
        }
        .product-image {
          width: 100px;
          height: 100px;
          object-fit: cover;
          border-radius: 8px;
          background: #f5f5f5;
        }
        .product-info {
          flex: 1;
        }
        .product-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
          margin-bottom: 0.5rem;
        }
        .product-description {
          color: #666;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }
        .product-price {
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--primary, #028090);
        }
        .product-actions {
          display: flex;
          gap: 0.5rem;
          flex-direction: column;
        }
        .product-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-edit {
          background: #02C39A;
          color: white;
        }
        .btn-edit:hover {
          background: #028090;
        }
        .btn-delete {
          background: #e74c3c;
          color: white;
        }
        .btn-delete:hover {
          background: #c0392b;
        }
        .stock-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 600;
          margin-top: 0.5rem;
        }
        .in-stock {
          background: #d4edda;
          color: #155724;
        }
        .out-of-stock {
          background: #f8d7da;
          color: #721c24;
        }
        .low-stock {
          background: #fff3cd;
          color: #856404;
        }
      </style>
    `;

    products.forEach(product => {
      let stockBadge = '';
      if (product.quantity !== undefined) {
        if (product.quantity === 0) {
          stockBadge = '<span class="stock-badge out-of-stock">Out of Stock</span>';
        } else if (product.quantity < 5) {
          stockBadge = `<span class="stock-badge low-stock">Low Stock (${product.quantity})</span>`;
        } else {
          stockBadge = `<span class="stock-badge in-stock">In Stock (${product.quantity})</span>`;
        }
      }

      // Security: Escape all user-supplied fields to prevent XSS
      const escapedImageUrl = escapeHtml(product.imageUrl || '/assets/products/placeholder.jpg');
      const escapedName = escapeHtml(product.name);
      const escapedDescription = escapeHtml(product.description || '');
      const escapedId = escapeHtml(product.id);

      html += `
        <div class="product-card">
          <img src="${escapedImageUrl}" alt="${escapedName}" class="product-image" onerror="this.src='/assets/products/placeholder.jpg'">
          <div class="product-info">
            <div class="product-name">${escapedName}</div>
            <div class="product-description">${escapedDescription}</div>
            <div class="product-price">$${(product.price || 0).toFixed(2)}</div>
            ${stockBadge}
          </div>
          <div class="product-actions">
            <button class="product-btn btn-edit" onclick="window.editProduct('${escapedId}')">Edit</button>
            <button class="product-btn btn-delete" onclick="window.deleteProduct('${escapedId}')">Delete</button>
          </div>
        </div>
      `;
    });

    listContainer.innerHTML = html;
  }

  // Time Slots Management
  function loadTimeSlots() {
    const listContainer = document.getElementById('admin-timeslots-list');
    if (!listContainer) return;

    console.log('Loading time slots...', timeSlots.length);

    if (timeSlots.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: #666;">
          <p style="font-size: 1.1rem; margin-bottom: 1rem;">No time slots found</p>
          <p style="font-size: 0.9rem;">Click "Add Time Slot" or "Bulk Add Slots" to create availability</p>
        </div>
      `;
      return;
    }

    let html = `
      <style>
        .slot-card {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 0.75rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .slot-info {
          flex: 1;
        }
        .slot-date {
          font-weight: 600;
          color: #333;
        }
        .slot-time {
          color: #666;
          font-size: 0.9rem;
        }
        .slot-status {
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .status-available {
          background: #d4edda;
          color: #155724;
        }
        .status-booked {
          background: #f8d7da;
          color: #721c24;
        }
        .status-blocked {
          background: #e2e3e5;
          color: #383d41;
        }
      </style>
    `;

    // Sort by date and time
    const sortedSlots = [...timeSlots].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });

    sortedSlots.forEach(slot => {
      const statusClass = `status-${(slot.status || 'available').toLowerCase()}`;
      html += `
        <div class="slot-card">
          <div class="slot-info">
            <div class="slot-date">${formatDate(slot.date)}</div>
            <div class="slot-time">${formatTime(slot.time)} - ${slot.duration || 30} minutes</div>
          </div>
          <span class="slot-status ${statusClass}">${slot.status || 'Available'}</span>
        </div>
      `;
    });

    listContainer.innerHTML = html;
  }

  // Bookings Management
  function loadBookings() {
    const listContainer = document.getElementById('admin-bookings-list');
    if (!listContainer) return;

    console.log('Loading bookings...', bookings.length);

    if (bookings.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: #666;">
          <p style="font-size: 1.1rem; margin-bottom: 1rem;">No bookings found</p>
          <p style="font-size: 0.9rem;">Bookings will appear here when customers book time slots</p>
        </div>
      `;
      return;
    }

    let html = `
      <style>
        .booking-card {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1rem;
        }
        .booking-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }
        .booking-customer {
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
        }
        .booking-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.75rem;
          color: #666;
          font-size: 0.9rem;
        }
        .info-label {
          font-weight: 600;
          color: #333;
        }
      </style>
    `;

    // Sort by date (most recent first)
    const sortedBookings = [...bookings].sort((a, b) => {
      return new Date(b.bookedAt || b.date) - new Date(a.bookedAt || a.date);
    });

    sortedBookings.forEach(booking => {
      html += `
        <div class="booking-card">
          <div class="booking-header">
            <div class="booking-customer">${booking.customerName || 'Unknown'}</div>
            <span class="slot-status status-${(booking.status || 'pending').toLowerCase()}">${booking.status || 'Pending'}</span>
          </div>
          <div class="booking-info">
            <div><span class="info-label">Email:</span> ${booking.email || 'N/A'}</div>
            <div><span class="info-label">Phone:</span> ${booking.phone || 'N/A'}</div>
            <div><span class="info-label">Dog Name:</span> ${booking.dogName || 'N/A'}</div>
            <div><span class="info-label">Date:</span> ${formatDate(booking.date)}</div>
            <div><span class="info-label">Time:</span> ${formatTime(booking.time)}</div>
            <div><span class="info-label">Duration:</span> ${booking.duration || 30} min</div>
          </div>
        </div>
      `;
    });

    listContainer.innerHTML = html;
  }

  // Export bookings to CSV
  function exportBookings() {
    if (bookings.length === 0) {
      alert('No bookings to export');
      return;
    }

    const headers = ['Name', 'Email', 'Phone', 'Dog Name', 'Date', 'Time', 'Duration', 'Status', 'Booked At'];
    const rows = bookings.map(b => [
      b.customerName || '',
      b.email || '',
      b.phone || '',
      b.dogName || '',
      b.date || '',
      b.time || '',
      b.duration || '30',
      b.status || 'Pending',
      b.bookedAt || ''
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doggypaddle-bookings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showNotification('Bookings exported successfully!');
  }

  // Photos Management
  async function loadPhotos() {
    const listContainer = document.getElementById('admin-photos-list');
    if (!listContainer) return;

    // Show loading state
    listContainer.innerHTML = '<div style="text-align: center; padding: 3rem; color: #666;">Loading photos...</div>';

    try {
      // Fetch photos from backend
      const API_ENDPOINT = window.DoggyPaddleConfig?.API_ENDPOINT;
      if (!API_ENDPOINT) {
        throw new Error('API endpoint not configured');
      }

      const response = await fetch(`${API_ENDPOINT}?action=getPhotos&admin=true`);

      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }

      const result = await response.json();

      if (result.status !== 'success') {
        throw new Error(result.message || 'Failed to load photos');
      }

      photos = result.photos || [];

      console.log('Loading photos...', photos.length);

      if (photos.length === 0) {
        listContainer.innerHTML = `
          <div style="text-align: center; padding: 3rem; color: #666;">
            <p style="font-size: 1.1rem; margin-bottom: 1rem;">No photo submissions found</p>
            <p style="font-size: 0.9rem;">Photos submitted by customers will appear here for approval</p>
          </div>
        `;
        return;
      }
    } catch (error) {
      console.error('Error loading photos:', error);
      listContainer.innerHTML = `<div style="text-align: center; padding: 3rem; color: #dc3545;">Error loading photos: ${error.message}</div>`;
      return;
    }

    let html = `
      <style>
        .photo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        .photo-card {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }
        .photo-image {
          width: 100%;
          height: 200px;
          object-fit: cover;
          background: #f5f5f5;
        }
        .photo-details {
          padding: 1rem;
        }
        .photo-caption {
          color: #333;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }
        .photo-meta {
          color: #666;
          font-size: 0.8rem;
        }
        .photo-actions {
          display: flex;
          gap: 0.5rem;
          padding: 0.75rem;
          border-top: 1px solid #e0e0e0;
        }
        .photo-btn {
          flex: 1;
          padding: 0.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
        }
      </style>
      <div class="photo-grid">
    `;

    photos.forEach(photo => {
      const isApproved = photo.status === 'approved';
      const isRejected = photo.status === 'rejected';
      const isPending = !isApproved && !isRejected;

      // Security: Escape all user-supplied fields to prevent XSS
      const escapedUrl = escapeHtml(photo.url || photo.imageUrl);
      const escapedCaption = escapeHtml(photo.caption || 'Photo');
      const escapedCaptionText = escapeHtml(photo.caption || 'No caption');
      const escapedCustomerName = escapeHtml(photo.customerName || 'Anonymous');
      const escapedId = escapeHtml(photo.id);

      html += `
        <div class="photo-card">
          <img src="${escapedUrl}" alt="${escapedCaption}" class="photo-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
          <div class="photo-details">
            <div class="photo-caption">${escapedCaptionText}</div>
            <div class="photo-meta">
              By: ${escapedCustomerName}<br>
              ${photo.submittedAt ? 'Submitted: ' + new Date(photo.submittedAt).toLocaleDateString() : ''}
            </div>
          </div>
          <div class="photo-actions">
            ${isPending ? `
              <button class="photo-btn btn-edit" onclick="window.approvePhoto('${escapedId}')"> Approve</button>
              <button class="photo-btn btn-delete" onclick="window.rejectPhoto('${escapedId}')"> Reject</button>
            ` : ''}
            ${isApproved ? `<span style="color: #155724; flex: 1; text-align: center; font-weight: 600;"> Approved</span>` : ''}
            ${isRejected ? `<span style="color: #721c24; flex: 1; text-align: center; font-weight: 600;"> Rejected</span>` : ''}
          </div>
        </div>
      `;
    });

    html += '</div>';
    listContainer.innerHTML = html;
  }

  function handleSelectAllPhotos(e) {
    // TODO: Implement select all functionality
    showNotification('Select all photos - Coming soon!');
  }

  function handleBulkApprove() {
    // TODO: Implement bulk approve
    showNotification('Bulk approve - Coming soon!');
  }

  function handleBulkReject() {
    // TODO: Implement bulk reject
    showNotification('Bulk reject - Coming soon!');
  }

  // Orders Management
  function loadOrders() {
    const listContainer = document.getElementById('admin-orders-list');
    if (!listContainer) return;

    console.log('Loading orders...', orders.length);

    if (orders.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: #666;">
          <p style="font-size: 1.1rem; margin-bottom: 1rem;">No orders found</p>
          <p style="font-size: 0.9rem;">Orders will appear here when customers make purchases</p>
        </div>
      `;
      return;
    }

    let html = `
      <style>
        .order-card {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1rem;
        }
        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e0e0e0;
        }
        .order-id {
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
        }
        .order-date {
          color: #666;
          font-size: 0.9rem;
        }
        .order-status {
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .status-pending {
          background: #fff3cd;
          color: #856404;
        }
        .status-processing {
          background: #cfe2ff;
          color: #084298;
        }
        .status-completed {
          background: #d4edda;
          color: #155724;
        }
        .status-cancelled {
          background: #f8d7da;
          color: #721c24;
        }
        .order-customer {
          margin-bottom: 1rem;
          color: #666;
          font-size: 0.9rem;
        }
        .customer-name {
          font-weight: 600;
          color: #333;
        }
        .order-items {
          margin-bottom: 1rem;
        }
        .order-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .item-name {
          color: #333;
          font-weight: 500;
        }
        .item-quantity {
          color: #666;
          font-size: 0.9rem;
        }
        .item-price {
          color: var(--primary, #028090);
          font-weight: 600;
        }
        .order-total {
          display: flex;
          justify-content: space-between;
          padding-top: 1rem;
          border-top: 2px solid #e0e0e0;
          font-size: 1.2rem;
          font-weight: 700;
        }
        .total-label {
          color: #333;
        }
        .total-amount {
          color: var(--primary, #028090);
        }
      </style>
    `;

    // Sort by date (most recent first)
    const sortedOrders = [...orders].sort((a, b) => {
      return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
    });

    sortedOrders.forEach(order => {
      const statusClass = `status-${(order.status || 'pending').toLowerCase()}`;
      const orderDate = order.createdAt || order.date;
      const formattedDate = orderDate ? new Date(orderDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'N/A';

      let itemsHtml = '';
      if (order.items && Array.isArray(order.items)) {
        itemsHtml = order.items.map(item => `
          <div class="order-item">
            <div>
              <div class="item-name">${item.name || 'Unknown Item'}</div>
              <div class="item-quantity">Quantity: ${item.quantity || 1}</div>
            </div>
            <div class="item-price">$${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</div>
          </div>
        `).join('');
      }

      const total = order.total || (order.items && order.items.reduce((sum, item) =>
        sum + (item.price || 0) * (item.quantity || 1), 0)) || 0;

      html += `
        <div class="order-card">
          <div class="order-header">
            <div>
              <div class="order-id">Order #${order.id || order.orderId || 'N/A'}</div>
              <div class="order-date">${formattedDate}</div>
            </div>
            <span class="order-status ${statusClass}">${order.status || 'Pending'}</span>
          </div>
          <div class="order-customer">
            <span class="customer-name">${order.customerName || 'Guest'}</span>
            ${order.email ? `<br>Email: ${order.email}` : ''}
            ${order.phone ? `<br>Phone: ${order.phone}` : ''}
          </div>
          ${itemsHtml ? `<div class="order-items">${itemsHtml}</div>` : '<div style="color: #666; font-style: italic;">No items listed</div>'}
          <div class="order-total">
            <span class="total-label">Total:</span>
            <span class="total-amount">$${total.toFixed(2)}</span>
          </div>
        </div>
      `;
    });

    listContainer.innerHTML = html;
  }

  // Utility Functions
  function formatTime(timeString) {
    if (!timeString) {
      return 'Invalid Time';
    }

    // Handle ISO datetime strings (e.g., "1899-12-30T14:00:00.000Z")
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
        console.error('Error parsing datetime:', timeString, e);
        return 'Invalid Time';
      }
    }

    // Handle simple time strings (e.g., "14:00")
    if (typeof timeString !== 'string') {
      return 'Invalid Time';
    }

    const parts = timeString.split(':');
    if (parts.length < 2) {
      return 'Invalid Time';
    }

    const [hours, minutes] = parts;
    const hour = parseInt(hours, 10);
    const min = parseInt(minutes, 10);

    if (isNaN(hour) || isNaN(min) || hour < 0 || hour > 23 || min < 0 || min > 59) {
      return 'Invalid Time';
    }

    const ampm = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const displayMinutes = String(min).padStart(2, '0');
    return `${displayHour}:${displayMinutes}${ampm}`;
  }

  function formatDate(dateString) {
    if (!dateString) return 'Invalid Date';
    try {
      const date = new Date(dateString + 'T12:00:00');
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  }

  function showNotification(message, duration = 3000) {
    // Create notification element directly
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--primary, #028090);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 10001;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), duration);
  }

  // Expose edit/delete functions globally
  window.editProduct = function(id) {
    showNotification('Edit product: ' + id + ' - Coming soon!');
  };

  window.deleteProduct = function(id) {
    if (confirm('Are you sure you want to delete this product?')) {
      products = products.filter(p => p.id !== id);
      localStorage.setItem('doggypaddle_products', JSON.stringify(products));
      loadAdminProducts();
      showNotification('Product deleted successfully');
    }
  };

  window.approvePhoto = async function(photoId) {
    try {
      const API_ENDPOINT = window.DoggyPaddleConfig?.API_ENDPOINT;
      if (!API_ENDPOINT) {
        throw new Error('API endpoint not configured');
      }

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approvePhoto',
          photoId: photoId
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        showNotification('Photo approved!');
        loadPhotos();
      } else {
        throw new Error(result.message || 'Failed to approve photo');
      }
    } catch (error) {
      console.error('Error approving photo:', error);
      showNotification('Error approving photo: ' + error.message);
    }
  };

  window.rejectPhoto = async function(photoId) {
    if (!confirm('Are you sure you want to reject this photo?')) return;

    try {
      const API_ENDPOINT = window.DoggyPaddleConfig?.API_ENDPOINT;
      if (!API_ENDPOINT) {
        throw new Error('API endpoint not configured');
      }

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'rejectPhoto',
          photoId: photoId
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        showNotification('Photo rejected');
        loadPhotos();
      } else {
        throw new Error(result.message || 'Failed to reject photo');
      }
    } catch (error) {
      console.error('Error rejecting photo:', error);
      showNotification('Error rejecting photo: ' + error.message);
    }
  };

  console.log('Admin module loaded');
})();
