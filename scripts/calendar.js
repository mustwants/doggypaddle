// scripts/calendar.js - Interactive Slot Selection

document.addEventListener("DOMContentLoaded", () => {
  const calendarPlaceholder = document.getElementById("calendar-placeholder");
  
  if (!calendarPlaceholder) {
    console.warn("Calendar placeholder not found");
    return;
  }

  // Configuration
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();
  let selectedSlot = null;

  // API endpoint for fetching available slots
  const API_ENDPOINT = window.DoggyPaddleConfig?.API_ENDPOINT ||
                       "https://script.google.com/macros/s/YOUR_DEPLOYED_WEBAPP_ID/exec";

  // Check if API endpoint is configured
  const isBackendConfigured = API_ENDPOINT && !API_ENDPOINT.includes('YOUR_DEPLOYED_WEBAPP_ID');

  // Mock available slots from admin (will be replaced by API call)
  // Slots are now 30 minutes at top and bottom of hour
  let availableSlots = [
    { id: "slot-1", date: "2024-11-15", time: "10:00", duration: 30 },
    { id: "slot-2", date: "2024-11-15", time: "10:30", duration: 30 },
    { id: "slot-3", date: "2024-11-15", time: "14:00", duration: 30 },
    { id: "slot-4", date: "2024-11-15", time: "14:30", duration: 30 },
    { id: "slot-5", date: "2024-11-16", time: "11:00", duration: 30 },
    { id: "slot-6", date: "2024-11-16", time: "11:30", duration: 30 },
    { id: "slot-7", date: "2024-11-16", time: "15:00", duration: 30 },
    { id: "slot-8", date: "2024-11-16", time: "15:30", duration: 30 },
    { id: "slot-9", date: "2024-11-20", time: "09:00", duration: 30 },
    { id: "slot-10", date: "2024-11-20", time: "09:30", duration: 30 },
    { id: "slot-11", date: "2024-11-20", time: "12:00", duration: 30 },
    { id: "slot-12", date: "2024-11-20", time: "12:30", duration: 30 },
    { id: "slot-13", date: "2024-11-20", time: "16:00", duration: 30 },
    { id: "slot-14", date: "2024-11-20", time: "16:30", duration: 30 },
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
        "\nUsing mock data for demonstration purposes.",
        "\n\nTo enable live booking:",
        "\n1. Follow the instructions in /backend/README.md",
        "\n2. Deploy the Google Apps Script",
        "\n3. Update the API_ENDPOINT in /scripts/config.js",
        "\n\nFor detailed setup instructions, see: /backend/README.md"
      );
      return; // Use mock data
    }

    try {
      const response = await fetch(`${API_ENDPOINT}?action=getAvailableSlots&month=${currentMonth + 1}&year=${currentYear}`);
      if (response.ok) {
        const data = await response.json();
        availableSlots = data.slots || availableSlots; // Fallback to mock data
      }
    } catch (error) {
      console.warn("Could not fetch slots from server, using mock data:", error);
    }
  }

  function getSlotsForDate(dateString) {
    return availableSlots.filter(slot => slot.date === dateString);
  }

  function formatTime(timeString) {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "pm" : "am";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes}${ampm}`;
  }

  function generateCalendar(month, year) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = `
      <div class="calendar-controls">
        <button id="prev-month" class="calendar-nav-btn" aria-label="Previous month">
          <span>←</span>
        </button>
        <h3 class="calendar-month-year">${firstDay.toLocaleString("default", { month: "long" })} ${year}</h3>
        <button id="next-month" class="calendar-nav-btn" aria-label="Next month">
          <span>→</span>
        </button>
      </div>
      <div class="calendar-wrapper">
        <table class="calendar-table">
          <thead>
            <tr>
    `;

    // Day headers
    DAYS_OF_WEEK.forEach((day) => {
      html += `<th>${day}</th>`;
    });

    html += `</tr></thead><tbody><tr>`;

    // Empty cells before first day
    for (let i = 0; i < startingDayOfWeek; i++) {
      html += `<td class="calendar-cell empty"></td>`;
    }

    // Calendar days
    let currentDayOfWeek = startingDayOfWeek;
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

      html += `<td class="${cellClass}" data-date="${dateString}">`;
      html += `<div class="day-number">${day}</div>`;
      
      if (!isPast && slots.length > 0) {
        html += `<div class="slot-count">${slots.length} slot${slots.length > 1 ? 's' : ''}</div>`;
      }
      
      html += `</td>`;

      currentDayOfWeek++;
      if (currentDayOfWeek % 7 === 0 && day < daysInMonth) {
        html += `</tr><tr>`;
      }
    }

    // Fill remaining cells
    while (currentDayOfWeek % 7 !== 0) {
      html += `<td class="calendar-cell empty"></td>`;
      currentDayOfWeek++;
    }

    html += `</tr></tbody></table></div>`;

    // Selected slot info area
    html += `
      <div id="selected-slot-info" class="selected-slot-info" style="display: none;">
        <h4>Selected Time Slot</h4>
        <p class="selected-details"></p>
        <button id="confirm-slot-btn" class="button">Confirm & Book This Slot</button>
      </div>
    `;

    return html;
  }

  function showTimeSlotsModal(dateString, slots) {
    // Remove existing modal if any
    const existingModal = document.querySelector(".time-slots-modal");
    if (existingModal) existingModal.remove();

    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString("en-US", { 
      weekday: "long", 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    });

    const modal = document.createElement("div");
    modal.className = "time-slots-modal";
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <button class="modal-close" aria-label="Close">&times;</button>
        <h3>Select a Time Slot</h3>
        <p class="modal-date">${formattedDate}</p>
        <div class="time-slots-grid">
          ${slots.map(slot => `
            <button class="time-slot-btn" data-slot-id="${slot.id}" data-date="${dateString}" data-time="${slot.time}">
              <span class="slot-time">${formatTime(slot.time)}</span>
              <span class="slot-duration">${slot.duration} min</span>
            </button>
          `).join("")}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    // Close modal handlers
    const closeModal = () => {
      modal.remove();
      document.body.style.overflow = "";
    };

    modal.querySelector(".modal-close").addEventListener("click", closeModal);
    modal.querySelector(".modal-overlay").addEventListener("click", closeModal);

    // Escape key to close
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
        const slotId = btn.dataset.slotId;
        const slotDate = btn.dataset.date;
        const slotTime = btn.dataset.time;
        
        selectTimeSlot(slotId, slotDate, slotTime);
        closeModal();
      });
    });

    // Animate in
    setTimeout(() => modal.classList.add("show"), 10);
  }

  function selectTimeSlot(slotId, date, time) {
    selectedSlot = { id: slotId, date, time };

    const slotInfo = document.getElementById("selected-slot-info");
    const slotDetails = slotInfo.querySelector(".selected-details");
    
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString("en-US", { 
      weekday: "short", 
      month: "short", 
      day: "numeric",
      year: "numeric"
    });

    slotDetails.innerHTML = `
      <strong>${formattedDate}</strong> at <strong>${formatTime(time)}</strong>
      <br><small>30-minute session</small>
    `;

    slotInfo.style.display = "block";

    // Update the form's datetime-local input if it exists
    const sessionTimeInput = document.getElementById("sessionTime");
    if (sessionTimeInput) {
      const dateTimeValue = `${date}T${time}`;
      sessionTimeInput.value = dateTimeValue;
      
      // Scroll to booking form
      setTimeout(() => {
        document.getElementById("booking").scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }

    // Highlight selected date in calendar
    document.querySelectorAll(".calendar-cell").forEach(cell => {
      cell.classList.remove("selected");
      if (cell.dataset.date === date) {
        cell.classList.add("selected");
      }
    });
  }

  function attachCalendarListeners() {
    // Navigation buttons
    const prevBtn = document.getElementById("prev-month");
    const nextBtn = document.getElementById("next-month");

    if (prevBtn) {
      prevBtn.addEventListener("click", async () => {
        currentMonth--;
        if (currentMonth < 0) {
          currentMonth = 11;
          currentYear--;
        }
        await fetchAvailableSlots();
        renderCalendar();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", async () => {
        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
        await fetchAvailableSlots();
        renderCalendar();
      });
    }

    // Day cells with slots
    document.querySelectorAll(".calendar-cell.has-slots").forEach(cell => {
      cell.addEventListener("click", () => {
        const dateString = cell.dataset.date;
        const slots = getSlotsForDate(dateString);
        if (slots.length > 0) {
          showTimeSlotsModal(dateString, slots);
        }
      });
    });

    // Confirm slot button
    const confirmBtn = document.getElementById("confirm-slot-btn");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => {
        if (selectedSlot) {
          // Scroll to booking form
          document.getElementById("booking").scrollIntoView({ behavior: "smooth" });
        }
      });
    }
  }

  async function renderCalendar() {
    calendarPlaceholder.innerHTML = '<div class="loading-spinner">Loading available slots...</div>';
    await fetchAvailableSlots();
    calendarPlaceholder.innerHTML = generateCalendar(currentMonth, currentYear);
    attachCalendarListeners();
  }

  // Add styles for calendar and modal
  const style = document.createElement("style");
  style.textContent = `
    /* Calendar Controls */
    .calendar-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding: 0 0.5rem;
    }

    .calendar-month-year {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--secondary);
    }

    .calendar-nav-btn {
      background: var(--primary);
      color: white;
      border: none;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      font-weight: bold;
    }

    .calendar-nav-btn:hover {
      background: var(--primary-dark);
      transform: scale(1.1);
    }

    .calendar-nav-btn:active {
      transform: scale(0.95);
    }

    /* Calendar Table */
    .calendar-wrapper {
      overflow-x: auto;
      margin-bottom: 1.5rem;
    }

    .calendar-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 600px;
    }

    .calendar-table th {
      background: var(--primary);
      color: white;
      padding: 1rem;
      font-weight: 600;
      text-align: center;
      font-size: 0.95rem;
    }

    .calendar-cell {
      border: 2px solid var(--border);
      padding: 0.75rem;
      vertical-align: top;
      min-height: 90px;
      background: white;
      transition: all 0.2s ease;
      position: relative;
    }

    .calendar-cell.empty {
      background: #fafafa;
      cursor: default;
    }

    .calendar-cell.past {
      background: #f5f5f5;
      opacity: 0.5;
      cursor: not-allowed;
    }

    .calendar-cell.today {
      background: #fffbf0;
      border-color: var(--accent);
    }

    .calendar-cell.has-slots {
      cursor: pointer;
      border-color: var(--primary-light);
    }

    .calendar-cell.has-slots:hover {
      background: #f0f9fb;
      border-color: var(--primary);
      transform: scale(1.02);
      box-shadow: 0 2px 8px rgba(2, 128, 144, 0.2);
    }

    .calendar-cell.selected {
      background: #e6f7f9;
      border: 3px solid var(--primary);
      box-shadow: 0 0 0 3px rgba(2, 128, 144, 0.2);
    }

    .day-number {
      font-weight: 700;
      font-size: 1.25rem;
      color: var(--secondary);
      margin-bottom: 0.5rem;
    }

    .calendar-cell.today .day-number {
      color: var(--accent);
    }

    .slot-count {
      background: var(--primary);
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-align: center;
      display: inline-block;
    }

    /* Time Slots Modal */
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
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
    }

    .modal-content {
      position: relative;
      background: white;
      border-radius: 16px;
      padding: 2rem;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      transform: scale(0.9);
      transition: transform 0.3s ease;
    }

    .time-slots-modal.show .modal-content {
      transform: scale(1);
    }

    .modal-close {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: transparent;
      border: none;
      font-size: 2rem;
      color: var(--text-light);
      cursor: pointer;
      padding: 0;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s ease;
    }

    .modal-close:hover {
      background: var(--border);
      color: var(--text);
    }

    .modal-content h3 {
      margin-top: 0;
      margin-bottom: 0.5rem;
      color: var(--secondary);
    }

    .modal-date {
      color: var(--text-light);
      margin-bottom: 1.5rem;
      font-size: 0.95rem;
    }

    .time-slots-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 1rem;
    }

    .time-slot-btn {
      background: white;
      border: 2px solid var(--border);
      padding: 1rem;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .time-slot-btn:hover {
      border-color: var(--primary);
      background: #f0f9fb;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(2, 128, 144, 0.2);
    }

    .slot-time {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--secondary);
    }

    .slot-duration {
      font-size: 0.85rem;
      color: var(--text-light);
    }

    /* Selected Slot Info */
    .selected-slot-info {
      background: #e6f7f9;
      border: 2px solid var(--primary);
      border-radius: 12px;
      padding: 1.5rem;
      margin-top: 1.5rem;
      text-align: center;
    }

    .selected-slot-info h4 {
      margin-top: 0;
      margin-bottom: 1rem;
      color: var(--primary);
    }

    .selected-details {
      margin-bottom: 1.5rem;
      font-size: 1.1rem;
    }

    .selected-details strong {
      color: var(--secondary);
    }

    .loading-spinner {
      text-align: center;
      padding: 3rem;
      color: var(--text-light);
      font-style: italic;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .calendar-month-year {
        font-size: 1.25rem;
      }

      .calendar-nav-btn {
        width: 38px;
        height: 38px;
        font-size: 1.25rem;
      }

      .calendar-table th {
        padding: 0.75rem 0.5rem;
        font-size: 0.85rem;
      }

      .calendar-cell {
        padding: 0.5rem;
        min-height: 70px;
      }

      .day-number {
        font-size: 1rem;
      }

      .slot-count {
        font-size: 0.7rem;
        padding: 0.2rem 0.4rem;
      }

      .modal-content {
        padding: 1.5rem;
        width: 95%;
      }

      .time-slots-grid {
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 0.75rem;
      }

      .time-slot-btn {
        padding: 0.75rem;
      }

      .slot-time {
        font-size: 1.1rem;
      }
    }
  `;
  document.head.appendChild(style);

  // Initialize calendar
  renderCalendar();
});
