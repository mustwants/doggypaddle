//scripts/calendar.js

document.addEventListener("DOMContentLoaded", () => {
  const calendarDiv = document.getElementById("calendar");
  const now = new Date();

  const generateSlots = () => {
    let html = `<h3>${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}</h3>`;
    html += `<table><thead><tr>`;
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(day => {
      html += `<th>${day}</th>`;
    });
    html += `</tr></thead><tbody><tr>`;

    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    let day = 1;

    for (let i = 0; i < 42; i++) {
      if (i < firstDay || day > daysInMonth) {
        html += `<td></td>`;
      } else {
        html += `<td><strong>${day}</strong><br><small>10a / 11a / 12p</small></td>`;
        day++;
      }
      if ((i + 1) % 7 === 0) html += `</tr><tr>`;
    }

    html += `</tr></tbody></table>`;
    calendarDiv.innerHTML = html;
  };

  generateSlots();
});
