/* FlowZen Search, Filter & Sort Utilities */
import { isOverdue } from './date-utils.js';

/**
 * Filter tasks array based on search text, label, priority, assignee, and status
 */
export function filterTasks(tasks, { searchText = '', label = '', priority = '', assignee = '', status = '' }) {
  if (!tasks || !Array.isArray(tasks)) return [];

  return tasks.filter(task => {
    // Text search matching title, description, or assignee
    if (searchText.trim() !== '') {
      const q = searchText.toLowerCase().trim();
      const titleMatch = task.title && task.title.toLowerCase().includes(q);
      const descMatch = task.description && task.description.toLowerCase().includes(q);
      const assigneeMatch = task.assignee && task.assignee.toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !assigneeMatch) return false;
    }

    // Category / Label filter
    if (label && label !== 'all') {
      const matchCategory = task.category && task.category.toLowerCase() === label.toLowerCase();
      const matchLabels = task.labels && Array.isArray(task.labels) && task.labels.some(l => l.toLowerCase() === label.toLowerCase());
      if (!matchCategory && !matchLabels) return false;
    }

    // Priority filter
    if (priority && priority !== 'all') {
      if (task.priority !== priority) return false;
    }

    // Assignee filter
    if (assignee && assignee !== 'all') {
      if (!task.assignee || task.assignee !== assignee) return false;
    }

    // Overdue status filter
    if (status === 'overdue') {
      if (!isOverdue(task.dueDate)) return false;
    }

    return true;
  });
}

/**
 * Sort tasks array by chosen criterion
 */
export function sortTasks(tasks, sortBy = 'position') {
  if (!tasks || !Array.isArray(tasks)) return [];

  const copy = [...tasks];
  const priorityRank = { critical: 5, urgent: 4, high: 3, medium: 2, low: 1 };

  switch (sortBy) {
    case 'dueDate':
      return copy.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });

    case 'priority':
      return copy.sort((a, b) => {
        const rankA = priorityRank[a.priority] || 0;
        const rankB = priorityRank[b.priority] || 0;
        return rankB - rankA;
      });

    case 'creationDate':
      return copy.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    case 'position':
    default:
      return copy.sort((a, b) => (a.position || 0) - (b.position || 0));
  }
}
