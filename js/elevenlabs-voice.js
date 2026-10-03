/**
 * FlowZen - ElevenLabs AI Voice Agent & Tutorial Engine
 * 100% Native Vanilla ES6 Module
 */

const STORAGE_KEY_AGENT_ID = 'flowzen_elevenlabs_agent_id';

// Default demo agent ID or placeholder
let currentAgentId = localStorage.getItem(STORAGE_KEY_AGENT_ID) || '';

// Speech synthesis fallback state
let isVoicePlaying = false;
let currentUtterance = null;
let visualizerAnimFrame = null;

// Interactive Tour Chapters
export const TOUR_CHAPTERS = [
  {
    id: 'overview',
    title: '1. Executive Overview & Mission',
    text: "Welcome to FlowZen! FlowZen combines real-time collaborative Kanban boards with an intelligent workflow engine to help teams execute high-priority work faster.",
    question: "What is FlowZen?"
  },
  {
    id: 'risk_scoring',
    title: '2. Dynamic Task Risk Matrix (0–100)',
    text: "Our proprietary risk algorithm scores every task from 0 to 100 in real time. It evaluates deadline pressure, priority, estimated effort, and dependencies to flag high-risk tasks before bottlenecks happen.",
    question: "How does Task Risk Scoring work?"
  },
  {
    id: 'multi_view',
    title: '3. Multi-View Kanban, Calendar & Timeline',
    text: "Switch effortlessly between standard Kanban columns, an interactive Calendar view for deadline management, and a Gantt-style Visual Timeline view for project milestones.",
    question: "What views are available in FlowZen?"
  },
  {
    id: 'timer',
    title: '4. Live Focus Stopwatch & Time Tracking',
    text: "Log focus hours effortlessly with built-in task timers. FlowZen compares estimated hours against actual logged time to compute effort velocity ratios.",
    question: "How do I track time on tasks?"
  },
  {
    id: 'command_palette',
    title: '5. Command Palette (⌘K) & Data Export',
    text: "Press Command+K or Control+K anytime to open the global Command Palette. Search tasks, switch dark/light themes, or export your workspace data to JSON, CSV spreadsheets, or PDF reports.",
    question: "How do I export data or open Command Palette?"
  }
];

/**
 * Load ElevenLabs Conversational AI Web Component Script
 */
export function loadElevenLabsScript() {
  return new Promise((resolve) => {
    if (document.querySelector('script[src*="convai-widget"]')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://elevenlabs.io/convai-widget/index.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('ElevenLabs script failed to load. Fallback speech engine enabled.');
      resolve(false);
    };
    document.head.appendChild(script);
  });
}

/**
 * Get Saved ElevenLabs Agent ID
 */
export function getSavedAgentId() {
  return localStorage.getItem(STORAGE_KEY_AGENT_ID) || '';
}

/**
 * Save ElevenLabs Agent ID
 */
export function saveAgentId(agentId) {
  const trimmed = (agentId || '').trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_KEY_AGENT_ID, trimmed);
    currentAgentId = trimmed;
  } else {
    localStorage.removeItem(STORAGE_KEY_AGENT_ID);
    currentAgentId = '';
  }
  updateWidgetElement();
  return currentAgentId;
}

/**
 * Update or Mount ElevenLabs ConvAI Web Component
 */
export function updateWidgetElement() {
  const container = document.getElementById('elevenlabs-convai-container');
  if (!container) return;

  const agentId = getSavedAgentId();
  if (agentId) {
    container.innerHTML = `
      <div class="convai-widget-wrapper" style="display: flex; justify-content: center; width: 100%;">
        <elevenlabs-convai agent-id="${escapeHTML(agentId)}"></elevenlabs-convai>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="card card-purple agent-id-prompt" style="padding: 1.25rem; text-align: center;">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎙️</div>
        <h4 style="font-size: 1.05rem; margin-bottom: 0.4rem;">ElevenLabs ConvAI Agent Ready</h4>
        <p style="font-size: 0.85rem; color: var(--color-black); margin-bottom: 1rem;">
          Connect your custom ElevenLabs Agent ID to talk directly with your live voice assistant, or test out interactive tour chapters below.
        </p>
        <div style="display: flex; gap: 8px; justify-content: center; max-width: 420px; margin: 0 auto;">
          <input type="text" id="elevenlabs-agent-id-input" class="form-control" placeholder="Enter Agent ID (e.g. agent_1234...)" value="${escapeHTML(agentId)}" style="font-size: 0.85rem;" />
          <button type="button" class="btn btn-primary btn-sm" id="elevenlabs-save-agent-btn">Save ID</button>
        </div>
      </div>
    `;

    const saveBtn = container.querySelector('#elevenlabs-save-agent-btn');
    const input = container.querySelector('#elevenlabs-agent-id-input');
    if (saveBtn && input) {
      saveBtn.addEventListener('click', () => {
        saveAgentId(input.value);
        if (window.showToast) {
          window.showToast('ElevenLabs Agent ID saved!', 'success');
        }
      });
    }
  }
}

/**
 * Native Speech Synthesis Fallback Engine
 */
export function speakText(text, onEndCallback = null) {
  stopSpeech();

  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this browser.');
    if (onEndCallback) onEndCallback();
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const selectedVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel'))) || voices.find(v => v.lang.startsWith('en'));
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  isVoicePlaying = true;
  currentUtterance = utterance;
  startVisualizerAnimation();

  utterance.onend = () => {
    isVoicePlaying = false;
    currentUtterance = null;
    stopVisualizerAnimation();
    if (onEndCallback) onEndCallback();
  };

  utterance.onerror = (err) => {
    console.error('Speech error:', err);
    isVoicePlaying = false;
    currentUtterance = null;
    stopVisualizerAnimation();
    if (onEndCallback) onEndCallback();
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Stop active speech playback
 */
export function stopSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  isVoicePlaying = false;
  currentUtterance = null;
  stopVisualizerAnimation();
}

/**
 * Canvas Dynamic Soundwave Equalizer Animation
 */
let canvasCtx = null;
function startVisualizerAnimation() {
  const canvas = document.getElementById('voice-soundwave-canvas');
  if (!canvas) return;

  canvasCtx = canvas.getContext('2d');
  const width = canvas.width = canvas.parentElement.clientWidth || 300;
  const height = canvas.height = 40;

  function renderWave() {
    if (!isVoicePlaying) {
      canvasCtx.clearRect(0, 0, width, height);
      return;
    }

    canvasCtx.clearRect(0, 0, width, height);
    const barCount = 28;
    const barWidth = 4;
    const gap = (width - (barCount * barWidth)) / (barCount + 1);

    canvasCtx.fillStyle = '#4F46E5';

    for (let i = 0; i < barCount; i++) {
      const x = gap + i * (barWidth + gap);
      const randomAmplitude = Math.random() * (height - 8) + 4;
      const y = (height - randomAmplitude) / 2;
      canvasCtx.beginPath();
      if (canvasCtx.roundRect) {
        canvasCtx.roundRect(x, y, barWidth, randomAmplitude, 2);
      } else {
        canvasCtx.rect(x, y, barWidth, randomAmplitude);
      }
      canvasCtx.fill();
    }

    visualizerAnimFrame = requestAnimationFrame(renderWave);
  }

  if (visualizerAnimFrame) cancelAnimationFrame(visualizerAnimFrame);
  renderWave();
}

function stopVisualizerAnimation() {
  if (visualizerAnimFrame) {
    cancelAnimationFrame(visualizerAnimFrame);
    visualizerAnimFrame = null;
  }
  const canvas = document.getElementById('voice-soundwave-canvas');
  if (canvas && canvasCtx) {
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/**
 * Render Audio Tour Modal HTML Structure inside #tutorial-modal
 */
export function renderVoiceTutorialModalContent(containerEl) {
  if (!containerEl) return;

  const agentId = getSavedAgentId();

  containerEl.innerHTML = `
    <div class="modal" style="max-width: 680px; border-radius: 0px !important;">
      <div class="modal-header" style="background: linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(6, 182, 212, 0.08)); border-bottom: 2px solid var(--color-black);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 34px; height: 34px; background: #4F46E5; border: 2px solid #000; display: inline-flex; align-items: center; justify-content: center; font-size: 1.1rem; color: #fff; border-radius: 0px;">
            🎙️
          </div>
          <div>
            <h3 class="modal-title" style="font-size: 1.15rem; margin: 0; line-height: 1.2;">FLOWZEN AI VOICE TUTORIAL</h3>
            <span style="font-size: 0.75rem; color: var(--color-gray-600); font-weight: 600; letter-spacing: 0.5px;">POWERED BY ELEVENLABS CONVERSATIONAL AI</span>
          </div>
        </div>
        <button class="modal-close" data-close-modal aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      <div class="modal-body" style="padding: 1.5rem;">
        <!-- Top ElevenLabs Agent Container -->
        <div id="elevenlabs-convai-container" style="margin-bottom: 1.25rem;"></div>

        <!-- Voice Soundwave Canvas Visualizer -->
        <div class="voice-visualizer-box" style="background: rgba(0, 0, 0, 0.04); border: 2px solid var(--color-black); padding: 0.75rem 1rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 12px;">
          <button type="button" id="voice-tour-master-toggle-btn" class="btn btn-sm btn-primary" style="display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Play Full Tour
          </button>
          <div style="flex-grow: 1; overflow: hidden; height: 40px; display: flex; align-items: center;">
            <canvas id="voice-soundwave-canvas" style="width: 100%; height: 40px;"></canvas>
          </div>
          <button type="button" id="voice-tour-stop-btn" class="btn btn-sm btn-outline" style="flex-shrink: 0;" title="Stop Voice">
            ⏹️
          </button>
        </div>

        <!-- Transcript Subtitles Box -->
        <div id="voice-transcript-box" class="card card-purple" style="padding: 1rem; margin-bottom: 1.25rem; font-size: 0.9rem; min-height: 64px; line-height: 1.5; border-left: 4px solid #4F46E5;">
          <em>Click "Play Full Tour" or select any feature below to start the interactive AI voice walkthrough...</em>
        </div>

        <!-- Interactive Tour Chapter Cards -->
        <h4 style="font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.75rem;">Interactive Tour Chapters</h4>
        <div class="chapters-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem;">
          ${TOUR_CHAPTERS.map((ch, idx) => `
            <div class="card tour-chapter-card" data-chapter-index="${idx}" style="padding: 0.85rem; cursor: pointer; border: 2px solid var(--color-black); transition: transform 0.15s ease, background-color 0.15s ease;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong style="font-size: 0.88rem; color: var(--color-black);">${ch.title}</strong>
                <span class="btn-play-icon" style="font-size: 0.9rem;">▶️</span>
              </div>
              <p style="font-size: 0.8rem; margin: 0; color: var(--color-gray-700); line-height: 1.4;">${ch.question}</p>
            </div>
          `).join('')}
        </div>

        <!-- Quick Question Prompts -->
        <h4 style="font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.5rem;">Ask AI Voice Agent</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 1.25rem;">
          <button type="button" class="btn btn-xs btn-outline quick-ask-btn" data-ask="How does Task Risk Scoring work?">
            🎯 How does Task Risk Scoring work?
          </button>
          <button type="button" class="btn btn-xs btn-outline quick-ask-btn" data-ask="How do I export data to CSV or PDF?">
            📊 How do I export data?
          </button>
          <button type="button" class="btn btn-xs btn-outline quick-ask-btn" data-ask="What keyboard shortcuts exist?">
            ⚡ What keyboard shortcuts exist?
          </button>
        </div>

        <!-- ElevenLabs Agent Config Accordion Toggle -->
        <div style="border-top: 1px dashed var(--color-black); padding-top: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.8rem; font-weight: 600; color: var(--color-gray-700);">ElevenLabs Agent Configuration:</span>
          <button type="button" id="toggle-agent-config-btn" class="btn btn-xs btn-outline" style="font-size: 0.75rem;">
            ⚙️ ${agentId ? 'Change Agent ID' : 'Configure Agent ID'}
          </button>
        </div>
        <div id="agent-config-collapse" class="hidden" style="margin-top: 0.75rem; background: var(--color-gray-100); padding: 0.85rem; border: 2px solid #000;">
          <label style="font-size: 0.8rem; font-weight: 700; display: block; margin-bottom: 4px;">ElevenLabs Agent ID:</label>
          <div style="display: flex; gap: 6px;">
            <input type="text" id="elevenlabs-modal-agent-input" class="form-control" placeholder="e.g. agent_1234abcd..." value="${escapeHTML(agentId)}" style="font-size: 0.85rem;" />
            <button type="button" id="save-modal-agent-id-btn" class="btn btn-primary btn-sm">Save</button>
          </div>
          <small style="font-size: 0.75rem; color: var(--color-gray-600); display: block; margin-top: 4px;">
            Create your Agent on <a href="https://elevenlabs.io" target="_blank" rel="noopener" style="text-decoration: underline;">elevenlabs.io</a> -> Conversational AI to talk in real-time!
          </small>
        </div>
      </div>

      <div class="modal-footer" style="background: var(--color-gray-50); border-top: 2px solid var(--color-black);">
        <button type="button" class="btn btn-outline" data-close-modal>Close</button>
        <a href="boards.html" class="btn btn-primary" id="voice-tutorial-launch-btn">Launch Workspace</a>
      </div>
    </div>
  `;

  // Attach Event Handlers
  updateWidgetElement();

  const masterToggleBtn = containerEl.querySelector('#voice-tour-master-toggle-btn');
  const stopBtn = containerEl.querySelector('#voice-tour-stop-btn');
  const transcriptBox = containerEl.querySelector('#voice-transcript-box');
  const chapterCards = containerEl.querySelectorAll('.tour-chapter-card');
  const quickAskBtns = containerEl.querySelectorAll('.quick-ask-btn');
  const toggleConfigBtn = containerEl.querySelector('#toggle-agent-config-btn');
  const configCollapse = containerEl.querySelector('#agent-config-collapse');
  const saveModalAgentIdBtn = containerEl.querySelector('#save-modal-agent-id-btn');
  const modalAgentInput = containerEl.querySelector('#elevenlabs-modal-agent-input');

  // Master Play Full Tour Button
  if (masterToggleBtn) {
    masterToggleBtn.addEventListener('click', () => {
      playFullTourSequence(transcriptBox);
    });
  }

  // Stop Button
  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      stopSpeech();
      if (transcriptBox) {
        transcriptBox.innerHTML = `<em>Voice tour stopped. Click any chapter or "Play Full Tour" to resume.</em>`;
      }
    });
  }

  // Chapter Cards Click
  chapterCards.forEach(card => {
    card.addEventListener('click', () => {
      const index = parseInt(card.dataset.chapterIndex, 10);
      const chapter = TOUR_CHAPTERS[index];
      if (chapter) {
        playSingleChapter(chapter, card, transcriptBox);
      }
    });
  });

  // Quick Ask Buttons
  quickAskBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const askText = btn.dataset.ask;
      const matchingChapter = TOUR_CHAPTERS.find(ch => ch.question.toLowerCase().includes('risk') && askText.includes('Risk'))
        || TOUR_CHAPTERS.find(ch => ch.question.toLowerCase().includes('export') && askText.includes('export'))
        || TOUR_CHAPTERS.find(ch => ch.question.toLowerCase().includes('shortcuts') && askText.includes('shortcut'))
        || TOUR_CHAPTERS[0];

      if (transcriptBox) {
        transcriptBox.innerHTML = `<strong>User Question:</strong> "${escapeHTML(askText)}"<br/><br/><strong>AI Voice Agent:</strong> ${escapeHTML(matchingChapter.text)}`;
      }
      speakText(matchingChapter.text);
    });
  });

  // Toggle Config Accordion
  if (toggleConfigBtn && configCollapse) {
    toggleConfigBtn.addEventListener('click', () => {
      configCollapse.classList.toggle('hidden');
    });
  }

  // Save Agent ID from Modal
  if (saveModalAgentIdBtn && modalAgentInput) {
    saveModalAgentIdBtn.addEventListener('click', () => {
      saveAgentId(modalAgentInput.value);
      if (window.showToast) {
        window.showToast('ElevenLabs Agent ID saved!', 'success');
      }
      if (configCollapse) configCollapse.classList.add('hidden');
    });
  }
}

/**
 * Play single chapter audio narration
 */
function playSingleChapter(chapter, cardEl, transcriptBox) {
  stopSpeech();

  document.querySelectorAll('.tour-chapter-card').forEach(c => {
    c.style.background = '#fff';
    c.style.transform = 'none';
  });

  if (cardEl) {
    cardEl.style.background = 'rgba(79, 70, 229, 0.08)';
    cardEl.style.transform = 'translateY(-2px)';
  }

  if (transcriptBox) {
    transcriptBox.innerHTML = `<strong>${escapeHTML(chapter.title)}</strong><br/>${escapeHTML(chapter.text)}`;
  }

  speakText(chapter.text, () => {
    if (cardEl) {
      cardEl.style.background = '#fff';
      cardEl.style.transform = 'none';
    }
  });
}

/**
 * Play Full Sequential Tour
 */
function playFullTourSequence(transcriptBox) {
  let currentIndex = 0;

  function playNext() {
    if (currentIndex >= TOUR_CHAPTERS.length) {
      if (transcriptBox) {
        transcriptBox.innerHTML = `🎉 <strong>Full AI Voice Tour Complete!</strong> You are ready to launch your workspace.`;
      }
      return;
    }

    const chapter = TOUR_CHAPTERS[currentIndex];
    const cardEl = document.querySelector(`.tour-chapter-card[data-chapter-index="${currentIndex}"]`);

    document.querySelectorAll('.tour-chapter-card').forEach(c => {
      c.style.background = '#fff';
      c.style.transform = 'none';
    });

    if (cardEl) {
      cardEl.style.background = 'rgba(79, 70, 229, 0.12)';
      cardEl.style.transform = 'translateY(-2px)';
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    if (transcriptBox) {
      transcriptBox.innerHTML = `<strong>${escapeHTML(chapter.title)}</strong><br/>${escapeHTML(chapter.text)}`;
    }

    speakText(chapter.text, () => {
      currentIndex++;
      setTimeout(playNext, 600);
    });
  }

  playNext();
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
 * Create Floating AI Voice Guide Pill Button
 */
export function createFloatingVoicePill(onTriggerCallback) {
  if (document.getElementById('floating-voice-guide-btn')) return;

  const pill = document.createElement('button');
  pill.id = 'floating-voice-guide-btn';
  pill.type = 'button';
  pill.className = 'btn btn-primary';
  pill.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999;
    border-radius: 9999px !important;
    padding: 10px 18px;
    box-shadow: 0 8px 24px rgba(79, 70, 229, 0.4), var(--border-width-standard) var(--border-width-standard) 0 #000;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.88rem;
    font-weight: 700;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  `;
  pill.innerHTML = `
    <span style="font-size: 1.1rem; line-height: 1;">🎙️</span>
    <span>AI Voice Guide</span>
  `;

  pill.addEventListener('mouseenter', () => {
    pill.style.transform = 'translateY(-3px)';
  });
  pill.addEventListener('mouseleave', () => {
    pill.style.transform = 'none';
  });

  pill.addEventListener('click', () => {
    if (onTriggerCallback) onTriggerCallback();
  });

  document.body.appendChild(pill);
}

/**
 * Initialize ElevenLabs Voice System
 */
export function initElevenLabsVoice() {
  loadElevenLabsScript();
}
