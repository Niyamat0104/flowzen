/* TaskFlow LocalStorage Dashboard & Board Controller */
import { getCurrentUser } from './auth.js';
import { showToast, generateId } from './ui-utils.js';

const BOARDS_STORAGE_KEY = 'taskflow_all_boards';

const DEFAULT_COLUMNS = [
  { id: 'col_todo', title: '📋 To Do', position: 0, wipLimit: 5 },
  { id: 'col_in_progress', title: '⚡ In Progress', position: 1, wipLimit: 3 },
  { id: 'col_review', title: '🔍 Review', position: 2, wipLimit: 4 },
  { id: 'col_done', title: '🎉 Done', position: 3, wipLimit: null }
];

const INITIAL_DEMO_BOARDS = [
  {
    id: "board_demo_1",
    title: "🚀 TaskFlow Launch Roadmap",
    description: "Main project workspace for TaskFlow Neo-Brutalist Kanban deployment",
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

  const boardId = generateId("board");
  const newBoard = {
    id: boardId,
    title: title.trim(),
    description: description.trim(),
    ownerId: user.uid,
    memberIds: [user.uid],
    createdAt: new Date().toISOString()
  };

  const existingBoards = getStoredBoards();
  existingBoards.push(newBoard);
  saveStoredBoards(existingBoards);

  // Initialize board metadata & columns
  localStorage.setItem(`taskflow_board_${boardId}`, JSON.stringify(newBoard));
  localStorage.setItem(`taskflow_cols_${boardId}`, JSON.stringify(DEFAULT_COLUMNS));
  localStorage.setItem(`taskflow_tasks_${boardId}`, JSON.stringify([]));

  showToast("Board created successfully!", "success");
  return newBoard;
}

export function fetchUserBoards(callback) {
  const user = getCurrentUser();
  if (!user) return;

  const boards = getStoredBoards();
  const userBoards = boards.filter(b => b.memberIds.includes(user.uid) || b.ownerId === user.uid);
  callback(userBoards);
}

function getStoredBoards() {
  try {
    const raw = localStorage.getItem(BOARDS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_BOARDS));
      return INITIAL_DEMO_BOARDS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_DEMO_BOARDS;
  }
}

function saveStoredBoards(boards) {
  localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(boards));
}
