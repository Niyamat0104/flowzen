/* FlowZen Monthly Calendar View Renderer */
import { escapeHTML } from './ui-utils.js';

let currentCalendarYear = new Date().getFullYear();
let currentCalendarMonth = new Date().getMonth(); // 0-indexed (0 = Jan)

export function setCalendarMonth(offset) {
  if (offset === 0) {
    const today = new Date();
    currentCalendarYear = today.getFullYear();
    currentCalendarMonth = today.getMonth();
  } else {
    currentCalendarMonth += offset;
    if (currentCalendarMonth > 11) {
      currentCalendarMonth = 0;
      currentCalendarYear++;
    } else if (currentCalendarMonth < 0) {
      currentCalendarMonth = 11;
      currentCalendarYear--;
    }
  }
}

export function renderCalendarView(tasks, columns, intelligence) {
  const container = document.getElementById('calendar-viewport');
  if (!container) return;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayOfMonth = new Date(currentCalendarYear, currentCalendarMonth, 1);
  const lastDayOfMonth = new Date(currentCalendarYear, currentCalendarMonth + 1, 0);

  // Day of week offset for 1st day (0 = Sun, 1 = Mon...)
  let startDayOfWeek = firstDayOfMonth.getDay(); 
  // Convert so Monday is 0, Sunday is 6
  startDayOfWeek = (startDayOfWeek + 6) % 7;

  const totalDaysInMonth = lastDayOfMonth.getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build grid day cells (42 cells = 6 weeks)
  const daysGrid = [];

  // Previous month padding days
  const prevMonthLastDay = new Date(currentCalendarYear, currentCalendarMonth, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const d = new Date(currentCalendarYear, currentCalendarMonth - 1, dayNum);
    daysGrid.push({ date: d, isOtherMonth: true });
  }

  // Current month days
  for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
    const d = new Date(currentCalendarYear, currentCalendarMonth, dayNum);
    daysGrid.push({ date: d, isOtherMonth: false });
  }

  // Next month padding days to fill 35 or 42 cells
  const remainingCells = (daysGrid.length > 35 ? 42 : 35) - daysGrid.length;
  for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
    const d = new Date(currentCalendarYear, currentCalendarMonth + 1, dayNum);
    daysGrid.push({ date: d, isOtherMonth: true });
  }

  // Group tasks by due date string (YYYY-MM-DD)
  const tasksByDueDate = new Map();
  if (Array.isArray(tasks)) {
    tasks.forEach(task => {
      if (task.dueDate) {
        const dateStr = task.dueDate.split('T')[0];
        if (!tasksByDueDate.has(dateStr)) tasksByDueDate.set(dateStr, []);
        tasksByDueDate.get(dateStr).push(task);
      }
    });
  }

  // Render Grid Cells
  const gridHTML = daysGrid.map(({ date, isOtherMonth }) => {
    date.setHours(0, 0, 0, 0);
    const dateStr = date.toISOString().split('T')[0];
    const isToday = date.getTime() === today.getTime();
    const dayTasks = tasksByDueDate.get(dateStr) || [];

    const tasksHTML = dayTasks.map(t => {
      const isDone = t.columnId === 'col_done' || t.columnId.includes('done');
      return `
        <div class="calendar-task-pill priority-${t.priority || 'medium'} ${isDone ? 'is-done' : ''}"
             data-task-id="${t.id}"
             title="${escapeHTML(t.title)} • Assignee: ${escapeHTML(t.assignee || 'Unassigned')}">
          ${escapeHTML(t.title)}
        </div>
      `;
    }).join('');

    return `
      <div class="calendar-day-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'is-today' : ''}" data-date="${dateStr}">
        <div class="calendar-day-num">${date.getDate()}</div>
        ${tasksHTML}
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="calendar-container">
      <div class="calendar-nav-bar">
        <div class="calendar-month-title">${monthNames[currentCalendarMonth]} ${currentCalendarYear}</div>
        <div class="flex items-center gap-1">
          <button class="btn btn-sm btn-outline" id="cal-prev-month-btn">&larr; Prev</button>
          <button class="btn btn-sm btn-outline" id="cal-today-btn">Today</button>
          <button class="btn btn-sm btn-outline" id="cal-next-month-btn">Next &rarr;</button>
        </div>
      </div>
      <div class="calendar-week-header">
        <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
      </div>
      <div class="calendar-grid">
        ${gridHTML}
      </div>
    </div>
  `;
}
