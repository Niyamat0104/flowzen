/* FlowZen Real-Time Task Stopwatch & Effort Hours Tracker Engine */
import { boardState, saveTask } from './board-state.js';
import { showToast, escapeHTML } from './ui-utils.js';

let activeTimerTaskId = null;
let timerInterval = null;
let activeTimerSeconds = 0;
let activeTimerStartTime = null;

const TIMER_STORAGE_KEY = 'flowzen_active_task_timer';

/**
 * Initialize timer service from Web Storage
 */
export function initTimerService() {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.taskId && data.startTime) {
        activeTimerTaskId = data.taskId;
        activeTimerStartTime = data.startTime;
        const now = Date.now();
        const elapsedSinceStart = Math.floor((now - data.startTime) / 1000);
        const baseAcc = data.accumulatedSeconds || 0;
        activeTimerSeconds = baseAcc + elapsedSinceStart;

        startTimerTicker(data.startTime, baseAcc);
      }
    }
  } catch (e) {
    console.warn("Timer service init error:", e);
  }
  ensureGlobalTimerWidget();
  updateLiveTimerDOM();
}

export function isTaskTimerRunning(taskId) {
  return activeTimerTaskId === taskId;
}

export function getActiveTimerTaskId() {
  return activeTimerTaskId;
}

export function getActiveTimerSeconds() {
  return activeTimerSeconds;
}

export function formatSecondsToHHMMSS(totalSec) {
  const sec = Math.max(0, parseInt(totalSec) || 0);
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function startTaskTimer(taskId) {
  if (!taskId) return;

  // If another task timer is running, pause it first to save its accumulated hours
  if (activeTimerTaskId && activeTimerTaskId !== taskId) {
    pauseTaskTimer(activeTimerTaskId);
  }

  const now = Date.now();
  activeTimerTaskId = taskId;
  activeTimerStartTime = now;
  activeTimerSeconds = 0;

  localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({
    taskId,
    startTime: now,
    accumulatedSeconds: 0
  }));

  startTimerTicker(now, 0);

  const task = boardState.tasks.find(t => t.id === taskId);
  const title = task ? task.title : 'task';
  showToast(`Timer started for "${title}" ⏱️`, "info");
  updateLiveTimerDOM();
}

function startTimerTicker(startTime, baseAcc) {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const now = Date.now();
    const elapsed = Math.floor((now - startTime) / 1000);
    activeTimerSeconds = baseAcc + elapsed;
    updateLiveTimerDOM();
  }, 1000);
}

export function pauseTaskTimer(taskId = activeTimerTaskId) {
  const targetId = taskId || activeTimerTaskId;
  if (!targetId) return;

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // Calculate hours worked (seconds / 3600)
  const hoursAdded = activeTimerSeconds / 3600;

  const task = boardState.tasks.find(t => t.id === targetId);
  if (task && hoursAdded > 0) {
    const currentActual = parseFloat(task.actualHours) || 0;
    const newActual = Math.round((currentActual + hoursAdded) * 100) / 100;
    task.actualHours = newActual;
    saveTask(task);
    showToast(`Logged +${hoursAdded.toFixed(2)}h onto "${task.title}" ⏱️`, "success");
  }

  activeTimerTaskId = null;
  activeTimerSeconds = 0;
  activeTimerStartTime = null;
  localStorage.removeItem(TIMER_STORAGE_KEY);
  updateLiveTimerDOM();
}

export function addQuickHours(taskId, hoursDelta) {
  const task = boardState.tasks.find(t => t.id === taskId);
  if (!task) return;

  const current = parseFloat(task.actualHours) || 0;
  const updated = Math.max(0, Math.round((current + hoursDelta) * 100) / 100);
  task.actualHours = updated;
  saveTask(task);
  showToast(`Updated logged time to ${updated}h ⏱️`, "info");
  updateLiveTimerDOM();
}

export function resetTaskTimer(taskId) {
  if (activeTimerTaskId === taskId) {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    activeTimerTaskId = null;
    activeTimerSeconds = 0;
    activeTimerStartTime = null;
    localStorage.removeItem(TIMER_STORAGE_KEY);
  }
  updateLiveTimerDOM();
}

export function toggleTaskTimer(taskId) {
  if (activeTimerTaskId === taskId) {
    pauseTaskTimer(taskId);
  } else {
    startTaskTimer(taskId);
  }
}

/**
 * Creates or updates sticky global active timer pill at bottom right
 */
function ensureGlobalTimerWidget() {
  let widget = document.getElementById('global-active-timer-widget');
  if (!widget) {
    widget = document.createElement('div');
    widget.id = 'global-active-timer-widget';
    widget.className = 'global-timer-widget';
    widget.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      background: rgba(15, 23, 42, 0.94);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(16, 185, 129, 0.6);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), 0 0 15px rgba(16, 185, 129, 0.3);
      padding: 0.65rem 1rem;
      border-radius: 999px;
      display: none;
      align-items: center;
      gap: 0.75rem;
      color: #FFFFFF;
      font-size: 0.85rem;
      animation: floatWidgetGlow 2s ease-in-out infinite alternate;
    `;
    document.body.appendChild(widget);
  }
  return widget;
}

export function updateLiveTimerDOM() {
  const activeId = activeTimerTaskId;
  const sec = activeTimerSeconds;
  const formatted = formatSecondsToHHMMSS(sec);

  // 1. Update Card Buttons in DOM
  document.querySelectorAll('.task-timer-btn').forEach(btn => {
    const tId = btn.getAttribute('data-task-id');
    if (tId === activeId) {
      btn.classList.add('timer-running');
      btn.innerHTML = `⏸ ${formatted}`;
      btn.title = "Click to pause timer & log hours";
    } else {
      btn.classList.remove('timer-running');
      const cardTask = boardState.tasks.find(t => t.id === tId);
      const actual = cardTask && cardTask.actualHours ? `${cardTask.actualHours.toFixed(1)}h` : '';
      btn.innerHTML = `▶ Start ${actual ? `<span style="font-size: 0.65rem; opacity: 0.8; margin-left: 2px;">(${actual})</span>` : ''}`;
      btn.title = "Click to start live timer";
    }
  });

  // 2. Update Edit Modal elements if modal is open
  const modalToggleBtn = document.getElementById('modal-timer-toggle-btn');
  const modalDisplay = document.getElementById('modal-live-timer-display');
  const modalActualInput = document.getElementById('task-actual-hours-input');

  if (modalToggleBtn) {
    const editingTaskId = modalToggleBtn.getAttribute('data-task-id');
    if (editingTaskId && editingTaskId === activeId) {
      modalToggleBtn.className = "btn btn-sm btn-danger timer-running";
      modalToggleBtn.innerHTML = `⏸ Pause Stopwatch (${formatted})`;
    } else if (editingTaskId) {
      modalToggleBtn.className = "btn btn-sm btn-primary";
      modalToggleBtn.innerHTML = `▶ Start Stopwatch`;
    }
  }

  if (modalDisplay && modalToggleBtn) {
    const editingTaskId = modalToggleBtn.getAttribute('data-task-id');
    if (editingTaskId && editingTaskId === activeId) {
      modalDisplay.innerHTML = `⏱ Active Stopwatch: <strong style="color: var(--accent-emerald); font-family: monospace; font-size: 0.9rem;">${formatted}</strong> (Running)`;
    } else if (editingTaskId) {
      const editingTask = boardState.tasks.find(t => t.id === editingTaskId);
      const act = editingTask ? (editingTask.actualHours || 0) : 0;
      const est = editingTask ? (editingTask.estimatedHours || 4) : 4;
      const pct = est > 0 ? Math.round((act / est) * 100) : 0;
      modalDisplay.innerHTML = `⏱ Tracked: <strong>${act}h</strong> of ${est}h estimated (${pct}% consumed)`;
    }
  }

  // 3. Update Sticky Global Floating Timer Widget
  const widget = ensureGlobalTimerWidget();
  if (activeId) {
    const activeTask = boardState.tasks.find(t => t.id === activeId);
    const title = activeTask ? activeTask.title : 'Task';

    widget.style.display = 'flex';
    widget.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem; max-width: 260px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
        <span class="live-dot" style="width: 8px; height: 8px; border-radius: 50%; background: #10B981; display: inline-block; animation: pulseDot 1s infinite;"></span>
        <span style="font-weight: 700; font-family: var(--font-heading); font-size: 0.85rem;" title="${escapeHTML(title)}">${escapeHTML(title)}</span>
      </div>
      <div style="font-family: var(--font-mono, monospace); font-weight: 800; font-size: 0.95rem; color: #10B981; letter-spacing: 0.5px;">
        ${formatted}
      </div>
      <button type="button" class="btn btn-sm btn-danger" id="global-timer-pause-btn" style="padding: 0.2rem 0.6rem; font-size: 0.72rem; border-radius: 999px; font-weight: 700;">
        ⏸ Pause & Log
      </button>
    `;

    const pauseBtn = document.getElementById('global-timer-pause-btn');
    if (pauseBtn) {
      pauseBtn.onclick = () => pauseTaskTimer(activeId);
    }
  } else {
    widget.style.display = 'none';
  }
}
