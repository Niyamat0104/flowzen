/* TaskFlow Phase 3 Differentiator 2: Task Dependency & Blocking System */
import { showToast } from './ui-utils.js';

/**
 * Checks if a task is currently blocked by an uncompleted parent task
 * @param {Object} task - Target task object
 * @param {Array} allTasks - All tasks on board
 * @param {Array} columns - Board columns
 * @returns {Object} { isBlocked: boolean, parentTask: Object|null }
 */
export function getDoneColumnIds(columns) {
  if (!columns || !Array.isArray(columns) || columns.length === 0) return [];
  const explicitDone = columns.filter(col => 
    col.isDoneColumn || 
    (col.title && (
      col.title.toLowerCase().includes('done') || 
      col.title.toLowerCase().includes('completed') || 
      col.title.toLowerCase().includes('finish') ||
      col.title.toLowerCase().includes('shipped') ||
      col.title.toLowerCase().includes('closed') ||
      col.title.toLowerCase().includes('hlo')
    ))
  );
  if (explicitDone.length > 0) return explicitDone.map(col => col.id);
  return [columns[columns.length - 1].id];
}

export function checkTaskDependency(task, allTasks, columns) {
  if (!task.dependsOnTaskId) {
    return { isBlocked: false, parentTask: null };
  }

  const parentTask = allTasks.find(t => t.id === task.dependsOnTaskId);
  if (!parentTask) {
    return { isBlocked: false, parentTask: null };
  }

  // Find done columns accurately
  const doneColIds = getDoneColumnIds(columns);
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
  const doneColIds = getDoneColumnIds(columns);
  const isTargetDone = doneColIds.includes(targetColumn.id);
  
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
