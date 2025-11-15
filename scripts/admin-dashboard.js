// Admin Dashboard Enhancements for DoggyPaddle
// This file extends the base admin functionality with time slots, bookings, and photos management

document.addEventListener('DOMContentLoaded', () => {
  // Wait for base store.js to initialize
  setTimeout(initAdminEnhancements, 500);
});

function initAdminEnhancements() {
  // Tab switching
  const adminTabs = document.querySelectorAll('.admin-tab');
  const adminTabContents = document.querySelectorAll('.admin-tab-content');

  adminTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;

      // Update active tab
      adminTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update active content
      adminTabContents.forEach(content => content.classList.remove('active'));
      const targetContent = document.getElementById(`admin-${tabName}-tab`);
      if (targetContent) {
        targetContent.classList.add('active');
      }

      // Load data for the selected tab
      switch(tabName) {
        case 'timeslots':
          loadTimeSlots();
          break;
        case 'bookings':
          loadBookings();
          break;
        case 'photos':
          loadPhotos();
          break;
      }
    });
  });

  // Initialize all the features
  initTimeSlotManagement();
  initBookingsManagement();
  initPhotosManagement();
}

// ============================================
// TIME SLOTS MANAGEMENT
// ============================================

function initTimeSlotManagement() {
  const addTimeslotBtn = document.getElementById('add-timeslot-btn');
  const bulkAddSlotsBtn = document.getElementById('bulk-add-slots-btn');
  const timeslotFormModal = document.getElementById('timeslot-form-modal');
  const bulkTimeslotModal = document.getElementById('bulk-timeslot-modal');
  const timeslotForm = document.getElementById('timeslot-form');
  const bulkTimeslotForm = document.getElementById('bulk-timeslot-form');

  if (!addTimeslotBtn) return;

  // Add time slot button
  addTimeslotBtn.addEventListener('click', () => {
    document.getElementById('timeslot-form-title').textContent = 'Add Time Slot';
    document.getElementById('timeslot-id').value = '';
    timeslotForm.reset();
    // Set default date to today
    document.getElementById('timeslot-date').value = new Date().toISOString().split('T')[0];
    timeslotFormModal.style.display = 'flex';
  });

  // Bulk add slots button
  bulkAddSlotsBtn.addEventListener('click', () => {
    bulkTimeslotForm.reset();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bulk-start-date').value = today;
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    document.getElementById('bulk-end-date').value = nextWeek.toISOString().split('T')[0];
    bulkTimeslotModal.style.display = 'flex';
  });

  // Close buttons
  document.getElementById('close-timeslot-form')?.addEventListener('click', () => {
    timeslotFormModal.style.display = 'none';
  });

  document.getElementById('cancel-timeslot-form')?.addEventListener('click', () => {
    timeslotFormModal.style.display = 'none';
  });

  document.getElementById('close-bulk-timeslot')?.addEventListener('click', () => {
    bulkTimeslotModal.style.display = 'none';
  });

  document.getElementById('cancel-bulk-timeslot')?.addEventListener('click', () => {
    bulkTimeslotModal.style.display = 'none';
  });

  // Time slot form submission
  timeslotForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveTimeSlot();
  });

  // Bulk time slot form submission
  bulkTimeslotForm.addEventListener('submit', (e) => {
    e.preventDefault();
    generateBulkTimeSlots();
  });
}

function loadTimeSlots() {
  const timeslotsList = document.getElementById('admin-timeslots-list');
  if (!timeslotsList) return;

  const slots = JSON.parse(localStorage.getItem('doggypaddle_timeslots') || '[]');

  if (slots.length === 0) {
    timeslotsList.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-light);">No time slots available. Click "Add Time Slot" to create one.</p>';
    return;
  }

  // Sort slots by date and time
  slots.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });

  timeslotsList.innerHTML = slots.map(slot => {
    const statusColors = {
      available: '#28a745',
      booked: '#ffc107',
      blocked: '#dc3545'
    };
    const statusColor = statusColors[slot.status] || '#666';

    return `
      <div class="admin-product-item">
        <div class="admin-item-details">
          <div class="admin-item-name">${formatDate(slot.date)} at ${formatTime(slot.time)}</div>
          <div class="admin-item-info">Duration: ${slot.duration} minutes</div>
          <div class="admin-item-info">
            Status: <span style="color: ${statusColor}; font-weight: 600; text-transform: capitalize;">${slot.status}</span>
          </div>
        </div>
        <div class="admin-item-actions">
          <button class="admin-btn admin-btn-edit" onclick="editTimeSlot('${slot.id}')">Edit</button>
          <button class="admin-btn admin-btn-delete" onclick="deleteTimeSlot('${slot.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function saveTimeSlot() {
  const id = document.getElementById('timeslot-id').value || `slot-${Date.now()}`;
  const date = document.getElementById('timeslot-date').value;
  const time = document.getElementById('timeslot-time').value;
  const duration = parseInt(document.getElementById('timeslot-duration').value);
  const status = document.getElementById('timeslot-status').value;

  const slot = { id, date, time, duration, status };

  const slots = JSON.parse(localStorage.getItem('doggypaddle_timeslots') || '[]');
  const existingIndex = slots.findIndex(s => s.id === id);

  if (existingIndex >= 0) {
    slots[existingIndex] = slot;
  } else {
    slots.push(slot);
  }

  localStorage.setItem('doggypaddle_timeslots', JSON.stringify(slots));

  // Close modal and reload
  document.getElementById('timeslot-form-modal').style.display = 'none';
  loadTimeSlots();
  showNotification('Time slot saved successfully!', 'success');
}

function generateBulkTimeSlots() {
  const startDate = new Date(document.getElementById('bulk-start-date').value);
  const endDate = new Date(document.getElementById('bulk-end-date').value);
  const startTime = document.getElementById('bulk-start-time').value;
  const endTime = document.getElementById('bulk-end-time').value;
  const duration = parseInt(document.getElementById('bulk-duration').value);

  const selectedDays = Array.from(document.querySelectorAll('input[name="bulk-days"]:checked'))
    .map(cb => parseInt(cb.value));

  if (selectedDays.length === 0) {
    alert('Please select at least one day of the week.');
    return;
  }

  const slots = JSON.parse(localStorage.getItem('doggypaddle_timeslots') || '[]');
  let slotsAdded = 0;

  // Iterate through each day in the date range
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();

    // Skip if this day is not selected
    if (!selectedDays.includes(dayOfWeek)) continue;

    const dateStr = d.toISOString().split('T')[0];

    // Generate time slots for this day
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    for (let mins = startMinutes; mins < endMinutes; mins += duration) {
      const hour = Math.floor(mins / 60);
      const minute = mins % 60;
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

      // Check if slot already exists
      const existingSlot = slots.find(s => s.date === dateStr && s.time === timeStr);
      if (!existingSlot) {
        slots.push({
          id: `slot-${Date.now()}-${slotsAdded}`,
          date: dateStr,
          time: timeStr,
          duration,
          status: 'available'
        });
        slotsAdded++;
      }
    }
  }

  localStorage.setItem('doggypaddle_timeslots', JSON.stringify(slots));

  // Close modal and reload
  document.getElementById('bulk-timeslot-modal').style.display = 'none';
  loadTimeSlots();
  showNotification(`${slotsAdded} time slots added successfully!`, 'success');
}

window.editTimeSlot = function(slotId) {
  const slots = JSON.parse(localStorage.getItem('doggypaddle_timeslots') || '[]');
  const slot = slots.find(s => s.id === slotId);

  if (slot) {
    document.getElementById('timeslot-form-title').textContent = 'Edit Time Slot';
    document.getElementById('timeslot-id').value = slot.id;
    document.getElementById('timeslot-date').value = slot.date;
    document.getElementById('timeslot-time').value = slot.time;
    document.getElementById('timeslot-duration').value = slot.duration;
    document.getElementById('timeslot-status').value = slot.status;
    document.getElementById('timeslot-form-modal').style.display = 'flex';
  }
};

window.deleteTimeSlot = function(slotId) {
  if (!confirm('Are you sure you want to delete this time slot?')) return;

  const slots = JSON.parse(localStorage.getItem('doggypaddle_timeslots') || '[]');
  const filtered = slots.filter(s => s.id !== slotId);
  localStorage.setItem('doggypaddle_timeslots', JSON.stringify(filtered));

  loadTimeSlots();
  showNotification('Time slot deleted successfully!', 'success');
};

// ============================================
// BOOKINGS MANAGEMENT
// ============================================

function initBookingsManagement() {
  const exportBtn = document.getElementById('export-bookings-btn');
  if (!exportBtn) return;

  exportBtn.addEventListener('click', exportBookingsToCSV);
}

function loadBookings() {
  const bookingsList = document.getElementById('admin-bookings-list');
  if (!bookingsList) return;

  const bookings = JSON.parse(localStorage.getItem('doggypaddle_bookings') || '[]');

  if (bookings.length === 0) {
    bookingsList.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-light);">No bookings yet.</p>';
    return;
  }

  // Sort bookings by date (most recent first)
  bookings.sort((a, b) => new Date(b.sessionTime) - new Date(a.sessionTime));

  bookingsList.innerHTML = bookings.map(booking => {
    const sessionDate = new Date(booking.sessionTime);
    const statusColors = {
      pending: '#ffc107',
      confirmed: '#28a745',
      completed: '#6c757d',
      cancelled: '#dc3545'
    };
    const statusColor = statusColors[booking.status] || '#666';

    return `
      <div class="admin-product-item">
        <div class="admin-item-details">
          <div class="admin-item-name">${booking.firstName} ${booking.lastName}</div>
          <div class="admin-item-info">📧 ${booking.email} | 📱 ${booking.phone}</div>
          <div class="admin-item-info">🐕 ${booking.dogNames} (${booking.dogBreeds})</div>
          <div class="admin-item-info">📅 ${formatDateTime(sessionDate)}</div>
          <div class="admin-item-info">
            Status: <span style="color: ${statusColor}; font-weight: 600; text-transform: capitalize;">${booking.status || 'pending'}</span>
          </div>
        </div>
        <div class="admin-item-actions">
          <button class="admin-btn admin-btn-toggle" onclick="toggleBookingStatus('${booking.timestamp}')">
            Change Status
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function exportBookingsToCSV() {
  const bookings = JSON.parse(localStorage.getItem('doggypaddle_bookings') || '[]');

  if (bookings.length === 0) {
    alert('No bookings to export.');
    return;
  }

  // CSV headers
  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Dog Names', 'Breeds', 'Number of Dogs', 'Session Date/Time', 'Status', 'Booking Date'];

  // CSV rows
  const rows = bookings.map(booking => [
    booking.firstName,
    booking.lastName,
    booking.email,
    booking.phone,
    booking.dogNames,
    booking.dogBreeds,
    booking.numDogs,
    booking.sessionTime,
    booking.status || 'pending',
    booking.timestamp
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `doggypaddle-clients-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showNotification('Client list exported successfully!', 'success');
}

window.toggleBookingStatus = function(timestamp) {
  const bookings = JSON.parse(localStorage.getItem('doggypaddle_bookings') || '[]');
  const booking = bookings.find(b => b.timestamp === timestamp);

  if (!booking) return;

  const statuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  const currentIndex = statuses.indexOf(booking.status || 'pending');
  const nextIndex = (currentIndex + 1) % statuses.length;
  booking.status = statuses[nextIndex];

  localStorage.setItem('doggypaddle_bookings', JSON.stringify(bookings));
  loadBookings();
  showNotification(`Booking status updated to: ${booking.status}`, 'success');
};

// ============================================
// PHOTOS MANAGEMENT
// ============================================

function initPhotosManagement() {
  // Photos are loaded on demand when tab is clicked

  // Set up bulk action handlers
  const selectAllCheckbox = document.getElementById('select-all-photos');
  const bulkApproveBtn = document.getElementById('bulk-approve-photos');
  const bulkRejectBtn = document.getElementById('bulk-reject-photos');

  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', function() {
      const checkboxes = document.querySelectorAll('.photo-checkbox');
      checkboxes.forEach(cb => cb.checked = this.checked);
      updateBulkActionButtons();
    });
  }

  if (bulkApproveBtn) {
    bulkApproveBtn.addEventListener('click', bulkApprovePhotos);
  }

  if (bulkRejectBtn) {
    bulkRejectBtn.addEventListener('click', bulkRejectPhotos);
  }
}

function loadPhotos() {
  const photosList = document.getElementById('admin-photos-list');
  if (!photosList) return;

  const photos = JSON.parse(localStorage.getItem('doggypaddle_photos') || '[]');

  if (photos.length === 0) {
    photosList.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-light);">No photos submitted yet.</p>';
    return;
  }

  // Sort photos by date (most recent first)
  photos.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  photosList.innerHTML = photos.map(photo => {
    const statusColors = {
      pending: '#ffc107',
      approved: '#28a745',
      rejected: '#dc3545'
    };
    const status = photo.status || 'pending';
    const statusColor = statusColors[status] || '#666';

    return `
      <div class="admin-product-item">
        <div style="display: flex; align-items: center; padding: 0.5rem;">
          <input type="checkbox" class="photo-checkbox" data-timestamp="${photo.timestamp}"
                 style="cursor: pointer; width: 20px; height: 20px;" onchange="updateBulkActionButtons()">
        </div>
        <img src="${photo.imageUrl}" class="admin-product-image" alt="${photo.dogName}"
             onerror="this.src='/assets/logo.png'" />
        <div class="admin-item-details">
          <div class="admin-item-name">🐕 ${photo.dogName}</div>
          <div class="admin-item-info">Submitted by: ${photo.customerName} (${photo.email})</div>
          <div class="admin-item-info">Caption: ${photo.caption || 'No caption'}</div>
          <div class="admin-item-info">Session Date: ${photo.sessionDate || 'Not specified'}</div>
          <div class="admin-item-info">Submitted: ${formatDateTime(new Date(photo.timestamp))}</div>
          <div class="admin-item-info">
            Status: <span style="color: ${statusColor}; font-weight: 600; text-transform: capitalize;">${status}</span>
          </div>
        </div>
        <div class="admin-item-actions">
          ${status !== 'approved' ? `<button class="admin-btn admin-btn-edit" onclick="approvePhoto('${photo.timestamp}')">✓ Approve</button>` : ''}
          ${status !== 'rejected' ? `<button class="admin-btn admin-btn-delete" onclick="rejectPhoto('${photo.timestamp}')">✗ Reject</button>` : ''}
          ${status !== 'pending' ? `<button class="admin-btn admin-btn-toggle" onclick="resetPhotoStatus('${photo.timestamp}')">Reset</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Reset select all checkbox
  const selectAllCheckbox = document.getElementById('select-all-photos');
  if (selectAllCheckbox) selectAllCheckbox.checked = false;

  // Update bulk action buttons
  updateBulkActionButtons();
}

window.approvePhoto = function(timestamp) {
  const photos = JSON.parse(localStorage.getItem('doggypaddle_photos') || '[]');
  const photo = photos.find(p => p.timestamp === timestamp);

  if (photo) {
    photo.status = 'approved';
    localStorage.setItem('doggypaddle_photos', JSON.stringify(photos));
    loadPhotos();
    showNotification('Photo approved and will be displayed in gallery!', 'success');
  }
};

window.rejectPhoto = function(timestamp) {
  if (!confirm('Are you sure you want to reject this photo?')) return;

  const photos = JSON.parse(localStorage.getItem('doggypaddle_photos') || '[]');
  const photo = photos.find(p => p.timestamp === timestamp);

  if (photo) {
    photo.status = 'rejected';
    localStorage.setItem('doggypaddle_photos', JSON.stringify(photos));
    loadPhotos();
    showNotification('Photo rejected.', 'success');
  }
};

window.resetPhotoStatus = function(timestamp) {
  const photos = JSON.parse(localStorage.getItem('doggypaddle_photos') || '[]');
  const photo = photos.find(p => p.timestamp === timestamp);

  if (photo) {
    photo.status = 'pending';
    localStorage.setItem('doggypaddle_photos', JSON.stringify(photos));
    loadPhotos();
    showNotification('Photo status reset to pending.', 'success');
  }
};

window.updateBulkActionButtons = function() {
  const checkboxes = document.querySelectorAll('.photo-checkbox:checked');
  const bulkApproveBtn = document.getElementById('bulk-approve-photos');
  const bulkRejectBtn = document.getElementById('bulk-reject-photos');
  const selectedCount = document.getElementById('selected-photos-count');

  const count = checkboxes.length;

  if (bulkApproveBtn) bulkApproveBtn.disabled = count === 0;
  if (bulkRejectBtn) bulkRejectBtn.disabled = count === 0;
  if (selectedCount) selectedCount.textContent = count > 0 ? `${count} photo${count > 1 ? 's' : ''} selected` : '';
};

function bulkApprovePhotos() {
  const checkboxes = document.querySelectorAll('.photo-checkbox:checked');
  const timestamps = Array.from(checkboxes).map(cb => cb.dataset.timestamp);

  if (timestamps.length === 0) return;

  const photos = JSON.parse(localStorage.getItem('doggypaddle_photos') || '[]');
  let approvedCount = 0;

  timestamps.forEach(timestamp => {
    const photo = photos.find(p => p.timestamp === timestamp);
    if (photo && photo.status !== 'approved') {
      photo.status = 'approved';
      approvedCount++;
    }
  });

  if (approvedCount > 0) {
    localStorage.setItem('doggypaddle_photos', JSON.stringify(photos));
    loadPhotos();
    showNotification(`${approvedCount} photo${approvedCount > 1 ? 's' : ''} approved successfully!`, 'success');
  }
}

function bulkRejectPhotos() {
  const checkboxes = document.querySelectorAll('.photo-checkbox:checked');
  const timestamps = Array.from(checkboxes).map(cb => cb.dataset.timestamp);

  if (timestamps.length === 0) return;

  if (!confirm(`Are you sure you want to reject ${timestamps.length} photo${timestamps.length > 1 ? 's' : ''}?`)) return;

  const photos = JSON.parse(localStorage.getItem('doggypaddle_photos') || '[]');
  let rejectedCount = 0;

  timestamps.forEach(timestamp => {
    const photo = photos.find(p => p.timestamp === timestamp);
    if (photo && photo.status !== 'rejected') {
      photo.status = 'rejected';
      rejectedCount++;
    }
  });

  if (rejectedCount > 0) {
    localStorage.setItem('doggypaddle_photos', JSON.stringify(photos));
    loadPhotos();
    showNotification(`${rejectedCount} photo${rejectedCount > 1 ? 's' : ''} rejected.`, 'success');
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatTime(timeString) {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}

function formatDateTime(date) {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function showNotification(message, type = 'info') {
  // Check if global showNotification exists from store.js
  if (typeof window.showNotification === 'function') {
    window.showNotification(message);
  } else {
    // Fallback to alert
    alert(message);
  }
}
