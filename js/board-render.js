/* FlowZen DOM Renderer for Kanban Board View, Quick Stats, Insights Sidebar & Assignees */
import { boardState, saveTask, deleteTask, saveColumn, deleteColumn, addTeamMemberToBoard, updateMemberRole, removeTeamMember } from './board-state.js';
import { filterTasks, sortTasks } from './filters-sort.js';
import { formatDate, isOverdue, getTaskAgeDays } from './date-utils.js';
import { analyzeFlowZenIntelligence } from './flowzen-intelligence.js';
import { openModal, closeModal, escapeHTML, showToast } from './ui-utils.js';
import { renderTimelineView } from './timeline-render.js';
import { renderCalendarView, setCalendarMonth } from './calendar-render.js';

let activeEditTaskId = null;

export function getDoneColumns(columns) {
  if (!columns || columns.length === 0) return [];
  const explicitDone = columns.filter(c => c.isDoneColumn || c.title.toLowerCase().includes('done') || c.title.toLowerCase().includes('completed') || c.title.toLowerCase().includes('finish'));
  if (explicitDone.length > 0) return explicitDone;
  return [columns[columns.length - 1]];
}

function getMemberInitial(name) {
  if (!name || name === 'Unassigned') return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export function populateAssigneeDropdowns() {
  const team = (boardState.boardData && Array.isArray(boardState.boardData.team))
    ? boardState.boardData.team
    : [];

  // Toolbar Filter Dropdown (#filter-assignee-select)
  const filterSelect = document.getElementById('filter-assignee-select');
  if (filterSelect) {
    const currentVal = boardState.filterState.assignee || 'all';
    filterSelect.innerHTML = `
      <option value="all">All Assignees</option>
      ${team.map(m => `<option value="${escapeHTML(m.name)}">${escapeHTML(m.name)}</option>`).join('')}
    `;
    filterSelect.value = currentVal;
    if (!filterSelect.value) filterSelect.value = 'all';
  }

  // Task Edit Modal Dropdown (#task-assignee-select)
  const taskAssigneeSelect = document.getElementById('task-assignee-select');
  if (taskAssigneeSelect) {
    const currentVal = taskAssigneeSelect.value;
    taskAssigneeSelect.innerHTML = `
      <option value="Unassigned">Unassigned</option>
      ${team.map(m => `<option value="${escapeHTML(m.name)}">${escapeHTML(m.name)} (${m.role})</option>`).join('')}
    `;
    if (currentVal && Array.from(taskAssigneeSelect.options).some(o => o.value === currentVal)) {
      taskAssigneeSelect.value = currentVal;
    }
  }
}

export function renderTeamManagementModal() {
  const container = document.getElementById('manage-team-list-container');
  if (!container || !boardState.boardData) return;

  const board = boardState.boardData;
  const team = Array.isArray(board.team) ? board.team : [];

  container.innerHTML = team.map(m => {
    const isOwner = m.role === 'Owner' || m.id === board.ownerId;
    const initial = getMemberInitial(m.name);
    return `
      <div class="team-member-item flex items-center justify-between gap-3" style="padding: 0.65rem 0.85rem; background: var(--bg-card); border: 1px solid var(--color-border); border-radius: 0px !important;">
        <div class="flex items-center gap-3" style="flex: 1; min-width: 0;">
          <span class="avatar-pill" style="background: ${m.color || 'var(--primary)'}; color: #FFF; width: 32px; height: 32px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; flex-shrink: 0; border-radius: 0px !important;">
            ${initial}
          </span>
          <div style="flex: 1; min-width: 0; overflow: hidden;">
            <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
              ${escapeHTML(m.name)}
              ${isOwner ? '<span class="badge badge-primary" style="font-size: 0.68rem; padding: 2px 6px; margin-left: 6px; border-radius: 0px !important;">Owner</span>' : ''}
            </div>
            ${m.email ? `<div style="font-size: 0.75rem; color: var(--text-tertiary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${escapeHTML(m.email)}</div>` : ''}
          </div>
        </div>

        <div class="flex items-center gap-2">
          ${isOwner ? `
            <span style="font-size: 0.8rem; font-weight: 700; color: var(--primary); padding: 0.2rem 0.5rem;">Owner</span>
          ` : `
            <select class="select team-member-role-select" data-member-id="${m.id}" style="width: auto; padding: 0.25rem 0.5rem; font-size: 0.78rem;">
              <option value="Member" ${m.role === 'Member' ? 'selected' : ''}>Member</option>
              <option value="Viewer" ${m.role === 'Viewer' ? 'selected' : ''}>Viewer</option>
            </select>
            <button type="button" class="btn btn-sm btn-icon remove-team-member-btn" data-member-id="${m.id}" title="Remove Member" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color: var(--accent-coral); display: inline-flex; align-items: center; justify-content: center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.team-member-role-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const mId = e.target.getAttribute('data-member-id');
      const newRole = e.target.value;
      updateMemberRole(mId, newRole);
      renderTeamManagementModal();
      populateAssigneeDropdowns();
      showToast("Role updated", "info");
    });
  });

  container.querySelectorAll('.remove-team-member-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mId = btn.getAttribute('data-member-id');
      const target = team.find(m => m.id === mId);
      const name = target ? target.name : 'this member';
      if (confirm(`Are you sure you want to remove ${name} from the team?`)) {
        removeTeamMember(mId);
        renderTeamManagementModal();
        populateAssigneeDropdowns();
        renderBoardView();
        showToast("Team member removed", "info");
      }
    });
  });
}

export function openTeamManagementModal() {
  renderTeamManagementModal();
  openModal('manage-team-modal');
}

export function renderBoardView() {
  const board = boardState.boardData;
  if (!board) return;

  // 1. Populate Assignee Dropdowns
  populateAssigneeDropdowns();

  // 2. Update Board Title Header
  const titleEl = document.getElementById('board-title');
  if (titleEl) titleEl.innerText = board.title;

  // 3. Run FlowZen Intelligence Analysis
  const intelligence = analyzeFlowZenIntelligence(boardState.tasks, boardState.columns);

  // 4. Render Board Quick Stats Bar
  renderQuickStatsBar(boardState.tasks, boardState.columns);

  // 5. Render FlowZen Intelligence Recommendation Banner
  renderFlowZenIntelligenceWidget(intelligence);

  const activeView = boardState.activeView || 'kanban';
  const filtered = filterTasks(boardState.tasks, boardState.filterState);

  const kanbanViewport = document.getElementById('kanban-viewport');
  const timelineViewport = document.getElementById('timeline-viewport');
  const calendarViewport = document.getElementById('calendar-viewport');

  // Update view switcher tab buttons active state
  document.querySelectorAll('.view-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === activeView);
  });

  if (activeView === 'kanban') {
    if (kanbanViewport) kanbanViewport.style.display = 'flex';
    if (timelineViewport) timelineViewport.style.display = 'none';
    if (calendarViewport) calendarViewport.style.display = 'none';

    if (kanbanViewport) {
      kanbanViewport.innerHTML = boardState.columns.map(column => {
        const colTasks = sortTasks(
          filtered.filter(t => t.columnId === column.id),
          boardState.filterState.sortBy
        );

        const taskCount = colTasks.length;
        const isWipExceeded = column.wipLimit !== null && column.wipLimit > 0 && taskCount > column.wipLimit;
        const bottleneckAlert = intelligence.bottlenecks.find(b => b.columnId === column.id);

        return `
          <div class="kanban-column ${isWipExceeded || bottleneckAlert ? 'wip-exceeded' : ''}" data-column-id="${column.id}">
            <div class="kanban-column-header ${isWipExceeded || bottleneckAlert ? 'wip-alert' : ''}">
              <div class="column-title">
                <span>${escapeHTML(column.title)}</span>
                <span class="badge ${isWipExceeded ? 'column-wip-badge exceeded' : 'column-wip-badge'}" style="border-radius: 0px !important;">
                  ${taskCount}${column.wipLimit ? ` / ${column.wipLimit} WIP` : ''}
                </span>
              </div>
              <div class="flex items-center gap-1">
                <button class="btn btn-sm btn-icon add-task-col-btn" title="Add task to ${escapeHTML(column.title)}" data-column-id="${column.id}">
                  +
                </button>
                <button class="btn btn-sm btn-icon edit-col-btn" title="Edit column options" data-column-id="${column.id}">
                  Options
                </button>
              </div>
            </div>

            ${bottleneckAlert ? `
              <div style="background-color: var(--accent-coral); color: #FFF; font-weight: 700; font-size: 0.78rem; padding: 0.35rem 0.75rem; border-bottom: 1px solid var(--color-border);">
                Bottleneck: ${escapeHTML(bottleneckAlert.reason)}
              </div>
            ` : ''}

            <div class="kanban-column-body" data-column-id="${column.id}">
              ${colTasks.length === 0 ? `
                <div style="text-align: center; color: var(--text-tertiary); padding: 1.5rem 0.5rem; font-size: 0.85rem; border: 1px dashed var(--color-border); border-radius: 0px !important;">
                  Drop tasks here or click +
                </div>
              ` : colTasks.map(task => {
                const taskIntel = intelligence.analyzedTasks.find(a => a.task.id === task.id);
                return renderTaskCard(task, taskIntel);
              }).join('')}
            </div>
          </div>
        `;
      }).join('');
    }
  } else if (activeView === 'timeline') {
    if (kanbanViewport) kanbanViewport.style.display = 'none';
    if (timelineViewport) timelineViewport.style.display = 'flex';
    if (calendarViewport) calendarViewport.style.display = 'none';

    renderTimelineView(filtered, boardState.columns, intelligence);
  } else if (activeView === 'calendar') {
    if (kanbanViewport) kanbanViewport.style.display = 'none';
    if (timelineViewport) timelineViewport.style.display = 'none';
    if (calendarViewport) calendarViewport.style.display = 'flex';

    renderCalendarView(filtered, boardState.columns, intelligence);
  }

  // 7. Render Right-Side INSIGHTS Panel
  renderInsightsSidebar(boardState.tasks, boardState.columns, intelligence);

  attachBoardEvents();
}

/**
 * Renders Board Quick Stats Bar (XX Tasks, XX Done, X Overdue, X Blocked)
 */
function renderQuickStatsBar(tasks, columns) {
  const container = document.getElementById('board-stats-bar-container');
  if (!container) return;

  const total = tasks.length;
  
  const doneCols = getDoneColumns(columns);
  const doneColIds = doneCols.map(c => c.id);
  const doneCount = tasks.filter(t => doneColIds.includes(t.columnId)).length;

  const overdueCount = tasks.filter(t => !doneColIds.includes(t.columnId) && isOverdue(t.dueDate)).length;

  // Blocked tasks count
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const blockedCount = tasks.filter(t => {
    if (doneColIds.includes(t.columnId)) return false;
    if (!t.dependsOnTaskId) return false;
    const parent = taskMap.get(t.dependsOnTaskId);
    return parent && !doneColIds.includes(parent.columnId);
  }).length;

  container.innerHTML = `
    <div class="stat-pill stat-pill-total" title="Total active board tasks" style="border-radius: 0px !important;">
      <strong>${total} Tasks</strong>
    </div>
    <div class="stat-pill stat-pill-done" title="Completed tasks" style="border-radius: 0px !important;">
      <strong>${doneCount} Done</strong>
    </div>
    <div class="stat-pill stat-pill-overdue" title="Overdue tasks requiring immediate attention" style="border-radius: 0px !important;">
      <strong>${overdueCount} Overdue</strong>
    </div>
    <div class="stat-pill stat-pill-blocked" title="Tasks blocked by dependencies" style="border-radius: 0px !important;">
      <strong>${blockedCount} Blocked</strong>
    </div>
  `;
}

function renderTaskCard(task, intel) {
  const isTaskOverdue = isOverdue(task.dueDate);
  const riskLevel = intel ? intel.riskLevel : 'Low';
  const riskScore = intel ? intel.riskScore : 10;
  const isBlocked = intel ? intel.isBlocked : false;
  const parentTaskTitle = intel ? intel.parentTaskTitle : null;
  const predictedEffort = intel ? intel.predictedEffort : (task.estimatedHours || 4);
  const blockedDownstream = intel ? intel.blockedDownstreamCount : 0;

  const doneCols = getDoneColumns(boardState.columns);
  const doneColIds = doneCols.map(c => c.id);
  const isTaskDone = doneColIds.includes(task.columnId);

  const riskBadgeClass = {
    Critical: 'badge-urgent',
    High: 'badge-high',
    Moderate: 'badge-medium',
    Low: 'badge-low'
  }[riskLevel] || 'badge-low';

  let subtaskSummary = '';
  let subtaskPct = 0;
  if (task.subtasks && task.subtasks.length > 0) {
    const doneCount = task.subtasks.filter(s => s.done).length;
    const totalCount = task.subtasks.length;
    subtaskPct = Math.round((doneCount / totalCount) * 100);
    subtaskSummary = `${doneCount}/${totalCount}`;
  }

  const initial = getMemberInitial(task.assignee);

  let memberColor = 'var(--bg-alt)';
  let memberTextColor = 'var(--text-primary)';
  if (boardState.boardData && Array.isArray(boardState.boardData.team)) {
    const member = boardState.boardData.team.find(m => m.name === task.assignee || m.id === task.assignee);
    if (member && member.color) {
      memberColor = member.color;
      memberTextColor = '#FFFFFF';
    }
  }

  return `
    <div class="task-card ${isBlocked ? 'is-blocked' : ''} ${isTaskDone ? 'is-done-card' : ''}" draggable="true" data-task-id="${task.id}" style="${isTaskDone ? 'border-left: 3px solid var(--accent-emerald); opacity: 0.88;' : ''}">
      <div class="task-card-header" style="margin-bottom: 0.4rem;">
        <div class="task-card-title" style="${isTaskDone ? 'text-decoration: line-through; opacity: 0.8;' : ''}">${escapeHTML(task.title)}</div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <span class="badge badge-${task.priority || 'medium'}">${task.priority || 'med'}</span>
          ${riskScore > 40 ? `<span class="badge ${riskBadgeClass}" title="FlowZen Risk Score: ${riskScore}/100">Risk ${riskScore}</span>` : ''}
        </div>
      </div>

      ${isBlocked && parentTaskTitle ? `
        <div style="margin-bottom: 0.4rem;">
          <span class="badge badge-blocked" style="font-size: 0.7rem;">Blocked: ${escapeHTML(parentTaskTitle.substring(0, 20))}...</span>
        </div>
      ` : ''}

      ${blockedDownstream > 0 ? `
        <div style="margin-bottom: 0.4rem;">
          <span class="badge badge-medium" style="font-size: 0.7rem;">Blocks ${blockedDownstream} task${blockedDownstream > 1 ? 's' : ''}</span>
        </div>
      ` : ''}

      ${task.description ? `
        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.45rem; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
          ${escapeHTML(task.description)}
        </p>
      ` : ''}

      <!-- Assignee & Subtask Pill Row -->
      <div class="flex items-center justify-between gap-1" style="font-size: 0.75rem; margin-bottom: 0.45rem; color: var(--text-secondary);">
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="avatar-pill" style="width: 20px; height: 20px; font-size: 0.62rem; flex-shrink: 0; border-radius: var(--radius-pill) !important; display: inline-flex; align-items: center; justify-content: center; background: ${memberColor}; border: 1px solid var(--color-border); font-weight: 700; color: ${memberTextColor};">${initial}</span>
          <span style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 110px;">${escapeHTML(task.assignee || 'Unassigned')}</span>
        </div>
        
        <div class="flex items-center gap-1.5 flex-shrink-0">
          ${subtaskSummary ? `<span style="font-size: 0.72rem; font-weight: 600; background: var(--bg-alt); border: 1px solid var(--color-border); padding: 0.1rem 0.4rem; border-radius: var(--radius-sm);">${subtaskSummary} subtasks</span>` : ''}
          <span style="font-size: 0.72rem; opacity: 0.8;">Est: ${task.estimatedHours || 4}h</span>
        </div>
      </div>

      <div class="task-card-footer" style="margin-top: 0.45rem; padding-top: 0.4rem;">
        <span class="task-due-date ${isTaskOverdue ? 'overdue' : ''}" style="font-size: 0.74rem;">
          ${task.dueDate ? formatDate(task.dueDate) : 'No due date'}
          ${isTaskOverdue ? ' (Overdue)' : ''}
        </span>
        <div class="flex items-center gap-1">
          <button type="button" class="btn btn-sm ${isTaskDone ? 'btn-outline mark-done-btn' : 'btn-primary mark-done-btn'}" data-task-id="${task.id}" style="padding: 0.15rem 0.4rem; font-size: 0.7rem; ${isTaskDone ? 'border-color: var(--accent-emerald); color: var(--accent-emerald);' : ''}">
            ${isTaskDone ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px; vertical-align: text-bottom;"><path d="M20 6 9 17l-5-5"/></svg>Done' : 'Complete'}
          </button>
          <button type="button" class="btn btn-sm btn-outline edit-task-btn" data-task-id="${task.id}" style="padding: 0.15rem 0.35rem; font-size: 0.7rem;">
            Edit
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders Floating Draggable INSIGHTS Panel
 */
function renderInsightsSidebar(tasks, columns, intelligence) {
  const sidebar = document.getElementById('insights-sidebar-container');
  if (!sidebar) return;

  const doneCols = columns.filter(c => c.title.toLowerCase().includes('done') || c.title.toLowerCase().includes('completed'));
  const doneColIds = doneCols.map(c => c.id);

  // 1. Bottlenecks
  const bottlenecks = intelligence.bottlenecks;

  // 2. Blocked tasks count
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const blockedTasks = tasks.filter(t => {
    if (doneColIds.includes(t.columnId)) return false;
    if (!t.dependsOnTaskId) return false;
    const parent = taskMap.get(t.dependsOnTaskId);
    return parent && !doneColIds.includes(parent.columnId);
  });

  // 3. Aging tasks count (> 5 days incomplete)
  const agingTasks = tasks.filter(t => !doneColIds.includes(t.columnId) && getTaskAgeDays(t.createdAt) >= 5);

  // 4. Completion Rate
  const total = tasks.length;
  const doneCount = tasks.filter(t => doneColIds.includes(t.columnId)).length;
  const completionPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  sidebar.innerHTML = `
    <div class="insights-drag-handle" id="insights-drag-handle">
      <div class="flex items-center gap-2">
        <span style="font-size: 0.8rem; opacity: 0.6; cursor: move;">⋮⋮</span>
        <span>INSIGHTS</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span style="font-size: 0.7rem; color: var(--text-tertiary); font-weight: 500;">(Drag header)</span>
        <button type="button" class="btn btn-sm btn-icon" id="close-insights-btn" style="padding: 0.1rem 0.35rem; font-size: 0.75rem; display: inline-flex; align-items: center; justify-content: center;" title="Close Panel">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>

    <div class="insights-body">
      <!-- Bottlenecks Card -->
      <div class="insight-card" style="border-radius: 0px !important;">
        <div class="insight-card-title" style="color: var(--accent-coral);">
          Bottleneck
        </div>
        <div style="font-size: 0.85rem; font-weight: 600;">
          ${bottlenecks.length > 0 ? escapeHTML(bottlenecks[0].reason) : 'No bottlenecks detected across workflow stages.'}
        </div>
      </div>

      <!-- Blocked Tasks Card -->
      <div class="insight-card" style="border-radius: 0px !important;">
        <div class="insight-card-title" style="color: var(--secondary-hover);">
          Blocked Tasks
        </div>
        <div style="font-size: 0.85rem; font-weight: 600;">
          <strong>${blockedTasks.length} task${blockedTasks.length !== 1 ? 's' : ''}</strong> waiting on dependencies.
        </div>
      </div>

      <!-- Aging Tasks Card -->
      <div class="insight-card" style="border-radius: 0px !important;">
        <div class="insight-card-title" style="color: var(--accent-orange);">
          Aging Tasks (> 5 days)
        </div>
        <div style="font-size: 0.85rem; font-weight: 600;">
          <strong>${agingTasks.length} task${agingTasks.length !== 1 ? 's' : ''}</strong> sitting > 5 days incomplete.
        </div>
      </div>

      <!-- Completion Card -->
      <div class="insight-card" style="border-radius: 0px !important;">
        <div class="insight-card-title" style="color: var(--accent-emerald);">
          Completion Rate
        </div>
        <div style="font-size: 1.6rem; font-weight: 800; margin: 0.2rem 0; font-family: var(--font-heading);">
          ${completionPct}%
        </div>
        <div class="progress-container" style="border-radius: 0px !important;">
          <div class="progress-fill" style="width: ${completionPct}%; border-radius: 0px !important;"></div>
        </div>
      </div>
    </div>
  `;

  const closeBtn = document.getElementById('close-insights-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      sidebar.classList.remove('active');
    });
  }

  const handle = document.getElementById('insights-drag-handle');
  if (handle) {
    makeDraggable(sidebar, handle);
  }
}

function makeDraggable(elmnt, handle) {
  if (elmnt.dataset.dragInitialized) return;
  elmnt.dataset.dragInitialized = "true";

  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

  handle.addEventListener('mousedown', dragMouseDown);
  handle.addEventListener('touchstart', dragTouchStart, { passive: false });

  function dragMouseDown(e) {
    if (e.target.closest('button') || e.target.closest('input')) return;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.addEventListener('mouseup', closeDragElement);
    document.addEventListener('mousemove', elementDrag);
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;

    let newTop = elmnt.offsetTop - pos2;
    let newLeft = elmnt.offsetLeft - pos1;

    const maxLeft = window.innerWidth - elmnt.offsetWidth;
    const maxTop = window.innerHeight - elmnt.offsetHeight;

    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(50, Math.min(newTop, maxTop));

    elmnt.style.top = newTop + "px";
    elmnt.style.left = newLeft + "px";
    elmnt.style.right = "auto";
  }

  function closeDragElement() {
    document.removeEventListener('mouseup', closeDragElement);
    document.removeEventListener('mousemove', elementDrag);
  }

  function dragTouchStart(e) {
    if (e.target.closest('button') || e.target.closest('input')) return;
    const touch = e.touches[0];
    pos3 = touch.clientX;
    pos4 = touch.clientY;
    document.addEventListener('touchend', closeTouchDrag);
    document.addEventListener('touchmove', touchDrag, { passive: false });
  }

  function touchDrag(e) {
    e.preventDefault();
    const touch = e.touches[0];
    pos1 = pos3 - touch.clientX;
    pos2 = pos4 - touch.clientY;
    pos3 = touch.clientX;
    pos4 = touch.clientY;

    let newTop = elmnt.offsetTop - pos2;
    let newLeft = elmnt.offsetLeft - pos1;

    const maxLeft = window.innerWidth - elmnt.offsetWidth;
    const maxTop = window.innerHeight - elmnt.offsetHeight;

    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(50, Math.min(newTop, maxTop));

    elmnt.style.top = newTop + "px";
    elmnt.style.left = newLeft + "px";
    elmnt.style.right = "auto";
  }

  function closeTouchDrag() {
    document.removeEventListener('touchend', closeTouchDrag);
    document.removeEventListener('touchmove', touchDrag);
  }
}

function renderFlowZenIntelligenceWidget(intelligence) {
  const container = document.getElementById('recommendation-widget-container');
  if (!container) return;

  if (intelligence.coldStart) {
    container.innerHTML = `
      <div class="recommendation-banner" style="background: var(--bg-card); border-radius: 0px !important;">
        <div class="flex items-center gap-3">
          <span class="recommendation-badge" style="background: var(--color-border); color: var(--text-primary); border-radius: 0px !important;">FLOWZEN INTELLIGENCE</span>
          <span style="font-weight: 500; font-size: 0.9rem; color: var(--text-secondary);">
            FlowZen is learning your workflow. Predictions will become more accurate as you complete more tasks.
          </span>
        </div>
      </div>
    `;
    return;
  }

  const rec = intelligence.recommendation;
  if (!rec) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="recommendation-banner" style="border-radius: 0px !important;">
      <div style="display: flex; flex-direction: column; gap: 0.4rem; width: 100%;">
        <div class="flex items-center justify-between" style="border-bottom: 1px solid var(--color-border); padding-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
          <div class="flex items-center gap-2">
            <span class="recommendation-badge" style="border-radius: 0px !important;">NEXT RECOMMENDED</span>
            <strong style="font-size: 1.05rem; font-family: var(--font-heading);">${escapeHTML(rec.task.title)}</strong>
          </div>
          <span class="badge badge-urgent" style="font-size: 0.85rem; border-radius: 0px !important;">
            Recommendation: ${rec.recScore}/100
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; align-items: center; margin-top: 0.25rem;">
          <div>
            <div style="font-size: 0.88rem; font-weight: 600;">
              High priority • ${rec.task.dueDate ? 'Due ' + formatDate(rec.task.dueDate) : 'No due date'} • ${rec.estimatedHours}h est
            </div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
              Assignee: <strong>${escapeHTML(rec.task.assignee || 'Unassigned')}</strong> • Pred: <strong>${rec.predictedEffort}h</strong> (Conf: ${rec.confidencePct}%)
            </div>
          </div>

          <div style="font-size: 0.82rem; font-weight: 500; background: var(--bg-alt); padding: 0.5rem; border-radius: 0px !important; border: 1px solid var(--color-border);">
            <div style="font-weight: 700; margin-bottom: 2px;">Why start this task now?</div>
            ${rec.recReasons.map(r => `<div>• ${escapeHTML(r)}</div>`).join('')}
          </div>

          <div style="text-align: right;">
            <button class="btn btn-sm btn-primary focus-rec-task-btn" data-task-id="${rec.task.id}">
              Start Task Now
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  const focusBtn = container.querySelector('.focus-rec-task-btn');
  if (focusBtn) {
    focusBtn.addEventListener('click', () => {
      openTaskEditModal(rec.task.id);
    });
  }
}

function attachBoardEvents() {
  document.querySelectorAll('.add-task-col-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const colId = btn.getAttribute('data-column-id');
      openTaskEditModal(null, colId);
    });
  });

  document.querySelectorAll('.edit-task-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const taskId = btn.getAttribute('data-task-id');
      openTaskEditModal(taskId);
    });
  });

  document.querySelectorAll('.mark-done-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const taskId = btn.getAttribute('data-task-id');
      const task = boardState.tasks.find(t => t.id === taskId);
      if (!task) return;

      const doneCols = getDoneColumns(boardState.columns);
      const doneColIds = doneCols.map(c => c.id);
      const isCurrentlyDone = doneColIds.includes(task.columnId);

      if (isCurrentlyDone) {
        const firstCol = boardState.columns[0];
        task.columnId = firstCol.id;
        await saveTask(task);
        showToast(`Task reopened and moved to "${firstCol.title}"`, 'info');
      } else {
        const targetCol = doneCols[0];
        task.columnId = targetCol.id;
        await saveTask(task);
        showToast(`Task completed and moved to "${targetCol.title}"`, 'success');
      }
    });
  });

  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        const taskId = card.getAttribute('data-task-id');
        openTaskEditModal(taskId);
      }
    });
  });

  document.querySelectorAll('.edit-col-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const colId = btn.getAttribute('data-column-id');
      openColumnOptionsModal(colId);
    });
  });

  // Multi-View Switcher Tabs Listener
  document.querySelectorAll('.view-tab-btn').forEach(btn => {
    btn.onclick = () => {
      const view = btn.getAttribute('data-view');
      boardState.activeView = view;
      renderBoardView();
    };
  });

  // Calendar Navigation Listeners
  const prevCalBtn = document.getElementById('cal-prev-month-btn');
  if (prevCalBtn) prevCalBtn.onclick = () => { setCalendarMonth(-1); renderBoardView(); };

  const todayCalBtn = document.getElementById('cal-today-btn');
  if (todayCalBtn) todayCalBtn.onclick = () => { setCalendarMonth(0); renderBoardView(); };

  const nextCalBtn = document.getElementById('cal-next-month-btn');
  if (nextCalBtn) nextCalBtn.onclick = () => { setCalendarMonth(1); renderBoardView(); };

  // Calendar Cell Click -> Create Task with target Date
  document.querySelectorAll('.calendar-day-cell').forEach(cell => {
    cell.onclick = (e) => {
      if (!e.target.closest('.calendar-task-pill')) {
        const targetDate = cell.getAttribute('data-date');
        openTaskEditModal(null, null);
        const dueInput = document.getElementById('task-due-date-input');
        if (dueInput && targetDate) dueInput.value = targetDate;
      }
    };
  });

  // Timeline Bar & Calendar Task Pill Click -> Open Edit Task Modal
  document.querySelectorAll('.timeline-bar, .calendar-task-pill').forEach(el => {
    el.onclick = (e) => {
      e.stopPropagation();
      const taskId = el.getAttribute('data-task-id');
      if (taskId) openTaskEditModal(taskId);
    };
  });
}

export function openTaskEditModal(taskId = null, defaultColumnId = null) {
  activeEditTaskId = taskId;
  const task = taskId ? boardState.tasks.find(t => t.id === taskId) : null;

  const modalTitle = document.getElementById('task-modal-title');
  if (modalTitle) modalTitle.innerText = task ? 'Edit Task' : 'Create New Task';

  document.getElementById('task-title-input').value = task ? task.title : '';
  document.getElementById('task-desc-input').value = task ? (task.description || '') : '';
  document.getElementById('task-priority-select').value = task ? task.priority : 'medium';
  document.getElementById('task-category-select').value = task ? (task.category || 'Backend') : 'Backend';
  
  populateAssigneeDropdowns();
  if (task && task.assignee) {
    document.getElementById('task-assignee-select').value = task.assignee;
  }

  document.getElementById('task-est-hours-input').value = task ? (task.estimatedHours || 4) : 4;
  document.getElementById('task-due-date-input').value = task ? (task.dueDate || '') : '';
  document.getElementById('task-labels-input').value = task ? (task.labels ? task.labels.join(', ') : '') : '';

  const colSelect = document.getElementById('task-column-select');
  colSelect.innerHTML = boardState.columns.map(col => `
    <option value="${col.id}" ${(task ? task.columnId === col.id : col.id === defaultColumnId) ? 'selected' : ''}>
      ${escapeHTML(col.title)}
    </option>
  `).join('');

  const depSelect = document.getElementById('task-dependency-select');
  depSelect.innerHTML = `
    <option value="">-- No Dependency --</option>
    ${boardState.tasks
      .filter(t => t.id !== taskId)
      .map(t => `
        <option value="${t.id}" ${task && task.dependsOnTaskId === t.id ? 'selected' : ''}>
          ${escapeHTML(t.title)} (${t.priority})
        </option>
      `).join('')}
  `;

  renderSubtasksManager(task ? task.subtasks || [] : []);

  const deleteBtn = document.getElementById('delete-task-modal-btn');
  if (deleteBtn) deleteBtn.style.display = task ? 'inline-flex' : 'none';

  const quickCompleteBtn = document.getElementById('quick-complete-task-btn');
  if (quickCompleteBtn) {
    const doneCols = getDoneColumns(boardState.columns);
    const doneColIds = doneCols.map(c => c.id);
    const isCurrentlyDone = task ? doneColIds.includes(task.columnId) : false;

    quickCompleteBtn.innerHTML = isCurrentlyDone ? 'Completed (Reopen)' : 'Complete Task';
    quickCompleteBtn.style.color = isCurrentlyDone ? 'var(--accent-emerald)' : '';
    quickCompleteBtn.style.borderColor = isCurrentlyDone ? 'var(--accent-emerald)' : '';

    quickCompleteBtn.onclick = async () => {
      if (isCurrentlyDone) {
        colSelect.value = boardState.columns[0].id;
      } else {
        colSelect.value = doneCols[0].id;
      }
      document.getElementById('task-edit-form').requestSubmit();
    };
  }

  openModal('task-edit-modal');
}

let activeSubtasks = [];

function renderSubtasksManager(subtasks = []) {
  activeSubtasks = [...subtasks];
  const listEl = document.getElementById('subtasks-list-container');
  if (!listEl) return;

  const renderList = () => {
    listEl.innerHTML = activeSubtasks.map((sub, idx) => `
      <div class="flex items-center justify-between gap-2" style="padding: 0.35rem 0.5rem; background: var(--bg-alt); color: var(--text-primary); border: 1px solid var(--color-border); border-radius: 0px !important; margin-bottom: 0.35rem;">
        <label class="checkbox-custom">
          <input type="checkbox" data-sub-idx="${idx}" ${sub.done ? 'checked' : ''}>
          <span style="${sub.done ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${escapeHTML(sub.text)}</span>
        </label>
        <button type="button" class="btn btn-sm btn-icon remove-sub-btn" data-sub-idx="${idx}" style="padding: 0.1rem 0.3rem; display: inline-flex; align-items: center; justify-content: center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    `).join('');

    listEl.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-sub-idx'));
        activeSubtasks[idx].done = e.target.checked;
        renderList();
      });
    });

    listEl.querySelectorAll('.remove-sub-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-sub-idx'));
        activeSubtasks.splice(idx, 1);
        renderList();
      });
    });
  };

  renderList();
}

document.addEventListener('DOMContentLoaded', () => {
  const addSubBtn = document.getElementById('add-subtask-btn');
  const subInput = document.getElementById('new-subtask-input');

  if (addSubBtn && subInput) {
    addSubBtn.addEventListener('click', () => {
      const text = subInput.value.trim();
      if (text) {
        activeSubtasks.push({ text, done: false });
        subInput.value = '';
        renderSubtasksManager(activeSubtasks);
      }
    });
  }

  const addMemberForm = document.getElementById('add-team-member-form');
  if (addMemberForm) {
    addMemberForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('new-member-name');
      const emailInput = document.getElementById('new-member-email');
      const roleSelect = document.getElementById('new-member-role');

      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const role = roleSelect ? roleSelect.value : 'Member';

      if (name) {
        addTeamMemberToBoard(name, email, role);
        if (nameInput) nameInput.value = '';
        if (emailInput) emailInput.value = '';
        if (roleSelect) roleSelect.value = 'Member';
        renderTeamManagementModal();
        populateAssigneeDropdowns();
        renderBoardView();
        showToast(`Added ${name} to board team`, "success");
      }
    });
  }

  const taskForm = document.getElementById('task-edit-form');
  if (taskForm) {
    taskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('task-title-input').value.trim();
      if (!title) {
        showToast("Task title is required", "error");
        return;
      }

      const labelsRaw = document.getElementById('task-labels-input').value;
      const labels = labelsRaw.split(',').map(s => s.trim()).filter(Boolean);

      const taskPayload = {
        id: activeEditTaskId,
        title,
        description: document.getElementById('task-desc-input').value.trim(),
        priority: document.getElementById('task-priority-select').value,
        category: document.getElementById('task-category-select').value,
        assignee: document.getElementById('task-assignee-select').value,
        estimatedHours: parseFloat(document.getElementById('task-est-hours-input').value) || 4,
        columnId: document.getElementById('task-column-select').value,
        dueDate: document.getElementById('task-due-date-input').value || null,
        dependsOnTaskId: document.getElementById('task-dependency-select').value || null,
        labels,
        subtasks: activeSubtasks
      };

      await saveTask(taskPayload);
      closeModal('task-edit-modal');
      showToast(activeEditTaskId ? "Task updated" : "Task created", "success");
    });
  }

  const deleteBtn = document.getElementById('delete-task-modal-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (activeEditTaskId && confirm("Are you sure you want to delete this task?")) {
        await deleteTask(activeEditTaskId);
        closeModal('task-edit-modal');
        showToast("Task deleted", "info");
      }
    });
  }
});

export function openColumnOptionsModal(columnId = null) {
  const column = columnId ? boardState.columns.find(c => c.id === columnId) : null;

  const modalTitle = document.querySelector('#column-options-modal .modal-title');
  if (modalTitle) modalTitle.innerText = column ? 'Column Options & WIP Limit' : 'Create New Column';

  document.getElementById('col-title-input').value = column ? column.title : '';
  document.getElementById('col-wip-input').value = column && column.wipLimit !== null ? column.wipLimit : '';
  
  const isDoneChk = document.getElementById('col-is-done-checkbox');
  if (isDoneChk) {
    isDoneChk.checked = column ? (column.isDoneColumn || column.title.toLowerCase().includes('done') || column.title.toLowerCase().includes('completed')) : false;
  }

  const deleteColBtn = document.getElementById('delete-col-modal-btn');
  if (deleteColBtn) {
    deleteColBtn.style.display = column ? 'inline-flex' : 'none';
    deleteColBtn.onclick = async () => {
      if (column && confirm(`Delete column "${column.title}"?`)) {
        await deleteColumn(column.id);
        closeModal('column-options-modal');
        showToast("Column deleted", "info");
      }
    };
  }

  const saveBtn = document.getElementById('save-col-modal-btn');
  saveBtn.onclick = async () => {
    const title = document.getElementById('col-title-input').value.trim();
    const wipRaw = document.getElementById('col-wip-input').value.trim();
    const wipLimit = wipRaw !== '' ? parseInt(wipRaw) : null;
    const isDoneColumn = document.getElementById('col-is-done-checkbox').checked;

    if (!title) {
      showToast("Column title is required", "error");
      return;
    }

    const payload = column
      ? { ...column, title, wipLimit, isDoneColumn }
      : { title, position: boardState.columns.length, wipLimit, isDoneColumn };

    await saveColumn(payload);
    closeModal('column-options-modal');
    showToast(column ? "Column options saved" : "Column created successfully", "success");
  };

  openModal('column-options-modal');
}



