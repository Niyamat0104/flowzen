/* TaskFlow Phase 3 Differentiator 2: Task Dependency & Blocking System */
import { showToast } from './ui-utils.js';

/**
 * Checks if a task is currently blocked by an uncompleted parent task
 * @param {Object} task - Target task object
 * @param {Array} allTasks - All tasks on board
 * @param {Array} columns - Board columns
 * @returns {Object} { isBlocked: boolean, parentTask: Object|null }
 */
export function checkTaskDependency(task, allTasks, columns) {
  if (!task.dependsOnTaskId) {
    return { isBlocked: false, parentTask: null };
  }

  const parentTask = allTasks.find(t => t.id === task.dependsOnTaskId);
  if (!parentTask) {
    return { isBlocked: false, parentTask: null };
  }

  // Find done columns
  const doneColIds = columns
    .filter(col => col.title.toLowerCase().includes('done') || col.title.toLowerCase().includes('completed'))
    .map(col => col.id);

  const isParentDone = doneColIds.includes(parentTask.columnId);

  return {
    isBlocked: !isParentDone,
    parentTask
  };
}

/**
 * Enforces dependency rules when dropping a card into a target column
 * @returns {boolean} true if allowed, false if blocked
 */
export function validateColumnMove(task, targetColumn, allTasks, columns) {
  const isTargetDone = targetColumn.title.toLowerCase().includes('done') || targetColumn.title.toLowerCase().includes('completed');
  
  if (!isTargetDone) return true; // Moving to non-Done column is allowed

  const { isBlocked, parentTask } = checkTaskDependency(task, allTasks, columns);

  if (isBlocked && parentTask) {
    showToast(`Cannot move to Done. Task is blocked by "${parentTask.title}"`, "error", 4500);
    
    // Trigger Neo-Brutalist card shake animation
    const cardEl = document.querySelector(`[data-task-id="${task.id}"]`);
    if (cardEl) {
      cardEl.classList.add('shake');
      setTimeout(() => cardEl.classList.remove('shake'), 500);
    }
    return false;
  }

  return true;
}
