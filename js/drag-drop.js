/* TaskFlow HTML5 Drag and Drop Engine */
import { boardState, saveTask } from './board-state.js';
import { validateColumnMove } from './dependency-system.js';
import { showToast } from './ui-utils.js';

let draggedTaskId = null;

export function initDragAndDrop() {
  document.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.task-card');
    if (!card) return;

    draggedTaskId = card.getAttribute('data-task-id');
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedTaskId);
  });

  document.addEventListener('dragend', (e) => {
    const card = e.target.closest('.task-card');
    if (card) {
      card.classList.remove('dragging');
    }
    document.querySelectorAll('.kanban-column-body').forEach(body => {
      body.classList.remove('drag-over');
    });
    draggedTaskId = null;
  });

  document.addEventListener('dragover', (e) => {
    const columnBody = e.target.closest('.kanban-column-body');
    if (!columnBody) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    columnBody.classList.add('drag-over');
  });

  document.addEventListener('dragleave', (e) => {
    const columnBody = e.target.closest('.kanban-column-body');
    if (columnBody && !columnBody.contains(e.relatedTarget)) {
      columnBody.classList.remove('drag-over');
    }
  });

  document.addEventListener('drop', async (e) => {
    const columnBody = e.target.closest('.kanban-column-body');
    if (!columnBody) return;

    e.preventDefault();
    columnBody.classList.remove('drag-over');

    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const columnId = columnBody.getAttribute('data-column-id');
    const targetColumn = boardState.columns.find(c => c.id === columnId);
    const task = boardState.tasks.find(t => t.id === taskId);

    if (!task || !targetColumn) return;

    // Phase 3 Feature Check: Validate Dependency Rules before moving
    const canMove = validateColumnMove(task, targetColumn, boardState.tasks, boardState.columns);
    if (!canMove) {
      return; // Drop rejected due to blocking dependency
    }

    // Calculate new position
    const columnTasks = boardState.tasks.filter(t => t.columnId === columnId && t.id !== taskId);
    const newPosition = columnTasks.length;

    // Update task in state & Firestore
    const updatedTask = {
      ...task,
      columnId,
      position: newPosition
    };

    await saveTask(updatedTask);
  });
}
