/* FlowZen Executive UI Utilities (Toasts, Sharp Modals & Helpers) */

// Toast Notifications Manager
export function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.style.borderRadius = '0px';

  const typeLabel = {
    success: 'SUCCESS',
    error: 'ERROR',
    warning: 'WARNING',
    info: 'INFO'
  };

  toast.innerHTML = `
    <span style="font-weight: 800; font-size: 0.72rem; letter-spacing: 0.06em;">[${typeLabel[type] || 'NOTICE'}]</span>
    <span>${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Open Modal by ID
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

// Close Modal by ID
export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// HTML Escape to prevent XSS
export function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Generate unique UUID / ID string
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Executive User Profile Modal Generator
export function openUserProfileModal(user, updateUserProfileFn) {
  if (!user) return;

  let modalBackdrop = document.getElementById('user-profile-modal');
  if (!modalBackdrop) {
    modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'modal-backdrop';
    modalBackdrop.id = 'user-profile-modal';
    document.body.appendChild(modalBackdrop);
  }

  const initial = (user.displayName || user.name || user.email || 'U').charAt(0).toUpperCase();

  modalBackdrop.innerHTML = `
    <div class="modal" style="max-width: 520px; border-radius: 0px !important;">
      <div class="modal-header" style="border-bottom: 1px solid var(--color-border); border-radius: 0px;">
        <h3 class="modal-title" style="letter-spacing: 0.04em;">USER PROFILE SETTINGS</h3>
        <button class="modal-close" data-close-modal aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
      </div>
      <div class="modal-body" style="padding: 1.5rem;">
        <div style="display: flex; align-items: center; gap: 1.25rem; margin-bottom: 1.5rem; background: var(--bg-card); padding: 1.25rem; border: 1px solid var(--color-border); border-radius: 0px;">
          <div style="width: 56px; height: 56px; border-radius: 0px; background: var(--primary); color: #FFF; font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; user-select: none;">
            ${escapeHTML(initial)}
          </div>
          <div style="flex: 1; overflow: hidden;">
            <h2 style="font-size: 1.2rem; font-weight: 800; margin: 0 0 4px 0; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
              ${escapeHTML(user.displayName || user.name || 'FlowZen User')}
            </h2>
            <div style="font-size: 0.85rem; color: var(--accent-gray); font-weight: 600; margin-bottom: 6px;">
              ${escapeHTML(user.email)}
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <span class="badge badge-primary" style="font-size: 0.7rem;">${escapeHTML(user.role || 'Software Engineer')}</span>
              <span class="badge badge-medium" style="font-size: 0.7rem;">ID: ${escapeHTML(user.uid || user.id)}</span>
            </div>
          </div>
        </div>

        <form id="profile-edit-form">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" class="input" id="profile-name-input" value="${escapeHTML(user.displayName || user.name || '')}" required />
          </div>

          <div class="form-group">
            <label class="form-label">Email Address (Account ID)</label>
            <input type="email" class="input" value="${escapeHTML(user.email)}" disabled style="opacity: 0.7; cursor: not-allowed;" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Role / Job Title</label>
              <input type="text" class="input" id="profile-role-input" value="${escapeHTML(user.role || 'Software Engineer')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Age</label>
              <input type="number" class="input" id="profile-age-input" min="12" max="100" value="${user.age || 25}" />
            </div>
          </div>

          <div style="background: var(--bg-alt); padding: 0.85rem 1rem; border: 1px solid var(--color-border); border-radius: 0px; margin-bottom: 1.25rem; font-size: 0.8rem; font-weight: 600; color: var(--accent-gray);">
            ACCOUNT STATUS: ACTIVE • MEMBER SINCE ${new Date(user.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }).toUpperCase()}
          </div>

          <div class="modal-footer" style="padding-top: 0.5rem; border-radius: 0px;">
            <button type="button" class="btn btn-outline" data-close-modal>Cancel</button>
            <button type="submit" class="btn btn-primary" id="save-profile-btn">Save Profile Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Attach close listener
  modalBackdrop.querySelector('[data-close-modal]').addEventListener('click', () => {
    closeModal('user-profile-modal');
  });

  // Attach form submit listener
  const form = modalBackdrop.querySelector('#profile-edit-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('profile-name-input').value;
    const role = document.getElementById('profile-role-input').value;
    const age = document.getElementById('profile-age-input').value;

    if (typeof updateUserProfileFn === 'function') {
      updateUserProfileFn(name, age, role);
    }
    closeModal('user-profile-modal');
  });

  openModal('user-profile-modal');
}

// Setup Modal backdrop click handlers globally
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });

  document.querySelectorAll('.modal-close, [data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-backdrop');
      if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });
});
