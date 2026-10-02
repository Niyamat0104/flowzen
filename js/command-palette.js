/* FlowZen Command Palette & Keyboard Shortcuts Engine (Linear / Raycast / Vercel Style) */
import { openModal, closeModal, showToast } from './ui-utils.js';

let commandPaletteModal = null;
let selectedIndex = 0;
let filteredCommands = [];

const COMMANDS = [
  // Quick Actions & Task Management
  {
    id: 'cmd-new-task',
    category: 'Actions',
    title: 'Create New Task',
    subtitle: 'Add a new task card to the current workspace',
    icon: '✨',
    shortcut: 'N',
    action: () => {
      const btn = document.getElementById('top-new-task-btn');
      if (btn) btn.click();
      else showToast("Open a board to create a task", "info");
    }
  },
  {
    id: 'cmd-toggle-timer',
    category: 'Actions',
    title: 'Toggle Task Stopwatch',
    subtitle: 'Start or pause live timer on active task',
    icon: '⏱️',
    shortcut: 'T',
    action: () => {
      const runningBtn = document.querySelector('.task-timer-btn.timer-running');
      if (runningBtn) {
        runningBtn.click();
      } else {
        const firstTimerBtn = document.querySelector('.task-timer-btn');
        if (firstTimerBtn) firstTimerBtn.click();
        else showToast("No active task timer found", "info");
      }
    }
  },
  {
    id: 'cmd-toggle-theme',
    category: 'Actions',
    title: 'Toggle Dark / Light Mode',
    subtitle: 'Switch application color theme mode',
    icon: '🌙',
    shortcut: 'M',
    action: () => {
      const toggle = document.querySelector('.theme-toggle-btn');
      if (toggle) toggle.click();
    }
  },
  {
    id: 'cmd-workspaces',
    category: 'Navigation',
    title: 'Go to Workspaces Dashboard',
    subtitle: 'View all board projects and metrics',
    icon: '🚀',
    shortcut: 'B',
    action: () => {
      window.location.href = 'boards.html';
    }
  },
  // Multi-View Switcher
  {
    id: 'cmd-view-kanban',
    category: 'Views',
    title: 'Switch to Kanban Board View',
    subtitle: 'Columns drag-and-drop workflow view',
    icon: '📋',
    shortcut: 'K',
    action: () => {
      const tab = document.querySelector('.view-tab-btn[data-view="kanban"]');
      if (tab) tab.click();
    }
  },
  {
    id: 'cmd-view-timeline',
    category: 'Views',
    title: 'Switch to Timeline Gantt View',
    subtitle: 'Interactive task duration roadmap',
    icon: '📊',
    shortcut: 'L',
    action: () => {
      const tab = document.querySelector('.view-tab-btn[data-view="timeline"]');
      if (tab) tab.click();
    }
  },
  {
    id: 'cmd-view-calendar',
    category: 'Views',
    title: 'Switch to Calendar View',
    subtitle: 'Monthly deadline calendar overview',
    icon: '📅',
    shortcut: 'C',
    action: () => {
      const tab = document.querySelector('.view-tab-btn[data-view="calendar"]');
      if (tab) tab.click();
    }
  },
  // Intelligence & Analytics
  {
    id: 'cmd-ai-assistant',
    category: 'Intelligence',
    title: 'Open AI Workflow Assistant',
    subtitle: 'FlowZen predictive risk & bottleneck intelligence',
    icon: '🤖',
    shortcut: 'A',
    action: () => {
      const btn = document.getElementById('intelligence-drawer-toggle-btn');
      if (btn) btn.click();
    }
  },
  {
    id: 'cmd-analytics',
    category: 'Intelligence',
    title: 'Open Velocity Analytics Modal',
    subtitle: 'Sprint velocity charts & cumulative flow',
    icon: '📈',
    shortcut: 'V',
    action: () => {
      const btn = document.getElementById('analytics-modal-btn');
      if (btn) btn.click();
    }
  },
  {
    id: 'cmd-activity-feed',
    category: 'Intelligence',
    title: 'Open Activity Feed Drawer',
    subtitle: 'Real-time team activity & change logs',
    icon: '⚡',
    shortcut: 'R',
    action: () => {
      const btn = document.getElementById('activity-feed-toggle-btn');
      if (btn) btn.click();
    }
  },
  // Export & Executive Reports
  {
    id: 'cmd-export-pdf',
    category: 'Reports',
    title: 'Generate Executive PDF Report',
    subtitle: 'Printable executive PDF sprint summary',
    icon: '📄',
    shortcut: 'P',
    action: () => {
      const btn = document.querySelector('[data-action="export-pdf"], .export-card-pdf-btn');
      if (btn) btn.click();
      else showToast("Open a board to generate PDF report", "info");
    }
  },
  {
    id: 'cmd-export-csv',
    category: 'Reports',
    title: 'Export Tasks to Excel / CSV',
    subtitle: 'Spreadsheet export for Google Sheets / Excel',
    icon: '📊',
    shortcut: 'E',
    action: () => {
      const btn = document.querySelector('[data-action="export-csv"], .export-card-csv-btn');
      if (btn) btn.click();
      else showToast("Open a board to export CSV", "info");
    }
  }
];

export function initCommandPalette() {
  injectCommandPaletteDOM();
  attachGlobalKeyboardShortcuts();
}

function injectCommandPaletteDOM() {
  if (document.getElementById('command-palette-modal')) return;

  const modalHtml = `
    <div class="modal-backdrop" id="command-palette-modal" style="z-index: 9990; align-items: flex-start; padding-top: 10vh;">
      <div class="modal command-palette-dialog" style="max-width: 640px; border-radius: var(--radius-lg); background: rgba(15, 23, 42, 0.96); backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.16); box-shadow: 0 25px 60px rgba(0,0,0,0.8); color: #FFF; overflow: hidden; padding: 0;">
        
        <!-- Palette Header Search Bar -->
        <div style="padding: 1rem 1.25rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; gap: 0.85rem;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" id="cmd-palette-input" placeholder="Type a command or search actions..." style="background: transparent; border: none; outline: none; color: #FFF; font-family: var(--font-family-display); font-size: 1.05rem; font-weight: 600; width: 100%;" autocomplete="off" />
          <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-tertiary); background: rgba(255,255,255,0.08); padding: 0.25rem 0.55rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">ESC</span>
        </div>

        <!-- Palette Results List -->
        <div id="cmd-palette-list" style="max-height: 380px; overflow-y: auto; padding: 0.5rem 0;">
          <!-- Commands rendered via JS -->
        </div>

        <!-- Palette Footer Navigation Hints -->
        <div style="padding: 0.65rem 1.25rem; background: rgba(0,0,0,0.3); border-top: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: space-between; font-size: 0.74rem; color: var(--color-muted);">
          <div class="flex items-center gap-3">
            <span><strong style="color:#FFF;">↑↓</strong> Navigate</span>
            <span><strong style="color:#FFF;">↵</strong> Select</span>
            <span><strong style="color:#FFF;">ESC</strong> Dismiss</span>
          </div>
          <div style="font-weight: 700; color: var(--accent-cyan);">FlowZen Command Hub</div>
        </div>
      </div>
    </div>

    <!-- Shortcuts Cheat Sheet Modal -->
    <div class="modal-backdrop" id="shortcuts-cheatsheet-modal" style="z-index: 9995;">
      <div class="modal" style="max-width: 540px;">
        <div class="modal-header">
          <h3 class="modal-title">⌨️ Keyboard Shortcuts</h3>
          <button class="modal-close" data-close-modal aria-label="Close">✕</button>
        </div>
        <div class="modal-body" style="font-size: 0.88rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
              <h4 style="font-size: 0.8rem; font-weight: 800; color: var(--primary); text-transform: uppercase; margin-bottom: 0.6rem;">General</h4>
              <div class="flex items-center justify-between" style="margin-bottom: 0.4rem;"><span>Command Hub</span> <kbd class="kbd-badge">⌘K / Ctrl+K</kbd></div>
              <div class="flex items-center justify-between" style="margin-bottom: 0.4rem;"><span>Shortcuts Help</span> <kbd class="kbd-badge">?</kbd></div>
              <div class="flex items-center justify-between" style="margin-bottom: 0.4rem;"><span>Toggle Dark Mode</span> <kbd class="kbd-badge">M</kbd></div>
              <div class="flex items-center justify-between" style="margin-bottom: 0.4rem;"><span>Workspaces</span> <kbd class="kbd-badge">B</kbd></div>
            </div>
            <div>
              <h4 style="font-size: 0.8rem; font-weight: 800; color: var(--secondary); text-transform: uppercase; margin-bottom: 0.6rem;">Views & Tasks</h4>
              <div class="flex items-center justify-between" style="margin-bottom: 0.4rem;"><span>Create Task</span> <kbd class="kbd-badge">N</kbd></div>
              <div class="flex items-center justify-between" style="margin-bottom: 0.4rem;"><span>Task Timer</span> <kbd class="kbd-badge">T</kbd></div>
              <div class="flex items-center justify-between" style="margin-bottom: 0.4rem;"><span>Kanban View</span> <kbd class="kbd-badge">K</kbd></div>
              <div class="flex items-center justify-between" style="margin-bottom: 0.4rem;"><span>Timeline View</span> <kbd class="kbd-badge">L</kbd></div>
              <div class="flex items-center justify-between" style="margin-bottom: 0.4rem;"><span>Calendar View</span> <kbd class="kbd-badge">C</kbd></div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" data-close-modal>Got it</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  commandPaletteModal = document.getElementById('command-palette-modal');
  const input = document.getElementById('cmd-palette-input');

  if (input) {
    input.addEventListener('input', (e) => {
      renderCommandList(e.target.value);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, filteredCommands.length - 1);
        highlightSelectedCommand();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        highlightSelectedCommand();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeSelectedCommand();
      }
    });
  }
}

function renderCommandList(query = '') {
  const listEl = document.getElementById('cmd-palette-list');
  if (!listEl) return;

  const q = query.toLowerCase().trim();
  filteredCommands = COMMANDS.filter(cmd => 
    !q || 
    cmd.title.toLowerCase().includes(q) || 
    cmd.subtitle.toLowerCase().includes(q) ||
    cmd.category.toLowerCase().includes(q)
  );

  selectedIndex = 0;

  if (filteredCommands.length === 0) {
    listEl.innerHTML = `
      <div style="padding: 2.5rem 1rem; text-align: center; color: var(--color-muted); font-size: 0.9rem;">
        No commands found matching "${query}"
      </div>
    `;
    return;
  }

  listEl.innerHTML = filteredCommands.map((cmd, idx) => `
    <div class="cmd-item ${idx === selectedIndex ? 'selected' : ''}" data-cmd-idx="${idx}" style="padding: 0.75rem 1.25rem; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: background 0.15s ease; border-left: 3px solid transparent;">
      <div class="flex items-center gap-3">
        <span style="font-size: 1.15rem; flex-shrink: 0;">${cmd.icon}</span>
        <div>
          <div style="font-weight: 700; font-size: 0.92rem; color: #FFF;">${cmd.title}</div>
          <div style="font-size: 0.76rem; color: var(--color-muted);">${cmd.subtitle}</div>
        </div>
      </div>
      <kbd class="kbd-badge">${cmd.shortcut}</kbd>
    </div>
  `).join('');

  listEl.querySelectorAll('.cmd-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
      selectedIndex = parseInt(item.getAttribute('data-cmd-idx'));
      highlightSelectedCommand();
    });

    item.addEventListener('click', () => {
      executeSelectedCommand();
    });
  });

  highlightSelectedCommand();
}

function highlightSelectedCommand() {
  const items = document.querySelectorAll('#cmd-palette-list .cmd-item');
  items.forEach((item, idx) => {
    if (idx === selectedIndex) {
      item.style.background = 'rgba(79, 70, 229, 0.35)';
      item.style.borderLeftColor = 'var(--primary)';
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.style.background = 'transparent';
      item.style.borderLeftColor = 'transparent';
    }
  });
}

function executeSelectedCommand() {
  if (filteredCommands[selectedIndex]) {
    const cmd = filteredCommands[selectedIndex];
    closeCommandPalette();
    setTimeout(() => {
      cmd.action();
    }, 50);
  }
}

export function openCommandPalette() {
  injectCommandPaletteDOM();
  renderCommandList();
  openModal('command-palette-modal');

  setTimeout(() => {
    const input = document.getElementById('cmd-palette-input');
    if (input) {
      input.value = '';
      input.focus();
    }
  }, 100);
}

export function closeCommandPalette() {
  closeModal('command-palette-modal');
}

export function openShortcutsHelp() {
  injectCommandPaletteDOM();
  openModal('shortcuts-cheatsheet-modal');
}

function attachGlobalKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ignore keypresses if user is typing in input or textarea
    const active = document.activeElement;
    const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

    // Ctrl+K or Cmd+K always opens Command Palette regardless of input focus
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const modal = document.getElementById('command-palette-modal');
      if (modal && modal.classList.contains('active')) {
        closeCommandPalette();
      } else {
        openCommandPalette();
      }
      return;
    }

    if (isTyping) return;

    // Hotkey shortcuts when not typing in textboxes
    if (e.key === '?') {
      e.preventDefault();
      openShortcutsHelp();
    } else if (e.key.toLowerCase() === 'n') {
      const btn = document.getElementById('top-new-task-btn');
      if (btn) { e.preventDefault(); btn.click(); }
    } else if (e.key.toLowerCase() === 'm') {
      const toggle = document.querySelector('.theme-toggle-btn');
      if (toggle) { e.preventDefault(); toggle.click(); }
    } else if (e.key.toLowerCase() === 't') {
      const runningBtn = document.querySelector('.task-timer-btn.timer-running') || document.querySelector('.task-timer-btn');
      if (runningBtn) { e.preventDefault(); runningBtn.click(); }
    } else if (e.key.toLowerCase() === 'k') {
      const tab = document.querySelector('.view-tab-btn[data-view="kanban"]');
      if (tab) { e.preventDefault(); tab.click(); }
    } else if (e.key.toLowerCase() === 'l') {
      const tab = document.querySelector('.view-tab-btn[data-view="timeline"]');
      if (tab) { e.preventDefault(); tab.click(); }
    } else if (e.key.toLowerCase() === 'c') {
      const tab = document.querySelector('.view-tab-btn[data-view="calendar"]');
      if (tab) { e.preventDefault(); tab.click(); }
    }
  });
}
