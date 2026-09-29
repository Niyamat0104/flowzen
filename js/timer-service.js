/* FlowZen Real-Time Task Stopwatch & Effort Hours Tracker Engine */
import { boardState, saveTask } from './board-state.js';
import { showToast } from './ui-utils.js';

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

  // If another task timer is running, pause it first to save its hours
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

export function updateLiveTimerDOM() {
  const activeId = activeTimerTaskId;
  const sec = activeTimerSeconds;
  const formatted = formatSecondsToHHMMSS(sec);

  // Update card buttons in DOM
  document.querySelectorAll('.task-timer-btn').forEach(btn => {
    const tId = btn.getAttribute('data-task-id');
    if (tId === activeId) {
      btn.classList.add('timer-running');
      btn.innerHTML = `⏸ ${formatted}`;
      btn.title = "Click to pause timer & log hours";
    } else {
      btn.classList.remove('timer-running');
      btn.innerHTML = `▶ Start`;
      btn.title = "Click to start live timer";
    }
  });

  // Update modal toggle button and display if modal is open
  const modalToggleBtn = document.getElementById('modal-timer-toggle-btn');
  const modalDisplay = document.getElementById('modal-live-timer-display');

  if (modalToggleBtn) {
    const editingTaskId = modalToggleBtn.getAttribute('data-task-id');
    if (editingTaskId && editingTaskId === activeId) {
      modalToggleBtn.className = "btn btn-sm btn-danger";
      modalToggleBtn.innerHTML = `⏸ Pause Timer (${formatted})`;
    } else {
      modalToggleBtn.className = "btn btn-sm btn-outline";
      modalToggleBtn.innerHTML = `▶ Start Timer`;
    }
  }

  if (modalDisplay) {
    if (activeId) {
      modalDisplay.innerHTML = `⏱ Active Timer: <strong>${formatted}</strong> (Running)`;
      modalDisplay.style.color = "var(--accent-emerald)";
    } else {
      modalDisplay.innerHTML = `⏱ Timer Idle`;
      modalDisplay.style.color = "var(--color-muted)";
    }
  }
}
