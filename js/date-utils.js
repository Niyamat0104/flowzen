/* TaskFlow Date Utilities & Calculations */

// Format ISO string or timestamp into readable date (e.g., "Sep 15")
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(date);
}

// Check if a given date string is past today (overdue)
export function isOverdue(dateStr) {
  if (!dateStr) return false;
  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return targetDate < today;
}

// Calculate days remaining until due date
export function getDaysRemaining(dateStr) {
  if (!dateStr) return null;
  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = targetDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Calculate task age in days since creation
export function getTaskAgeDays(createdAtIso) {
  if (!createdAtIso) return 0;
  const createdDate = new Date(createdAtIso);
  if (isNaN(createdDate.getTime())) return 0;

  const now = new Date();
  const diffTime = Math.abs(now - createdDate);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}
