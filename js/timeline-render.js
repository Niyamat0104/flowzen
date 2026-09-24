/* FlowZen Gantt Timeline Chart Renderer */
import { formatDate } from './date-utils.js';
import { escapeHTML } from './ui-utils.js';

export function renderTimelineView(tasks, columns, intelligence) {
  const container = document.getElementById('timeline-viewport');
  if (!container) return;

  if (!tasks || tasks.length === 0) {
    container.innerHTML = `
      <div class="timeline-container" style="display: flex; align-items: center; justify-content: center; padding: 3rem; color: var(--text-tertiary);">
        <div style="text-align: center;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 0.5rem;"><path d="M3 3v18h18"/><path d="M7 14h8"/><path d="M11 9h8"/><path d="M7 4h5"/></svg>
          <div style="font-weight: 700; font-size: 1rem;">No tasks found for timeline display</div>
          <div style="font-size: 0.82rem; margin-top: 4px;">Add tasks or adjust active search filters</div>
        </div>
      </div>
    `;
    return;
  }

  // Generate 14-day date range centered around today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dates = [];
  const daysToShow = 14;
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 3); // Start 3 days before today

  for (let i = 0; i < daysToShow; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    dates.push(d);
  }

  const dateColWidth = 90;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Header HTML
  const headerDatesHTML = dates.map(d => {
    const isToday = d.getTime() === today.getTime();
    const dayName = dayNames[d.getDay()];
    const dayNum = d.getDate();
    return `
      <div class="timeline-date-cell ${isToday ? 'is-today' : ''}">
        <div class="timeline-date-day">${dayName}</div>
        <div class="timeline-date-num">${dayNum}</div>
      </div>
    `;
  }).join('');

  // Group tasks by Column / Status
  const tasksByColumn = new Map();
  columns.forEach(c => tasksByColumn.set(c.id, { column: c, tasks: [] }));
  
  tasks.forEach(t => {
    const group = tasksByColumn.get(t.columnId);
    if (group) {
      group.tasks.push(t);
    } else {
      if (!tasksByColumn.has('other')) tasksByColumn.set('other', { column: { title: 'OTHER' }, tasks: [] });
      tasksByColumn.get('other').tasks.push(t);
    }
  });

  // Body HTML
  let bodyHTML = '';
  tasksByColumn.forEach(({ column, tasks: colTasks }) => {
    if (colTasks.length === 0) return;

    bodyHTML += `
      <div class="timeline-group-header">${escapeHTML(column.title)} (${colTasks.length})</div>
    `;

    colTasks.forEach(task => {
      // Calculate Task Start and End offsets
      const taskCreated = task.createdAt ? new Date(task.createdAt) : new Date();
      taskCreated.setHours(0, 0, 0, 0);

      const taskDue = task.dueDate ? new Date(task.dueDate) : new Date(taskCreated.getTime() + 86400000 * 2);
      taskDue.setHours(0, 0, 0, 0);

      // Start Index
      const startDiffDays = Math.round((taskCreated.getTime() - startDate.getTime()) / (86400000));
      const durationDays = Math.max(1, Math.round((taskDue.getTime() - taskCreated.getTime()) / (86400000)) + 1);

      const leftPx = Math.max(0, startDiffDays * dateColWidth);
      const widthPx = Math.max(dateColWidth, durationDays * dateColWidth - 10);

      const isDone = column.title.toLowerCase().includes('done') || column.title.toLowerCase().includes('completed');
      const isBlocked = intelligence && intelligence.blockedTaskIds && intelligence.blockedTaskIds.includes(task.id);

      bodyHTML += `
        <div class="timeline-row">
          <div class="timeline-row-info">
            <span class="badge badge-${task.priority || 'medium'}" style="font-size: 0.65rem;">${task.priority || 'med'}</span>
            <span class="timeline-task-title" title="${escapeHTML(task.title)}">${escapeHTML(task.title)}</span>
          </div>
          <div class="timeline-row-grid">
            <div class="timeline-bar ${isDone ? 'status-done' : ''} ${isBlocked ? 'status-blocked' : ''}" 
                 data-task-id="${task.id}"
                 style="left: ${leftPx}px; width: ${widthPx}px;"
                 title="${escapeHTML(task.title)} • Assignee: ${escapeHTML(task.assignee || 'Unassigned')} • Due: ${task.dueDate || 'No due date'}">
              <span style="overflow: hidden; text-overflow: ellipsis;">${escapeHTML(task.title)}</span>
              <span style="font-size: 0.68rem; opacity: 0.9;">${task.assignee ? task.assignee.split(' ')[0] : ''}</span>
            </div>
          </div>
        </div>
      `;
    });
  });

  container.innerHTML = `
    <div class="timeline-container">
      <div class="timeline-header">
        <div class="timeline-labels-col">Task & Priority</div>
        <div class="timeline-dates-scroll">
          ${headerDatesHTML}
        </div>
      </div>
      <div class="timeline-body">
        ${bodyHTML}
      </div>
    </div>
  `;
}
