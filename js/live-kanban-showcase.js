/* FlowZen Live Interactive Kanban Board Showcase Controller */

const TEAM_CURSORS = [
  { id: 'alex', name: 'Alex (Architect)', color: '#4F46E5', avatar: 'AV' },
  { id: 'elena', name: 'Elena (UX Lead)', color: '#0EA5E9', avatar: 'ER' },
  { id: 'priya', name: 'Priya (PM)', color: '#EC4899', avatar: 'PS' },
  { id: 'marcus', name: 'Marcus (DevOps)', color: '#10B981', avatar: 'MC' }
];

const INITIAL_SHOWCASE_TASKS = [
  { id: 't1', code: '#FLOW-102', title: 'Minify CSS Tokens', column: 'backlog', assignee: 'Alex', risk: 35, priority: 'medium' },
  { id: 't2', code: '#FLOW-105', title: 'OAuth2 PKCE Provider', column: 'backlog', assignee: 'Alex', risk: 72, priority: 'urgent' },
  { id: 't3', code: '#FLOW-108', title: 'Glassmorphism Design System', column: 'in_progress', assignee: 'Elena', risk: 88, priority: 'urgent' },
  { id: 't4', code: '#FLOW-112', title: 'Broadcast Sync Engine', column: 'in_progress', assignee: 'Marcus', risk: 42, priority: 'high' },
  { id: 't5', code: '#FLOW-115', title: 'WIP Limit Warning Thresholds', column: 'review', assignee: 'Priya', risk: 25, priority: 'low' },
  { id: 't6', code: '#FLOW-118', title: 'Zero-Trust Auth Token Refresh', column: 'testing', assignee: 'Alex', risk: 64, priority: 'high' },
  { id: 't7', code: '#FLOW-120', title: 'Predictive Task Risk Matrix', column: 'done', assignee: 'Priya', risk: 15, priority: 'high' }
];

const PASTING_ANIMATION_STEPS = [
  {
    cursor: TEAM_CURSORS[0], // Alex
    taskCode: '#FLOW-105',
    taskTitle: 'OAuth2 PKCE Provider',
    fromCol: 'backlog',
    toCol: 'in_progress',
    actionText: 'Alex pasted #FLOW-105 to IN PROGRESS'
  },
  {
    cursor: TEAM_CURSORS[1], // Elena
    taskCode: '#FLOW-108',
    taskTitle: 'Glassmorphism Design System',
    fromCol: 'in_progress',
    toCol: 'review',
    actionText: 'Elena moved #FLOW-108 to REVIEW'
  },
  {
    cursor: TEAM_CURSORS[2], // Priya
    taskCode: '#FLOW-115',
    taskTitle: 'WIP Limit Warning Thresholds',
    fromCol: 'review',
    toCol: 'testing',
    actionText: 'Priya routed #FLOW-115 to TESTING'
  },
  {
    cursor: TEAM_CURSORS[3], // Marcus
    taskCode: '#FLOW-118',
    taskTitle: 'Zero-Trust Auth Token Refresh',
    fromCol: 'testing',
    toCol: 'done',
    actionText: 'Marcus completed #FLOW-118 into DONE'
  }
];

let activeStepIdx = 0;
let animationTimer = null;
let isPaused = false;
let showcaseTasksState = [...INITIAL_SHOWCASE_TASKS];

export function initLiveKanbanShowcase() {
  const container = document.getElementById('live-kanban-showcase-container');
  if (!container) return;

  renderShowcaseStructure(container);
  renderShowcaseCards();

  // Start automated looping live paste sequence
  startLiveAnimationLoop();

  // Attach controls
  const toggleBtn = document.getElementById('toggle-showcase-anim-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      isPaused = !isPaused;
      toggleBtn.innerText = isPaused ? 'Play Live Animation' : 'Pause Live Animation';
    });
  }

  const triggerPasteBtn = document.getElementById('trigger-live-paste-btn');
  if (triggerPasteBtn) {
    triggerPasteBtn.addEventListener('click', () => {
      triggerSinglePasteSequence();
    });
  }
}

function renderShowcaseStructure(container) {
  container.innerHTML = `
    <div class="live-kanban-wrapper">
      <!-- Live Header Status Bar -->
      <div class="live-kanban-header-bar">
        <div class="flex items-center gap-2">
          <span class="live-pulse-dot"></span>
          <span style="font-weight: 800; font-size: 0.85rem; color: #FFFFFF;">LIVE TEAM KANBAN BOARD</span>
          <span class="badge badge-medium" style="font-size: 0.68rem; margin-left: 6px;">REAL-TIME SYNC</span>
        </div>

        <div class="flex items-center gap-2">
          <button type="button" class="btn btn-sm btn-primary" id="trigger-live-paste-btn" style="font-size: 0.75rem; padding: 0.25rem 0.65rem;">
            + Paste Task Live
          </button>
          <button type="button" class="btn btn-sm btn-outline" id="toggle-showcase-anim-btn" style="font-size: 0.75rem; padding: 0.25rem 0.65rem;">
            Pause Live Animation
          </button>
        </div>
      </div>

      <!-- Main Live Canvas Area -->
      <div class="live-kanban-board-canvas" id="live-canvas-area">
        
        <!-- Animated Cursors -->
        <div class="live-team-cursor" id="showcase-live-cursor" style="top: 80px; left: 40px;">
          <svg class="cursor-pointer-icon" viewBox="0 0 24 24" fill="#4F46E5" stroke="#FFFFFF" stroke-width="1.5">
            <path d="M3 3l7 18 3-7 7-3L3 3z"/>
          </svg>
          <div class="cursor-name-tag" id="cursor-tag-label" style="border-color: #4F46E5;">Alex (Architect)</div>
        </div>

        <!-- Flying Sticky Note (Hidden by default) -->
        <div class="flying-sticky-note" id="flying-sticky-card" style="display: none;">
          <div style="font-size: 0.68rem; font-weight: 800; opacity: 0.9;" id="flying-card-code">#FLOW-105</div>
          <div style="font-size: 0.78rem; font-weight: 700; margin-top: 2px;" id="flying-card-title">OAuth2 PKCE Provider</div>
        </div>

        <!-- 5 Columns Grid -->
        <div class="live-kanban-columns-grid">
          <!-- BACKLOG -->
          <div class="live-column" data-showcase-col="backlog">
            <div class="live-column-header">
              <span>BACKLOG</span>
              <span class="badge badge-medium" id="count-badge-backlog">2</span>
            </div>
            <div class="live-column-body" id="col-body-backlog"></div>
          </div>

          <!-- IN PROGRESS -->
          <div class="live-column" data-showcase-col="in_progress">
            <div class="live-column-header" style="background: rgba(14, 165, 233, 0.25); color: #38BDF8;">
              <span>IN PROGRESS</span>
              <span class="badge badge-low" id="count-badge-in_progress">2</span>
            </div>
            <div class="live-column-body" id="col-body-in_progress"></div>
          </div>

          <!-- REVIEW -->
          <div class="live-column" data-showcase-col="review">
            <div class="live-column-header" style="background: rgba(217, 70, 239, 0.25); color: #F0ABFC;">
              <span>REVIEW</span>
              <span class="badge badge-medium" id="count-badge-review">1</span>
            </div>
            <div class="live-column-body" id="col-body-review"></div>
          </div>

          <!-- TESTING -->
          <div class="live-column" data-showcase-col="testing">
            <div class="live-column-header" style="background: rgba(249, 115, 22, 0.25); color: #FDBA74;">
              <span>TESTING</span>
              <span class="badge badge-high" id="count-badge-testing">1</span>
            </div>
            <div class="live-column-body" id="col-body-testing"></div>
          </div>

          <!-- DONE -->
          <div class="live-column" data-showcase-col="done">
            <div class="live-column-header" style="background: rgba(16, 185, 129, 0.25); color: #6EE7B7;">
              <span>DONE ✓</span>
              <span class="badge badge-low" id="count-badge-done">1</span>
            </div>
            <div class="live-column-body" id="col-body-done"></div>
          </div>
        </div>

        <!-- Live Activity Banner -->
        <div class="live-activity-feed-bar" id="live-activity-feed-banner">
          <span style="color: var(--accent-emerald);">⚡ LIVE MOTION</span>
          <span id="live-activity-text">Team members are actively moving task notes live on the board...</span>
        </div>

      </div>
    </div>
  `;
}

function renderShowcaseCards() {
  const cols = ['backlog', 'in_progress', 'review', 'testing', 'done'];

  cols.forEach(colKey => {
    const bodyEl = document.getElementById(`col-body-${colKey}`);
    const badgeEl = document.getElementById(`count-badge-${colKey}`);
    if (!bodyEl) return;

    const colTasks = showcaseTasksState.filter(t => t.column === colKey);
    if (badgeEl) badgeEl.innerText = colTasks.length;

    bodyEl.innerHTML = colTasks.map(t => `
      <div class="live-task-card" data-card-id="${t.id}">
        <div style="font-size: 0.65rem; font-weight: 800; color: var(--accent-cyan); margin-bottom: 2px;">${t.code}</div>
        <div class="live-card-title">${t.title}</div>
        <div class="live-card-meta">
          <span>${t.assignee}</span>
          <span style="color: ${t.risk > 70 ? '#FCA5A5' : '#6EE7B7'}; font-weight: 800;">Risk ${t.risk}</span>
        </div>
      </div>
    `).join('');
  });
}

function startLiveAnimationLoop() {
  if (animationTimer) clearInterval(animationTimer);
  animationTimer = setInterval(() => {
    if (!isPaused) {
      triggerSinglePasteSequence();
    }
  }, 4200);
}

function triggerSinglePasteSequence() {
  const step = PASTING_ANIMATION_STEPS[activeStepIdx % PASTING_ANIMATION_STEPS.length];
  activeStepIdx++;

  const cursorEl = document.getElementById('showcase-live-cursor');
  const tagEl = document.getElementById('cursor-tag-label');
  const flyingNoteEl = document.getElementById('flying-sticky-card');
  const noteCodeEl = document.getElementById('flying-card-code');
  const noteTitleEl = document.getElementById('flying-card-title');
  const activityTextEl = document.getElementById('live-activity-text');

  if (!cursorEl || !flyingNoteEl) return;

  // 1. Update cursor identity & text
  if (tagEl) {
    tagEl.innerText = step.cursor.name;
    tagEl.style.borderColor = step.cursor.color;
  }
  const svgPointer = cursorEl.querySelector('.cursor-pointer-icon');
  if (svgPointer) svgPointer.setAttribute('fill', step.cursor.color);

  // 2. Locate source & target columns in DOM
  const sourceColEl = document.querySelector(`[data-showcase-col="${step.fromCol}"]`);
  const targetColEl = document.querySelector(`[data-showcase-col="${step.toCol}"]`);
  const canvasEl = document.getElementById('live-canvas-area');

  if (!sourceColEl || !targetColEl || !canvasEl) return;

  const canvasRect = canvasEl.getBoundingClientRect();
  const sourceRect = sourceColEl.getBoundingClientRect();
  const targetRect = targetColEl.getBoundingClientRect();

  // Coordinates relative to canvas
  const startX = sourceRect.left - canvasRect.left + sourceRect.width / 2 - 40;
  const startY = sourceRect.top - canvasRect.top + 60;

  const endX = targetRect.left - canvasRect.left + targetRect.width / 2 - 40;
  const endY = targetRect.top - canvasRect.top + 110;

  // Position cursor at start
  cursorEl.style.left = `${startX}px`;
  cursorEl.style.top = `${startY}px`;

  // Prepare flying note
  if (noteCodeEl) noteCodeEl.innerText = step.taskCode;
  if (noteTitleEl) noteTitleEl.innerText = step.taskTitle;
  flyingNoteEl.style.left = `${startX + 15}px`;
  flyingNoteEl.style.top = `${startY + 25}px`;
  flyingNoteEl.style.display = 'block';
  flyingNoteEl.style.opacity = '1';

  // Highlight target column
  document.querySelectorAll('.live-column').forEach(c => c.classList.remove('column-active-target'));
  targetColEl.classList.add('column-active-target');

  // 3. Move cursor & flying note to target position
  setTimeout(() => {
    cursorEl.style.left = `${endX}px`;
    cursorEl.style.top = `${endY}px`;
    flyingNoteEl.style.left = `${endX + 15}px`;
    flyingNoteEl.style.top = `${endY + 25}px`;
  }, 100);

  // 4. "Paste" card onto target column
  setTimeout(() => {
    // Hide flying note
    flyingNoteEl.style.opacity = '0';

    // Move task in state
    const tIndex = showcaseTasksState.findIndex(t => t.code === step.taskCode);
    if (tIndex !== -1) {
      showcaseTasksState[tIndex].column = step.toCol;
    } else {
      showcaseTasksState.push({
        id: `t_${Date.now()}`,
        code: step.taskCode,
        title: step.taskTitle,
        column: step.toCol,
        assignee: step.cursor.name.split(' ')[0],
        risk: Math.floor(Math.random() * 60) + 15,
        priority: 'high'
      });
    }

    renderShowcaseCards();

    // Flash just-pasted animation on newly inserted card
    const colBody = document.getElementById(`col-body-${step.toCol}`);
    if (colBody && colBody.lastElementChild) {
      colBody.lastElementChild.classList.add('just-pasted');
    }

    // Update activity banner
    if (activityTextEl) {
      activityTextEl.innerText = step.actionText;
    }

    setTimeout(() => {
      targetColEl.classList.remove('column-active-target');
      flyingNoteEl.style.display = 'none';
    }, 800);
  }, 1350);
}
