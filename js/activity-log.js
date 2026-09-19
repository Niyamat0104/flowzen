/* TaskFlow Real-Time Activity Log Controller (LocalStorage + BroadcastChannel) */
import { getCurrentUser } from './auth.js';
import { escapeHTML, generateId } from './ui-utils.js';

const ACTIVITY_CHANNEL_NAME = 'taskflow_activity_sync';
let activityChannel = null;

try {
  activityChannel = new BroadcastChannel(ACTIVITY_CHANNEL_NAME);
} catch (e) {
  // Ignore fallback
}

export function logActivity(boardId, text, type = 'info') {
  const user = getCurrentUser();
  const activityItem = {
    id: generateId('act'),
    text,
    type,
    userId: user ? user.uid : 'anonymous',
    userName: user ? (user.displayName || user.email.split('@')[0]) : 'User',
    timestamp: new Date().toISOString()
  };

  const key = `taskflow_activity_${boardId}`;
  const items = JSON.parse(localStorage.getItem(key) || '[]');
  items.unshift(activityItem);
  localStorage.setItem(key, JSON.stringify(items.slice(0, 50)));

  if (activityChannel) {
    activityChannel.postMessage({ type: 'ACTIVITY_MUTATION', boardId });
  }
}

export function subscribeActivityFeed(boardId, containerEl) {
  if (!containerEl) return;

  const renderFeed = () => {
    const key = `taskflow_activity_${boardId}`;
    const items = JSON.parse(localStorage.getItem(key) || '[]');
    renderActivityFeed(items, containerEl);
  };

  renderFeed();

  if (activityChannel) {
    activityChannel.onmessage = (e) => {
      if (e.data && e.data.boardId === boardId) {
        renderFeed();
      }
    };
  }

  window.addEventListener('storage', (e) => {
    if (e.key === `taskflow_activity_${boardId}`) {
      renderFeed();
    }
  });
}

function renderActivityFeed(items, containerEl) {
  if (items.length === 0) {
    containerEl.innerHTML = `
      <div style="text-align: center; opacity: 0.6; padding: 1.5rem 1rem; font-size: 0.9rem;">
        No recent activity on this board yet.
      </div>
    `;
    return;
  }

  containerEl.innerHTML = items.map(item => `
    <div class="activity-item">
      <div><strong>${escapeHTML(item.userName)}</strong> ${escapeHTML(item.text)}</div>
      <div class="activity-time">${formatTimeAgo(item.timestamp)}</div>
    </div>
  `).join('');
}

function formatTimeAgo(isoStr) {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  const diffSec = Math.floor((new Date() - date) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}
