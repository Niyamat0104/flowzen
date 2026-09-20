/* FlowZen DOM Renderer for Kanban Board View, Quick Stats, Insights Sidebar & Assignees */
import { boardState, saveTask, deleteTask, saveColumn, deleteColumn } from './board-state.js';
import { filterTasks, sortTasks } from './filters-sort.js';
import { formatDate, isOverdue, getTaskAgeDays } from './date-utils.js';
import { analyzeFlowZenIntelligence } from './flowzen-intelligence.js';
import { openModal, closeModal, escapeHTML, showToast } from './ui-utils.js';

let activeEditTaskId = null;

export function renderBoardView() {
  const board = boardState.boardData;
  if (!board) return;

  // 1. Update Board Title Header
  const titleEl = document.getElementById('board-title');
  if (titleEl) titleEl.innerText = board.title;

  // 2. Run FlowZen Intelligence Analysis
  const intelligence = analyzeFlowZenIntelligence(boardState.tasks, boardState.columns);

  // 3. Render Board Quick Stats Bar (27 Tasks • 12 Done • 3 Overdue • 2 Blocked)
  renderQuickStatsBar(boardState.tasks, boardState.columns);

  // 4. Render 🤖 FlowZen Intelligence Recommendation Banner
  renderFlowZenIntelligenceWidget(intelligence);

  // 5. Render Columns & Task Cards in Left Viewport
  const viewport = document.getElementById('kanban-viewport');
  if (!viewport) return;

  const filtered = filterTasks(boardState.tasks, boardState.filterState);

  viewport.innerHTML = boardState.columns.map(column => {
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
            <span class="badge ${isWipExceeded ? 'column-wip-badge exceeded' : 'column-wip-badge'}">
              ${taskCount}${column.wipLimit ? ` / ${column.wipLimit} WIP` : ''}
            </span>
          </div>
          <div class="flex items-center gap-1">
            <button class="btn btn-sm btn-icon add-task-col-btn" title="Add task to ${escapeHTML(column.title)}" data-column-id="${column.id}">
              ➕
            </button>
            <button class="btn btn-sm btn-icon edit-col-btn" title="Edit column options" data-column-id="${column.id}">
              ⚙️
            </button>
          </div>
        </div>

        ${bottleneckAlert ? `
          <div style="background-color: var(--accent-coral); color: #FFF; font-weight: 800; font-size: 0.78rem; padding: 0.35rem 0.75rem; border-bottom: 2px solid #000;">
            ⚠️ Bottleneck: ${escapeHTML(bottleneckAlert.reason)}
          </div>
        ` : ''}

        <div class="kanban-column-body" data-column-id="${column.id}">
          ${colTasks.length === 0 ? `
            <div style="text-align: center; color: var(--accent-gray); padding: 1.5rem 0.5rem; font-size: 0.85rem; border: 2px dashed var(--color-border); border-radius: var(--radius-sm);">
              Drop tasks here or click ➕
            </div>
          ` : colTasks.map(task => {
            const taskIntel = intelligence.analyzedTasks.find(a => a.task.id === task.id);
            return renderTaskCard(task, taskIntel);
          }).join('')}
        </div>
      </div>
    `;
  }).join('');

  // 6. Render Right-Side INSIGHTS Panel
  renderInsightsSidebar(boardState.tasks, boardState.columns, intelligence);

  attachBoardEvents();
}

/**
 * Renders Board Quick Stats Bar (matching user mockup: XX Tasks, XX Done, X Overdue, X Blocked)
 */
function renderQuickStatsBar(tasks, columns) {
  const container = document.getElementById('board-stats-bar-container');
  if (!container) return;

  const total = tasks.length;
  
  const doneCols = columns.filter(c => c.title.toLowerCase().includes('done') || c.title.toLowerCase().includes('completed'));
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
    <div class="stat-pill stat-pill-total" title="Total active board tasks">
      📊 <strong>${total} Tasks</strong>
    </div>
    <div class="stat-pill stat-pill-done" title="Completed tasks">
      🎉 <strong>${doneCount} Done</strong>
    </div>
    <div class="stat-pill stat-pill-overdue" title="Overdue tasks requiring immediate attention">
      ⚠️ <strong>${overdueCount} Overdue</strong>
    </div>
    <div class="stat-pill stat-pill-blocked" title="Tasks blocked by dependencies">
      🔒 <strong>${blockedCount} Blocked</strong>
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

  return `
    <div class="task-card ${isBlocked ? 'is-blocked' : ''}" draggable="true" data-task-id="${task.id}">
      <div class="task-card-header">
        <div class="task-card-title">${escapeHTML(task.title)}</div>
        <div class="flex items-center gap-1">
          <span class="badge ${riskBadgeClass}" title="Risk Score: ${riskScore}/100">
            Risk: ${riskScore}/100
          </span>
          <span class="badge badge-${task.priority || 'medium'}">${task.priority || 'med'}</span>
        </div>
      </div>

      ${isBlocked && parentTaskTitle ? `
        <div style="margin-bottom: 0.5rem;">
          <span class="badge badge-blocked">🔒 BLOCKED BY ${escapeHTML(parentTaskTitle.substring(0, 16))}...</span>
        </div>
      ` : ''}

      ${blockedDownstream > 0 ? `
        <div style="margin-bottom: 0.5rem;">
          <span class="badge badge-medium" style="font-size: 0.72rem;">⚡ Blocks ${blockedDownstream} downstream task${blockedDownstream > 1 ? 's' : ''}</span>
        </div>
      ` : ''}

      <!-- Assignee & Effort Row -->
      <div class="flex items-center justify-between" style="font-size: 0.78rem; font-weight: 700; margin-bottom: 0.45rem; color: var(--accent-gray);">
        <span class="badge badge-label" style="font-size: 0.7rem; padding: 0.15rem 0.45rem;">
          👤 ${escapeHTML(task.assignee || 'Unassigned')}
        </span>
        <span>⏱️ Est: ${task.estimatedHours || 4}h → Pred: ${predictedEffort}h</span>
      </div>

      ${task.description ? `
        <p style="font-size: 0.82rem; color: var(--accent-gray); margin-bottom: 0.5rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
          ${escapeHTML(task.description)}
        </p>
      ` : ''}

      ${intel && intel.riskReasons && intel.riskReasons.length > 0 ? `
        <div style="background: var(--bg-alt); color: var(--color-black); padding: 0.4rem 0.6rem; border: 1.5px solid var(--color-border); border-radius: 6px; margin-bottom: 0.6rem; font-size: 0.75rem; font-weight: 600;">
          <div style="font-weight: 800; font-size: 0.72rem; text-transform: uppercase; margin-bottom: 2px;">FlowZen Insight:</div>
          ${intel.riskReasons.slice(0, 2).map(r => `<div>• ${escapeHTML(r)}</div>`).join('')}
        </div>
      ` : ''}

      ${subtaskSummary ? `
        <div style="margin-bottom: 0.5rem;">
          <div class="flex items-center justify-between" style="font-size: 0.75rem; font-weight: 700; margin-bottom: 2px;">
            <span>Subtasks</span>
            <span>${subtaskSummary}</span>
          </div>
          <div class="progress-container">
            <div class="progress-fill" style="width: ${subtaskPct}%;"></div>
          </div>
        </div>
      ` : ''}

      <div class="task-card-footer">
        <span class="task-due-date ${isTaskOverdue ? 'overdue' : ''}">
          📅 ${task.dueDate ? formatDate(task.dueDate) : 'No due date'}
          ${isTaskOverdue ? ' ⚠️' : ''}
        </span>
        <button class="btn btn-sm btn-outline edit-task-btn" data-task-id="${task.id}" style="padding: 0.2rem 0.4rem; font-size: 0.75rem;">
          ✏️ Edit
        </button>
      </div>
    </div>
  `;
}

/**
 * Renders Right-Side INSIGHTS Sidebar Panel matching exact ASCII layout mockup
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
    <div class="insights-panel">
      <div class="insights-panel-header">
        📊 INSIGHTS
      </div>

      <!-- Bottlenecks Card -->
      <div class="insight-card">
        <div class="insight-card-title" style="color: var(--accent-coral);">
          ⚠️ Bottleneck
        </div>
        <div style="font-size: 0.85rem; font-weight: 700;">
          ${bottlenecks.length > 0 ? escapeHTML(bottlenecks[0].reason) : 'No bottlenecks detected across workflow stages.'}
        </div>
      </div>

      <!-- Blocked Tasks Card -->
      <div class="insight-card">
        <div class="insight-card-title" style="color: var(--secondary-hover);">
          🔒 Blocked Tasks
        </div>
        <div style="font-size: 0.85rem; font-weight: 700;">
          <strong>${blockedTasks.length} task${blockedTasks.length !== 1 ? 's' : ''}</strong> waiting on dependencies.
        </div>
      </div>

      <!-- Aging Tasks Card -->
      <div class="insight-card">
        <div class="insight-card-title" style="color: var(--accent-orange);">
          ⏰ Aging Tasks (> 5 days)
        </div>
        <div style="font-size: 0.85rem; font-weight: 700;">
          <strong>${agingTasks.length} task${agingTasks.length !== 1 ? 's' : ''}</strong> sitting > 5 days incomplete.
        </div>
      </div>

      <!-- Completion Card -->
      <div class="insight-card">
        <div class="insight-card-title" style="color: var(--accent-emerald);">
          📈 Completion Rate
        </div>
        <div style="font-size: 1.6rem; font-weight: 900; margin: 0.2rem 0;">
          ${completionPct}%
        </div>
        <div class="progress-container">
          <div class="progress-fill" style="width: ${completionPct}%;"></div>
        </div>
      </div>
    </div>
  `;
}

function renderFlowZenIntelligenceWidget(intelligence) {
  const container = document.getElementById('recommendation-widget-container');
  if (!container) return;

  if (intelligence.coldStart) {
    container.innerHTML = `
      <div class="recommendation-banner" style="background: var(--primary-light);">
        <div class="flex items-center gap-3">
          <span class="recommendation-badge" style="background: var(--primary); color: #FFF;">🤖 FLOWZEN INTELLIGENCE</span>
          <span style="font-weight: 700; font-size: 0.92rem;">
            FlowZen is learning your workflow. Predictions will become more accurate as you complete more tasks!
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
    <div class="recommendation-banner">
      <div style="display: flex; flex-direction: column; gap: 0.4rem; width: 100%;">
        <div class="flex items-center justify-between" style="border-bottom: 2px solid var(--color-border); padding-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
          <div class="flex items-center gap-2">
            <span class="recommendation-badge">🔥 NEXT RECOMMENDED</span>
            <strong style="font-size: 1.1rem; text-transform: uppercase;">${escapeHTML(rec.task.title)}</strong>
          </div>
          <span class="badge badge-urgent" style="font-size: 0.85rem;">
            Recommendation: ${rec.recScore}/100
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; align-items: center; margin-top: 0.25rem;">
          <div>
            <div style="font-size: 0.88rem; font-weight: 800;">
              High priority • ${rec.task.dueDate ? 'Due ' + formatDate(rec.task.dueDate) : 'No due date'} • ${rec.estimatedHours}h est
            </div>
            <div style="font-size: 0.8rem; opacity: 0.85; margin-top: 2px;">
              Assignee: <strong>${escapeHTML(rec.task.assignee || 'Unassigned')}</strong> • Pred: <strong>${rec.predictedEffort}h</strong> (Conf: ${rec.confidencePct}%)
            </div>
          </div>

          <div style="font-size: 0.82rem; font-weight: 700; background: rgba(0,0,0,0.12); padding: 0.5rem; border-radius: 6px; border: 1.5px solid var(--color-border);">
            <div style="font-weight: 800; margin-bottom: 2px;">Why start this task now?</div>
            ${rec.recReasons.map(r => `<div>• ${escapeHTML(r)}</div>`).join('')}
          </div>

          <div style="text-align: right;">
            <button class="btn btn-sm btn-primary focus-rec-task-btn" data-task-id="${rec.task.id}">
              🎯 Start Task Now
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
}

export function openTaskEditModal(taskId = null, defaultColumnId = null) {
  activeEditTaskId = taskId;
  const task = taskId ? boardState.tasks.find(t => t.id === taskId) : null;

  const modalTitle = document.getElementById('task-modal-title');
  if (modalTitle) modalTitle.innerText = task ? '✏️ Edit Task' : '➕ Create New Task';

  document.getElementById('task-title-input').value = task ? task.title : '';
  document.getElementById('task-desc-input').value = task ? (task.description || '') : '';
  document.getElementById('task-priority-select').value = task ? task.priority : 'medium';
  document.getElementById('task-category-select').value = task ? (task.category || 'Backend') : 'Backend';
  document.getElementById('task-assignee-select').value = task ? (task.assignee || 'Alex Rivera') : 'Alex Rivera';
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

  openModal('task-edit-modal');
}

let activeSubtasks = [];

function renderSubtasksManager(subtasks = []) {
  activeSubtasks = [...subtasks];
  const listEl = document.getElementById('subtasks-list-container');
  if (!listEl) return;

  const renderList = () => {
    listEl.innerHTML = activeSubtasks.map((sub, idx) => `
      <div class="flex items-center justify-between gap-2" style="padding: 0.35rem 0.5rem; background: var(--bg-alt); color: var(--color-black); border: 1.5px solid var(--color-border); border-radius: 4px; margin-bottom: 0.35rem;">
        <label class="checkbox-custom">
          <input type="checkbox" data-sub-idx="${idx}" ${sub.done ? 'checked' : ''}>
          <span style="${sub.done ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${escapeHTML(sub.text)}</span>
        </label>
        <button type="button" class="btn btn-sm btn-icon remove-sub-btn" data-sub-idx="${idx}" style="padding: 0.1rem 0.3rem;">✕</button>
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
      showToast(activeEditTaskId ? "Task updated!" : "Task created!", "success");
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
  if (modalTitle) modalTitle.innerText = column ? '⚙️ Column Options & WIP Limit' : '➕ Create New Column';

  document.getElementById('col-title-input').value = column ? column.title : '';
  document.getElementById('col-wip-input').value = column && column.wipLimit !== null ? column.wipLimit : '';

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

    if (!title) {
      showToast("Column title is required", "error");
      return;
    }

    const payload = column
      ? { ...column, title, wipLimit }
      : { title, position: boardState.columns.length, wipLimit };

    await saveColumn(payload);
    closeModal('column-options-modal');
    showToast(column ? "Column options saved" : "Column created successfully!", "success");
  };

  openModal('column-options-modal');
}
