/* FlowZen LocalStorage Dashboard & Board Controller */
import { getCurrentUser } from './auth.js';
import { showToast, generateId } from './ui-utils.js';

const BOARDS_STORAGE_KEY = 'flowzen_all_boards';

const DEFAULT_COLUMNS = [
  { id: 'col_backlog', title: '📋 BACKLOG', position: 0, wipLimit: 8 },
  { id: 'col_todo', title: '📝 TO DO', position: 1, wipLimit: 7 },
  { id: 'col_in_progress', title: '⚡ IN PROGRESS', position: 2, wipLimit: 4 },
  { id: 'col_done', title: '🎉 DONE', position: 3, wipLimit: null }
];

const INITIAL_DEMO_BOARDS = [
  {
    id: "board_demo_1",
    title: "🚀 FlowZen Launch Roadmap",
    description: "Main project workspace for FlowZen Intelligent Kanban deployment",
    ownerId: "usr_demo_123",
    memberIds: ["usr_demo_123", "usr_priya", "usr_aman"],
    createdAt: new Date().toISOString()
  },
  {
    id: "board_demo_2",
    title: "🎨 Product Design System",
    description: "Sleek Neo-Brutalism UI components, color palette, typography and specs",
    ownerId: "usr_demo_123",
    memberIds: ["usr_demo_123"],
    createdAt: new Date().toISOString()
  }
];

export async function createBoard(title, description = "") {
  const user = getCurrentUser();
  if (!user) {
    showToast("Please log in to create a board", "error");
    return null;
  }

  const userId = user.id || user.uid;
  const boardId = generateId("board");
  const newBoard = {
    id: boardId,
    title: title.trim(),
    description: description.trim(),
    ownerId: userId,
    memberIds: [userId],
    createdAt: new Date().toISOString()
  };

  const existingBoards = getStoredBoards();
  existingBoards.push(newBoard);
  saveStoredBoards(existingBoards);

  // Initialize board metadata & columns
  localStorage.setItem(`flowzen_board_${boardId}`, JSON.stringify(newBoard));
  localStorage.setItem(`flowzen_cols_${boardId}`, JSON.stringify(DEFAULT_COLUMNS));
  localStorage.setItem(`flowzen_tasks_${boardId}`, JSON.stringify([]));

  showToast("Board created successfully!", "success");
  return newBoard;
}

export function fetchUserBoards(callback) {
  const user = getCurrentUser();
  if (!user) {
    if (callback) callback([]);
    return;
  }

  const userId = user.id || user.uid;
  const boards = getStoredBoards();
  const userBoards = boards.filter(b => 
    b.id === 'board_demo_1' || 
    b.id === 'board_demo_2' || 
    b.ownerId === userId || 
    (Array.isArray(b.memberIds) && b.memberIds.includes(userId))
  );
  if (callback) callback(userBoards);
}

export function deleteBoard(boardId) {
  let boards = getStoredBoards();
  boards = boards.filter(b => b.id !== boardId);
  saveStoredBoards(boards);
  localStorage.removeItem(`flowzen_board_${boardId}`);
  localStorage.removeItem(`flowzen_cols_${boardId}`);
  localStorage.removeItem(`flowzen_tasks_${boardId}`);
  showToast("Board deleted.", "info");
}

function getStoredBoards() {
  try {
    const raw = localStorage.getItem(BOARDS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_BOARDS));
      return INITIAL_DEMO_BOARDS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return INITIAL_DEMO_BOARDS;

    // Sanitize any boards with missing ownerId or memberIds
    return parsed.map(b => ({
      ...b,
      ownerId: b.ownerId || 'usr_demo_123',
      memberIds: Array.isArray(b.memberIds) && b.memberIds.length > 0 ? b.memberIds.filter(Boolean) : [b.ownerId || 'usr_demo_123']
    }));
  } catch (e) {
    return INITIAL_DEMO_BOARDS;
  }
}

function saveStoredBoards(boards) {
  localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(boards));
}
