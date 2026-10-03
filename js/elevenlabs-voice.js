/**
 * FlowZen - ElevenLabs Conversational AI Voice Agent Engine
 * 100% Native Vanilla ES6 Module
 */

import { closeModal } from './ui-utils.js';

const STORAGE_KEY_AGENT_ID = 'flowzen_elevenlabs_agent_id';

/**
 * Load ElevenLabs Conversational AI Web Component Script dynamically
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
      console.warn('ElevenLabs script failed to load.');
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
  } else {
    localStorage.removeItem(STORAGE_KEY_AGENT_ID);
  }
  return trimmed;
}

/**
 * Update and Mount ElevenLabs ConvAI Web Component
 */
export function updateWidgetElement() {
  const container = document.getElementById('elevenlabs-convai-container');
  if (!container) return;

  const agentId = getSavedAgentId();
  if (agentId) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; width: 100%; min-height: 320px; justify-content: space-between;">
        <div style="margin-bottom: 1.25rem; width: 100%; text-align: center;">
          <span style="font-size: 0.78rem; font-weight: 700; background: rgba(16, 185, 129, 0.15); color: #047857; border: 1px solid #10B981; padding: 6px 14px; border-radius: 999px; display: inline-flex; align-items: center; gap: 8px;">
            <span style="width: 8px; height: 8px; background: #10B981; border-radius: 50%; display: inline-block; box-shadow: 0 0 10px #10B981;"></span>
            LIVE ELEVENLABS CONVERSATIONAL AGENT READY
          </span>
        </div>
        
        <div class="convai-widget-wrapper" style="display: flex; justify-content: center; align-items: center; width: 100%; min-height: 220px; padding: 1rem 0;">
          <elevenlabs-convai agent-id="${escapeHTML(agentId)}"></elevenlabs-convai>
        </div>

        <div style="margin-top: 1.5rem; width: 100%; border-top: 1px dashed var(--color-border); padding-top: 1rem; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <span style="font-size: 0.8rem; color: var(--color-gray-600); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px;">
            Agent ID: <code style="font-size: 0.8rem; font-weight: 700; background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px;">${escapeHTML(agentId)}</code>
          </span>
          <button type="button" id="change-agent-id-btn" class="btn btn-xs btn-outline" style="font-size: 0.75rem; flex-shrink: 0;">
            ⚙️ Change Agent ID
          </button>
        </div>
      </div>
    `;

    const changeBtn = container.querySelector('#change-agent-id-btn');
    if (changeBtn) {
      changeBtn.addEventListener('click', () => {
        saveAgentId('');
        updateWidgetElement();
      });
    }
  } else {
    container.innerHTML = `
      <div class="card card-purple agent-id-prompt" style="padding: 1.75rem; text-align: center; border: 2px solid var(--color-black); border-radius: var(--radius-lg) !important;">
        <div style="width: 52px; height: 52px; background: #4F46E5; color: #fff; border: 2px solid #000; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 1.6rem; margin-bottom: 0.85rem; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
          🎙️
        </div>
        <h4 style="font-size: 1.2rem; font-weight: 800; margin-bottom: 0.4rem; color: var(--color-black);">Connect Your ElevenLabs Voice Agent</h4>
        <p style="font-size: 0.88rem; color: var(--color-gray-700); margin-bottom: 1.25rem; line-height: 1.5; max-width: 460px; margin-left: auto; margin-right: auto;">
          Enter your ElevenLabs <strong>Agent ID</strong> to start a live two-way voice conversation with your AI tutorial agent!
        </p>

        <form id="elevenlabs-agent-form" style="max-width: 440px; margin: 0 auto 1.25rem auto;">
          <div style="display: flex; gap: 8px;">
            <input 
              type="text" 
              id="elevenlabs-agent-id-input" 
              class="form-control" 
              placeholder="Paste Agent ID (e.g. agent_1234abcd...)" 
              required 
              style="font-size: 0.88rem; padding: 0.65rem 0.85rem;"
            />
            <button type="submit" class="btn btn-primary" style="flex-shrink: 0; font-weight: 700;">
              Connect & Start
            </button>
          </div>
        </form>

        <div style="background: rgba(255, 255, 255, 0.6); border: 1px solid var(--color-border); padding: 0.85rem; text-align: left; font-size: 0.8rem; line-height: 1.5; border-radius: var(--radius-md) !important;">
          <strong style="display: block; color: var(--color-black); margin-bottom: 4px;">🚀 How to get your Agent ID from ElevenLabs:</strong>
          <ol style="margin: 0; padding-left: 1.2rem; color: var(--color-gray-700);">
            <li>Go to <a href="https://elevenlabs.io" target="_blank" rel="noopener" style="text-decoration: underline; font-weight: 700;">elevenlabs.io</a> -> <strong>Conversational AI</strong>.</li>
            <li>Create an Agent (e.g., <em>FlowZen Tour Guide</em>) and select your voice.</li>
            <li>Copy your <strong>Agent ID</strong> from the top header and paste it above!</li>
          </ol>
        </div>
      </div>
    `;

    const form = container.querySelector('#elevenlabs-agent-form');
    const input = container.querySelector('#elevenlabs-agent-id-input');
    if (form && input) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = input.value.trim();
        if (val) {
          saveAgentId(val);
          updateWidgetElement();
          if (window.showToast) {
            window.showToast('Connected to ElevenLabs Voice Agent!', 'success');
          }
        }
      });
    }
  }
}

/**
 * Render Live ElevenLabs Voice Tutorial Modal HTML
 */
export function renderVoiceTutorialModalContent(containerEl) {
  if (!containerEl) return;

  containerEl.innerHTML = `
    <div class="modal" style="max-width: 600px; min-height: 480px; border-radius: var(--radius-xl) !important; border: 1px solid var(--color-border); box-shadow: 0 24px 64px rgba(0,0,0,0.35); overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;">
      <div class="modal-header" style="background: linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(6, 182, 212, 0.08)); border-bottom: 1px solid var(--color-border); padding: 1.15rem 1.5rem; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 38px; height: 38px; background: #4F46E5; border: 2px solid #000; display: inline-flex; align-items: center; justify-content: center; font-size: 1.25rem; color: #fff; border-radius: 8px; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);">
            🎙️
          </div>
          <div>
            <h3 class="modal-title" style="font-size: 1.15rem; margin: 0; line-height: 1.2; font-weight: 800; letter-spacing: -0.01em;">ELEVENLABS AI VOICE TUTORIAL AGENT</h3>
            <span style="font-size: 0.74rem; color: var(--color-gray-600); font-weight: 600; letter-spacing: 0.5px;">LIVE INTERACTIVE TWO-WAY VOICE CONVERSATION</span>
          </div>
        </div>
        <button class="modal-close" data-close-modal aria-label="Close" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--color-border); background: var(--bg-card); color: var(--color-black); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      <div class="modal-body" style="padding: 1.75rem 1.5rem; flex-grow: 1; display: flex; flex-direction: column; justify-content: center;">
        <!-- Live ElevenLabs Agent Widget Container -->
        <div id="elevenlabs-convai-container"></div>
      </div>

      <div class="modal-footer" style="background: var(--bg-alt); border-top: 1px solid var(--color-border); padding: 1rem 1.5rem; display: flex; align-items: center; justify-content: space-between;">
        <button type="button" class="btn btn-outline" data-close-modal id="voice-tutorial-close-btn">Close</button>
        <a href="boards.html" class="btn btn-primary" id="voice-tutorial-launch-btn">Launch Workspace</a>
      </div>
    </div>
  `;

  // Attach explicit close listeners
  containerEl.querySelectorAll('[data-close-modal], .modal-close, #voice-tutorial-close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal('tutorial-modal');
    });
  });

  updateWidgetElement();
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
    <span>AI Voice Agent</span>
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
