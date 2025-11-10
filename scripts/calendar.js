// scripts/calendar.js

document.addEventListener("DOMContentLoaded", () => {
  const calendarPlaceholder = document.getElementById("calendar-placeholder");
  
  if (!calendarPlaceholder) {
    console.warn("Calendar placeholder not found");
    return;
  }

  // Configuration
  const BUSINESS_HOURS = {
    start: 9, // 9 AM
    end: 17, // 5 PM
    sessionDuration: 20, // minutes
  };

  const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  // Get current date
  const now = new Date();
  let currentMonth = now.getMonth();
  let currentYear = now.getFullYear();

  // Mock booked sessions (replace with actual API call)
  const bookedSlots = [
    { date: "2024-11-15", time: "10:00" },
    { date: "2024-11-15", time: "14:00" },
    { date: "2024-11-16", time: "11:00" },
  ];

  function generateCalendar(month, year) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    let html = `
      <div class="calendar-header">
        <button id="prev-month" class="calendar-nav-btn" aria-label="Previous month">←</button>
        <h3>${firstDay.toLocaleString("default", { month: "long" })} ${year}</h3>
        <button id="next-month" class="calendar-nav-btn" aria-label="Next month">→</button>
      </div>
      <div class="calendar-table">
        <table>
          <thead>
            <tr>
    `;

    // Add day headers
    DAYS_OF_WEEK.forEach((day) => {
      html += `<th>${day}</th>`;
    });

    html += `</tr></thead><tbody><tr>`;

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      html += `<td class="calendar-day empty"></td>`;
    }

    // Add days of the month
    let currentDayOfWeek = startingDayOfWeek;
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const isPast = currentDate < new Date().setHours(0, 0, 0, 0);
      const isToday = 
        currentDate.getDate() === now.getDate() &&
        currentDate.getMonth() === now.getMonth() &&
        currentDate.getFullYear() === now.getFullYear();

      const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const slots = generateTimeSlots(dateString);
      
      let dayClass = "calendar-day";
      if (isPast) dayClass += " past";
      if (isToday) dayClass += " today";

      html += `
        <td class="${dayClass}">
          <div class="day-number">${day}</div>
          <div class="time-slots">
            ${slots}
          </div>
        </td>
      `;

      currentDayOfWeek++;
      if (currentDayOfWeek % 7 === 0 && day < daysInMonth) {
        html += `</tr><tr>`;
      }
    }

    // Fill remaining cells
    while (currentDayOfWeek % 7 !== 0) {
      html += `<td class="calendar-day empty"></td>`;
      currentDayOfWeek++;
    }

    html += `</tr></tbody></table></div>`;

    return html;
  }

  function generateTimeSlots(dateString) {
    const slots = [];
    const date = new Date(dateString);
    const isPast = date < new Date().setHours(0, 0, 0, 0);

    if (isPast) {
      return '<small class="unavailable">Past date</small>';
    }

    // Generate slots from 9 AM to 5 PM
    for (let hour = BUSINESS_HOURS.start; hour < BUSINESS_HOURS.end; hour++) {
      const timeSlot = `${hour.toString().padStart(2, "0")}:00`;
      const isBooked = bookedSlots.some(
        (slot) => slot.date === dateString && slot.time === timeSlot
      );

      if (!isBooked) {
        slots.push(`<small class="available">${formatTime(hour)}</small>`);
      }
    }

    if (slots.length === 0) {
      return '<small class="unavailable">Fully booked</small>';
    }

    return slots.slice(0, 3).join("") + (slots.length > 3 ? '<small>+more</small>' : '');
  }

  function formatTime(hour) {
    if (hour === 12) return "12p";
    if (hour === 0) return "12a";
    return hour > 12 ? `${hour - 12}p` : `${hour}a`;
  }

  function renderCalendar() {
    const calendarHTML = generateCalendar(currentMonth, currentYear);
    calendarPlaceholder.innerHTML = calendarHTML;

    // Add event listeners for navigation
    const prevBtn = document.getElementById("prev-month");
    const nextBtn = document.getElementById("next-month");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        currentMonth--;
        if (currentMonth < 0) {
          currentMonth = 11;
          currentYear--;
        }
        renderCalendar();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
        renderCalendar();
      });
    }
  }

  // Add calendar-specific styles
  const style = document.createElement("style");
  style.textContent = `
    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding: 0 0.5rem;
    }

    .calendar-header h3 {
      margin: 0;
      font-size: 1.5rem;
      color: var(--secondary, #114B5F);
    }

    .calendar-nav-btn {
      background: var(--primary, #028090);
      color: white;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }

    .calendar-nav-btn:hover {
      background: var(--primary-dark, #05668d);
      transform: scale(1.1);
    }

    .calendar-table {
      overflow-x: auto;
    }

    .calendar-table table {
      width: 100%;
      border-collapse: collapse;
      min-width: 600px;
    }

    .calendar-table th {
      background: var(--primary, #028090);
      color: white;
      padding: 0.875rem;
      font-weight: 600;
      text-align: center;
      font-size: 0.9rem;
    }

    .calendar-day {
      border: 1px solid var(--border, #e0e0e0);
      padding: 0.75rem;
      vertical-align: top;
      min-height: 100px;
      background: white;
      transition: all 0.2s ease;
    }

    .calendar-day:not(.empty):not(.past):hover {
      background: #f0f9fa;
      border-color: var(--primary, #028090);
    }

    .calendar-day.empty {
      background: #f5f5f5;
    }

    .calendar-day.past {
      background: #fafafa;
      opacity: 0.5;
    }

    .calendar-day.today {
      background: #fff9e6;
      border: 2px solid var(--accent, #F0A202);
    }

    .day-number {
      font-weight: 700;
      font-size: 1.25rem;
      color: var(--secondary, #114B5F);
      margin-bottom: 0.5rem;
    }

    .calendar-day.today .day-number {
      color: var(--accent, #F0A202);
    }

    .time-slots {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .time-slots small {
      display: block;
      font-size: 0.75rem;
      padding: 0.25rem;
      border-radius: 4px;
      text-align: center;
    }

    .time-slots small.available {
      background: #d4edda;
      color: #155724;
      font-weight: 500;
    }

    .time-slots small.unavailable {
      background: #f8d7da;
      color: #721c24;
    }

    @media (max-width: 768px) {
      .calendar-header h3 {
        font-size: 1.25rem;
      }

      .calendar-nav-btn {
        width: 35px;
        height: 35px;
        font-size: 1rem;
      }

      .calendar-table th {
        padding: 0.5rem;
        font-size: 0.8rem;
      }

      .calendar-day {
        padding: 0.5rem;
        min-height: 80px;
      }

      .day-number {
        font-size: 1rem;
      }

      .time-slots small {
        font-size: 0.7rem;
      }
    }
  `;
  document.head.appendChild(style);

  // Initial render
  renderCalendar();
});
