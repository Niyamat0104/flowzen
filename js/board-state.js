/* FlowZen Reactive Board State & Real-Time Multi-Tab BroadcastChannel Engine */
import { getCurrentUser } from './auth.js';
import { showToast, generateId } from './ui-utils.js';
import { logActivity } from './activity-log.js';
import { recordCompletedTask } from './flowzen-intelligence.js';

const SYNC_CHANNEL_NAME = 'flowzen_realtime_sync';
let syncChannel = null;

try {
  syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
} catch (e) {
  console.warn("BroadcastChannel fallback active.");
}

export const boardState = {
  boardId: null,
  boardData: null,
  columns: [],
  tasks: [],
  filterState: {
    searchText: '',
    label: 'all',
    priority: 'all',
    assignee: 'all',
    status: 'all',
    sortBy: 'position'
  }
};

const stateSubscribers = [];

export function subscribeToState(callback) {
  stateSubscribers.push(callback);
}

export function notifyStateChange() {
  stateSubscribers.forEach(cb => cb(boardState));
}

export function initBoardStateSync(boardId) {
  boardState.boardId = boardId;
  loadBoardFromStorage(boardId);

  if (syncChannel) {
    syncChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'BOARD_MUTATION' && event.data.boardId === boardState.boardId) {
        loadBoardFromStorage(boardState.boardId);
      }
    };
  }

  window.addEventListener('storage', (e) => {
    if (e.key && e.key.includes(boardId)) {
      loadBoardFromStorage(boardId);
    }
  });
}

function loadBoardFromStorage(boardId) {
  const colKey = `flowzen_cols_${boardId}`;
  const taskKey = `flowzen_tasks_${boardId}`;
  const metaKey = `flowzen_board_${boardId}`;

  // Default 4 Columns Layout: BACKLOG, TO DO, IN PROGRESS, DONE
  const sampleCols = [
    { id: 'col_backlog', title: '📋 BACKLOG', position: 0, wipLimit: 8 },
    { id: 'col_todo', title: '📝 TO DO', position: 1, wipLimit: 7 },
    { id: 'col_in_progress', title: '⚡ IN PROGRESS', position: 2, wipLimit: 4 },
    { id: 'col_done', title: '🎉 DONE', position: 3, wipLimit: null }
  ];

  // Default Sample Tasks matching user mockup
  const sampleTasks = [
    {
      id: 'task_101',
      columnId: 'col_in_progress',
      title: 'Fix Authentication Bug',
      description: 'Implement pure client-side session engine and 6-digit OTP verification flow',
      priority: 'high',
      category: 'Backend',
      assignee: 'Priya Sharma',
      estimatedHours: 1,
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      labels: ['Backend', 'Security'],
      subtasks: [
        { text: 'OTP code generator', done: true },
        { text: 'Email dispatcher', done: true },
        { text: 'Auto-focus inputs', done: true }
      ],
      dependsOnTaskId: null,
      position: 0,
      createdAt: new Date(Date.now() - 172800000).toISOString()
    },
    {
      id: 'task_102',
      columnId: 'col_todo',
      title: 'Login Page Redesign',
      description: 'Update login modal UI with 1-click demo access and high-contrast Neo-Brutalist cards',
      priority: 'urgent',
      category: 'Frontend',
      assignee: 'Alex Rivera',
      estimatedHours: 4,
      dueDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
      labels: ['UI', 'Auth'],
      subtasks: [
        { text: 'Form styling', done: true },
        { text: 'Demo badge', done: false }
      ],
      dependsOnTaskId: 'task_101',
      position: 0,
      createdAt: new Date().toISOString()
    },
    {
      id: 'task_103',
      columnId: 'col_todo',
      title: 'Testing & QA Suite',
      description: 'Verify drag-and-drop validation, dependency blocking, and BroadcastChannel sync',
      priority: 'medium',
      category: 'DevOps',
      assignee: 'Aman Verma',
      estimatedHours: 3,
      dueDate: new Date(Date.now() + 259200000).toISOString().split('T')[0],
      labels: ['Testing'],
      subtasks: [
        { text: 'Cross-browser check', done: false }
      ],
      dependsOnTaskId: 'task_102',
      position: 1,
      createdAt: new Date().toISOString()
    },
    {
      id: 'task_104',
      columnId: 'col_backlog',
      title: 'Database Optimization',
      description: 'Optimize local storage caching and historical learning query performance',
      priority: 'medium',
      category: 'Backend',
      assignee: 'Alex Rivera',
      estimatedHours: 5,
      dueDate: new Date(Date.now() + 432000000).toISOString().split('T')[0],
      labels: ['Backend'],
      subtasks: [],
      dependsOnTaskId: null,
      position: 0,
      createdAt: new Date(Date.now() - 518400000).toISOString() // Aging task (>5 days)
    },
    {
      id: 'task_105',
      columnId: 'col_done',
      title: 'Navbar Component Integration',
      description: 'Create sticky Neo-Brutalist navigation with dark mode toggle and profile badge',
      priority: 'low',
      category: 'Frontend',
      assignee: 'Priya Sharma',
      estimatedHours: 2,
      actualHours: 2.2,
      dueDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      labels: ['UI'],
      subtasks: [
        { text: 'Logo badge', done: true },
        { text: 'Links styling', done: true }
      ],
      dependsOnTaskId: null,
      position: 0,
      createdAt: new Date(Date.now() - 345600000).toISOString()
    }
  ];

  const defaultMeta = {
    id: boardId,
    title: "⚡ FlowZen Workspace",
    description: "Intelligent real-time collaborative Kanban board with predictive task risk scoring",
    ownerId: "usr_demo_123",
    memberIds: ["usr_demo_123", "usr_priya", "usr_aman"]
  };

  try {
    const storedMeta = localStorage.getItem(metaKey);
    boardState.boardData = storedMeta ? JSON.parse(storedMeta) : { id: boardId, title: "⚡ FlowZen Workspace" };
    if (!storedMeta) localStorage.setItem(metaKey, JSON.stringify(boardState.boardData));
  } catch (e) {
    boardState.boardData = { id: boardId, title: "⚡ FlowZen Workspace" };
  }

  try {
    const storedCols = localStorage.getItem(colKey);
    boardState.columns = storedCols ? JSON.parse(storedCols) : sampleCols;
    if (!storedCols) localStorage.setItem(colKey, JSON.stringify(sampleCols));
  } catch (e) {
    boardState.columns = sampleCols;
  }

  try {
    const storedTasks = localStorage.getItem(taskKey);
    boardState.tasks = storedTasks ? JSON.parse(storedTasks) : (boardId.startsWith('board_demo_') ? sampleTasks : []);
    if (!storedTasks) localStorage.setItem(taskKey, JSON.stringify(boardState.tasks));
  } catch (e) {
    boardState.tasks = [];
  }

  notifyStateChange();
}

function broadcastMutation() {
  if (syncChannel && boardState.boardId) {
    syncChannel.postMessage({ type: 'BOARD_MUTATION', boardId: boardState.boardId });
  }
}

export async function saveTask(taskData, actualHoursInput = null) {
  const user = getCurrentUser();
  const now = new Date().toISOString();

  const taskId = taskData.id || generateId('task');
  const payload = {
    ...taskData,
    id: taskId,
    lastEditedAt: now,
    lastEditedBy: user ? user.uid : 'anonymous',
    createdAt: taskData.createdAt || now
  };

  const taskKey = `flowzen_tasks_${boardState.boardId}`;
  const idx = boardState.tasks.findIndex(t => t.id === taskId);
  
  const targetCol = boardState.columns.find(c => c.id === payload.columnId);
  const isDoneCol = targetCol && (targetCol.title.toLowerCase().includes('done') || targetCol.title.toLowerCase().includes('completed'));

  if (isDoneCol) {
    recordCompletedTask(payload, actualHoursInput);
  }

  if (idx >= 0) {
    boardState.tasks[idx] = payload;
  } else {
    boardState.tasks.push(payload);
  }

  localStorage.setItem(taskKey, JSON.stringify(boardState.tasks));
  logActivity(boardState.boardId, `updated task "${payload.title}"`);
  
  notifyStateChange();
  broadcastMutation();
  return payload;
}

export async function deleteTask(taskId) {
  const task = boardState.tasks.find(t => t.id === taskId);
  const taskKey = `flowzen_tasks_${boardState.boardId}`;
  
  boardState.tasks = boardState.tasks.filter(t => t.id !== taskId);
  localStorage.setItem(taskKey, JSON.stringify(boardState.tasks));
  
  if (task) logActivity(boardState.boardId, `deleted task "${task.title}"`);
  
  notifyStateChange();
  broadcastMutation();
}

export async function saveColumn(columnData) {
  const colId = columnData.id || generateId('col');
  const payload = { ...columnData, id: colId };
  const colKey = `flowzen_cols_${boardState.boardId}`;

  const idx = boardState.columns.findIndex(c => c.id === colId);
  if (idx >= 0) boardState.columns[idx] = payload;
  else boardState.columns.push(payload);

  localStorage.setItem(colKey, JSON.stringify(boardState.columns));
  logActivity(boardState.boardId, `updated column "${payload.title}"`);

  notifyStateChange();
  broadcastMutation();
  return payload;
}

export async function deleteColumn(colId) {
  const colKey = `flowzen_cols_${boardState.boardId}`;
  boardState.columns = boardState.columns.filter(c => c.id !== colId);
  localStorage.setItem(colKey, JSON.stringify(boardState.columns));
  
  notifyStateChange();
  broadcastMutation();
}
