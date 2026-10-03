/**
 * FlowZen - Live AI Guided Product Demo Engine
 * 100% Native Vanilla ES6 Module
 * Automates browser UI interaction (scrolling, highlighting, tab switching, opening modals)
 * synchronized with live AI voice narration.
 */

import { speakText, stopSpeech } from './elevenlabs-voice.js';
import { openCommandPalette, closeCommandPalette } from './command-palette.js';
import { demoQuickLogin } from './auth.js';

let isTourActive = false;
let isTourPaused = false;
let currentStepIndex = 0;
let stepTimeoutId = null;

export const DEMO_STEPS = [
  {
    id: 'kanban_overview',
    title: '1. Executive Kanban Board Overview',
    selector: '.board-container, #kanban-board-container, .hero-showcase-container',
    speech: 'Welcome to FlowZen! Notice our executive Kanban board layout featuring To Do, In Progress, Review, and Done columns with real-time state synchronization.',
    action: (step) => {
      const target = document.querySelector(step.selector) || document.querySelector('.navbar') || document.body;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightElement(target);
      }
    }
  },
  {
    id: 'risk_scoring',
    title: '2. Dynamic Task Risk Scoring (0–100)',
    selector: '.task-card[data-risk], .hero-float-left, [data-risk]',
    speech: 'FlowZen evaluates deadline pressure, priority, effort hours, and dependencies to compute a dynamic 0 to 100 Risk Score for every task. High risk items are highlighted in red for immediate attention.',
    action: (step) => {
      const target = document.querySelector('.task-card[data-risk]') 
        || document.querySelector('.hero-float-left') 
        || document.querySelector(step.selector) 
        || document.body;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightElement(target);
      }
    }
  },
  {
    id: 'multi_view',
    title: '3. Multi-View Kanban, Calendar & Timeline',
    selector: '#view-mode-tabs, .view-mode-switch, .hero-center-content',
    speech: 'Switch seamlessly between standard Kanban columns, an interactive Calendar view for deadline tracking, and a visual Gantt timeline for team milestones.',
    action: (step) => {
      const target = document.querySelector('#view-mode-tabs') 
        || document.querySelector('.view-mode-switch') 
        || document.querySelector(step.selector);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightElement(target);

        // Click view mode buttons dynamically if on board.html
        const calBtn = document.querySelector('[data-view="calendar"], #view-btn-calendar');
        if (calBtn) {
          setTimeout(() => calBtn.click(), 1200);
          setTimeout(() => {
            const timeBtn = document.querySelector('[data-view="timeline"], #view-btn-timeline');
            if (timeBtn) timeBtn.click();
          }, 3200);
          setTimeout(() => {
            const kanbanBtn = document.querySelector('[data-view="kanban"], #view-btn-board');
            if (kanbanBtn) kanbanBtn.click();
          }, 5200);
        }
      }
    }
  },
  {
    id: 'live_stopwatch',
    title: '4. Live Focus Stopwatch & Time Tracking',
    selector: '#task-timer-display, .hero-moving-clock-widget, .timer-widget',
    speech: 'Log focus hours effortlessly with built-in task timers. FlowZen compares estimated vs logged hours to compute effort velocity ratios for your team.',
    action: (step) => {
      const target = document.querySelector('#task-timer-display') 
        || document.querySelector('.hero-moving-clock-widget') 
        || document.querySelector(step.selector) 
        || document.body;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightElement(target);
      }
    }
  },
  {
    id: 'command_palette',
    title: '5. Command Palette (⌘K) & Data Exports',
    selector: '#command-palette-modal, #nav-cmd-hub-btn, .hero-btn-glass-primary',
    speech: 'Press Command+K or Control+K anytime to launch the Command Hub. Search tasks, switch dark or light themes, or export your workspace data to CSV spreadsheets and PDF executive reports.',
    action: (step) => {
      if (typeof openCommandPalette === 'function') {
        openCommandPalette();
        setTimeout(() => {
          const input = document.getElementById('cmd-palette-input');
          if (input) {
            input.value = 'Risk Analysis Report';
            input.dispatchEvent(new Event('input'));
          }
          const modal = document.getElementById('command-palette-modal');
          if (modal) highlightElement(modal);
        }, 400);

        setTimeout(() => {
          if (typeof closeCommandPalette === 'function') closeCommandPalette();
        }, 5200);
      } else {
        const target = document.querySelector('.hero-btn-glass-primary') || document.body;
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          highlightElement(target);
        }
      }
    }
  }
];

/**
 * Start Live Guided Demo Engine
 */
export function startLiveGuidedDemo() {
  // Force clean reset of any existing tour state
  stopLiveGuidedDemo();

  isTourActive = true;
  isTourPaused = false;
  currentStepIndex = 0;

  // Auto-login to Demo Account
  try {
    demoQuickLogin();
  } catch (e) {
    console.warn('Demo login note:', e);
  }

  // Close any open modals to reveal page background
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
  document.body.style.overflow = '';

  createTourControlUI();
  window.addEventListener('keydown', handleTourKeydown);
  executeCurrentTourStep();
}

/**
 * Execute current tour step
 */
function executeCurrentTourStep() {
  if (!isTourActive || isTourPaused) return;

  if (currentStepIndex >= DEMO_STEPS.length) {
    completeLiveGuidedDemo();
    return;
  }

  const step = DEMO_STEPS[currentStepIndex];

  updateTourControlUI(step);

  if (typeof step.action === 'function') {
    try {
      step.action(step);
    } catch (e) {
      console.warn('Tour action error:', e);
      handleTourError(e);
    }
  }

  speakText(step.speech, () => {
    if (isTourActive && !isTourPaused) {
      stepTimeoutId = setTimeout(() => {
        currentStepIndex++;
        executeCurrentTourStep();
      }, 800);
    }
  });
}

/**
 * Handle Tour Error Gracefully
 */
function handleTourError(err) {
  const msg = err.message || 'An unexpected action error occurred.';
  showTourCaption(`⚠️ Notice: ${msg} - Resuming tour...`);
  speakText(`Notice: ${msg}. Resuming guided tour.`);
}

/**
 * Keyboard Navigation Listener during Live Demo Tour
 */
function handleTourKeydown(e) {
  if (!isTourActive) return;

  if (e.code === 'Space') {
    e.preventDefault();
    togglePauseDemo();
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    nextTourStep();
  } else if (e.code === 'Escape') {
    e.preventDefault();
    stopLiveGuidedDemo();
  }
}

/**
 * Pause / Resume Live Demo
 */
export function togglePauseDemo() {
  isTourPaused = !isTourPaused;
  const pauseBtn = document.getElementById('tour-pause-btn');

  if (isTourPaused) {
    stopSpeech();
    if (stepTimeoutId) clearTimeout(stepTimeoutId);
    if (pauseBtn) pauseBtn.innerHTML = '▶️ Resume';
    showTourCaption('Tour Paused. Press Space or click Resume to continue.');
  } else {
    if (pauseBtn) pauseBtn.innerHTML = '⏸️ Pause';
    executeCurrentTourStep();
  }
}

/**
 * Next Tour Step
 */
export function nextTourStep() {
  stopSpeech();
  if (stepTimeoutId) clearTimeout(stepTimeoutId);
  currentStepIndex = (currentStepIndex + 1) % DEMO_STEPS.length;
  executeCurrentTourStep();
}

/**
 * Stop & Exit Live Demo
 */
export function stopLiveGuidedDemo() {
  isTourActive = false;
  isTourPaused = false;
  stopSpeech();
  if (stepTimeoutId) clearTimeout(stepTimeoutId);

  window.removeEventListener('keydown', handleTourKeydown);

  removeSpotlight();

  const controlBar = document.getElementById('tour-control-bar');
  if (controlBar) controlBar.remove();

  const captionBox = document.getElementById('tour-caption-toast');
  if (captionBox) captionBox.remove();
}

/**
 * Tour Complete Handler
 */
function completeLiveGuidedDemo() {
  stopSpeech();
  removeSpotlight();

  // If on index.html, redirect to demo board to continue live demo!
  if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
    showTourCaption('🎉 Landing Page Tour Complete! Launching Live Demo Workspace...');
    speakText('Landing page tour complete! Launching live demo workspace now.', () => {
      setTimeout(() => {
        stopLiveGuidedDemo();
        window.location.href = 'board.html?id=board_demo_1&autotour=true';
      }, 1200);
    });
  } else {
    showTourCaption('🎉 Live Workspace AI Tour Complete! Enjoy building in FlowZen.');
    speakText('Live workspace tour complete! You are ready to start building in FlowZen.', () => {
      setTimeout(() => {
        stopLiveGuidedDemo();
      }, 1500);
    });
  }
}

/**
 * Highlight Target Element with Spotlight Box
 */
function highlightElement(el) {
  removeSpotlight();
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

  const spotlight = document.createElement('div');
  spotlight.id = 'tour-spotlight-box';
  spotlight.style.cssText = `
    position: absolute;
    top: ${rect.top + scrollTop - 8}px;
    left: ${rect.left + scrollLeft - 8}px;
    width: ${rect.width + 16}px;
    height: ${rect.height + 16}px;
    border: 3px solid #4F46E5;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45), 0 0 30px #4F46E5;
    border-radius: 8px;
    pointer-events: none;
    z-index: 9998;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  `;

  document.body.appendChild(spotlight);
}

function removeSpotlight() {
  const existing = document.getElementById('tour-spotlight-box');
  if (existing) existing.remove();
}

/**
 * Create Tour Control UI Overlay
 */
function createTourControlUI() {
  if (document.getElementById('tour-control-bar')) return;

  const controlBar = document.createElement('div');
  controlBar.id = 'tour-control-bar';
  controlBar.style.cssText = `
    position: fixed;
    top: 76px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    background: rgba(15, 23, 42, 0.94);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    color: #FFFFFF;
    border: 2px solid #4F46E5;
    padding: 8px 18px;
    box-shadow: 0 16px 40px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 0.86rem;
    font-weight: 700;
    flex-wrap: wrap;
    max-width: 95vw;
  `;

  controlBar.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 1.1rem; animation: pulseGlow 1.5s infinite;">🎙️</span>
      <span id="tour-step-title" style="color: #6EE7B7;">1. Executive Overview</span>
      <span id="tour-step-counter" style="font-size: 0.72rem; background: rgba(255,255,255,0.15); padding: 2px 8px; border-radius: 999px;">Step 1/5</span>
    </div>

    <form id="tour-ask-form" style="display: flex; gap: 4px; align-items: center; margin: 0;">
      <input type="text" id="tour-ask-input" class="form-control" placeholder="💬 Ask AI Agent a question..." style="font-size: 0.78rem; padding: 4px 10px; width: 200px; background: rgba(255,255,255,0.15); color: #fff; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px;" />
      <button type="submit" class="btn btn-xs btn-primary" style="font-size: 0.75rem; font-weight: 700;">Ask</button>
    </form>

    <div style="display: flex; gap: 6px; align-items: center;">
      <button type="button" id="tour-pause-btn" class="btn btn-xs btn-outline" style="color: #fff; border-color: rgba(255,255,255,0.3); font-size: 0.78rem;">
        ⏸️ Pause
      </button>
      <button type="button" id="tour-next-btn" class="btn btn-xs btn-outline" style="color: #fff; border-color: rgba(255,255,255,0.3); font-size: 0.78rem;">
        Next ▶
      </button>
      <button type="button" id="tour-exit-btn" class="btn btn-xs btn-primary" style="font-size: 0.78rem;">
        Exit Tour ✖
      </button>
    </div>
  `;

  document.body.appendChild(controlBar);

  document.getElementById('tour-pause-btn')?.addEventListener('click', togglePauseDemo);
  document.getElementById('tour-next-btn')?.addEventListener('click', nextTourStep);
  document.getElementById('tour-exit-btn')?.addEventListener('click', stopLiveGuidedDemo);

  const askForm = document.getElementById('tour-ask-form');
  const askInput = document.getElementById('tour-ask-input');
  if (askForm && askInput) {
    askForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const question = askInput.value.trim();
      if (question) {
        handleUserQuestion(question);
        askInput.value = '';
      }
    });
  }
}

/**
 * Handle Mid-Demo User Question
 */
function handleUserQuestion(qText) {
  stopSpeech();
  if (stepTimeoutId) clearTimeout(stepTimeoutId);
  isTourPaused = true;

  const pauseBtn = document.getElementById('tour-pause-btn');
  if (pauseBtn) pauseBtn.innerHTML = '▶️ Resume';

  const q = qText.toLowerCase();
  let answer = `That is a great question! FlowZen features dynamic task risk scoring, multi-view Kanban and timeline charts, focus stopwatch timers, and Command Hub shortcuts.`;

  if (q.includes('risk') || q.includes('score')) {
    answer = `Task Risk Scoring calculates a 0 to 100 risk index by combining deadline proximity, task priority, estimated effort hours, and dependency blockers. Red badges flag high risk items!`;
  } else if (q.includes('export') || q.includes('pdf') || q.includes('csv')) {
    answer = `You can export your workspace data anytime via JSON backups, CSV spreadsheets, or print PDF executive summaries directly from the board header or Command Hub!`;
  } else if (q.includes('view') || q.includes('calendar') || q.includes('timeline')) {
    answer = `FlowZen supports instant switching between standard Kanban columns, an interactive Calendar view for deadlines, and a visual Gantt Timeline for project milestones!`;
  } else if (q.includes('shortcut') || q.includes('command') || q.includes('ctrl+k')) {
    answer = `Press Command+K or Control+K to launch the global Command Palette! You can search tasks, toggle dark or light mode, or trigger workspace actions instantly.`;
  }

  showTourCaption(`<strong>User Asked:</strong> "${escapeHTML(qText)}"<br/><strong>AI Agent:</strong> ${escapeHTML(answer)}`);
  speakText(answer);
}

function updateTourControlUI(step) {
  const titleEl = document.getElementById('tour-step-title');
  const counterEl = document.getElementById('tour-step-counter');

  if (titleEl) titleEl.innerText = step.title;
  if (counterEl) counterEl.innerText = `Step ${currentStepIndex + 1}/${DEMO_STEPS.length}`;

  showTourCaption(step.speech);
}

/**
 * Show Live Tour Caption Toast
 */
function showTourCaption(text) {
  let captionBox = document.getElementById('tour-caption-toast');
  if (!captionBox) {
    captionBox = document.createElement('div');
    captionBox.id = 'tour-caption-toast';
    captionBox.style.cssText = `
      position: fixed;
      bottom: 90px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      background: rgba(15, 23, 42, 0.95);
      border: 2px solid #10B981;
      color: #F8FAFC;
      padding: 12px 24px;
      max-width: 650px;
      width: 90%;
      text-align: center;
      font-size: 0.92rem;
      line-height: 1.5;
      font-weight: 500;
      box-shadow: 0 12px 32px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(captionBox);
  }

  captionBox.innerHTML = `<strong>🗣️ AI Voice Agent:</strong> ${text}`;
}

/**
 * Utility HTML Escaper
 */
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Auto-trigger tour if URL parameter ?autotour=true is present
 */
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('autotour') === 'true') {
    setTimeout(() => {
      startLiveGuidedDemo();
    }, 600);
  }
});
