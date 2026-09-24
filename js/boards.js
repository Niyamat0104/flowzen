/* FlowZen LocalStorage Dashboard & Board Controller */
import { getCurrentUser } from './auth.js';
import { showToast, generateId } from './ui-utils.js';
import { logActivity } from './activity-log.js';

const BOARDS_STORAGE_KEY = 'flowzen_all_boards';

const DEFAULT_COLUMNS = [
  { id: 'col_backlog', title: 'BACKLOG', position: 0, wipLimit: 8 },
  { id: 'col_todo', title: 'TO DO', position: 1, wipLimit: 7 },
  { id: 'col_in_progress', title: 'IN PROGRESS', position: 2, wipLimit: 4 },
  { id: 'col_done', title: 'DONE', position: 3, wipLimit: null }
];

export const MEMBER_AVATAR_COLORS = [
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#6366F1', // Indigo
  '#EF4444', // Red
  '#3B82F6'  // Blue
];

const INITIAL_DEMO_BOARDS = [
  {
    id: "board_demo_1",
    title: "FlowZen Launch Roadmap",
    description: "Main project workspace for FlowZen Intelligent Kanban deployment",
    projectType: "Software Development",
    targetDeadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    ownerId: "usr_owner",
    team: [
      {
        id: "usr_owner",
        name: "Workspace Owner",
        email: "owner@flowzen.io",
        role: "Owner",
        addedAt: new Date().toISOString(),
        color: MEMBER_AVATAR_COLORS[0]
      }
    ],
    memberIds: ["usr_owner"],
    createdAt: new Date().toISOString()
  },
  {
    id: "board_demo_2",
    title: "Product Design System",
    description: "Executive UI components, color palette, typography and specs",
    projectType: "Product Design",
    targetDeadline: null,
    ownerId: "usr_owner",
    team: [
      {
        id: "usr_owner",
        name: "Workspace Owner",
        email: "owner@flowzen.io",
        role: "Owner",
        addedAt: new Date().toISOString(),
        color: MEMBER_AVATAR_COLORS[0]
      }
    ],
    memberIds: ["usr_owner"],
    createdAt: new Date().toISOString()
  }
];

export async function createBoard(title, description = "", projectType = "Software Development", targetDeadline = null, rawTeamMembers = []) {
  const user = getCurrentUser();
  if (!user) {
    showToast("Please log in to create a board", "error");
    return null;
  }

  const userId = user.id || user.uid;
  const boardId = generateId("board");
  const now = new Date().toISOString();

  // Process team members
  const team = [];
  
  // 1. Creator row (Mandatory Owner - always the logged in user)
  const creatorName = user.name || user.displayName || (user.email ? user.email.split('@')[0] : "Board Owner");
  team.push({
    id: userId,
    name: creatorName,
    email: user.email || null,
    role: "Owner",
    addedAt: now,
    color: MEMBER_AVATAR_COLORS[0]
  });

  // 2. Additional optional team member rows added by user
  if (Array.isArray(rawTeamMembers)) {
    rawTeamMembers.forEach((m, idx) => {
      if (!m.name || !m.name.trim()) return;
      team.push({
        id: generateId("member"),
        name: m.name.trim(),
        email: m.email ? m.email.trim() : null,
        role: m.role || "Member",
        addedAt: now,
        color: MEMBER_AVATAR_COLORS[(idx + 1) % MEMBER_AVATAR_COLORS.length]
      });
    });
  }

  const memberIds = team.map(m => m.id);

  const newBoard = {
    id: boardId,
    title: title.trim(),
    description: description ? description.trim() : "",
    projectType,
    targetDeadline: targetDeadline || null,
    ownerId: userId,
    team,
    memberIds,
    createdAt: now
  };

  const boards = getStoredBoards();
  boards.unshift(newBoard);
  saveStoredBoards(boards);

  logActivity(boardId, `Created project board "${newBoard.title}" (${projectType}) with ${team.length} team members`);
  showToast(`Board "${newBoard.title}" created successfully!`, "success");
  return newBoard;
}

export function getBoardById(boardId) {
  const boards = getStoredBoards();
  const board = boards.find(b => b.id === boardId);
  return board ? sanitizeBoardData(board) : null;
}

export function saveBoardMetadata(updatedBoard) {
  const boards = getStoredBoards();
  const index = boards.findIndex(b => b.id === updatedBoard.id);
  const sanitized = sanitizeBoardData(updatedBoard);
  if (index !== -1) {
    boards[index] = sanitized;
  } else {
    boards.unshift(sanitized);
  }
  saveStoredBoards(boards);
  return sanitized;
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

export function sanitizeBoardData(board) {
  if (!board) return null;

  const currentUser = getCurrentUser();
  const loggedInId = currentUser ? (currentUser.id || currentUser.uid) : null;
  const loggedInName = currentUser ? (currentUser.name || currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : "Workspace Owner")) : "Workspace Owner";
  const loggedInEmail = currentUser ? currentUser.email : "owner@flowzen.io";

  let ownerId = board.ownerId;
  let team = Array.isArray(board.team) && board.team.length > 0 ? board.team : null;

  // Filter out any legacy fake demo team members
  const DEMO_FAKE_IDS = ['usr_priya', 'usr_aman'];
  const DEMO_FAKE_NAMES = ['Priya Sharma', 'Aman Verma', 'Alex Rivera', 'Elena Rostova'];

  if (team) {
    team = team.filter(m => {
      if (m.role === 'Owner') return true;
      if (DEMO_FAKE_IDS.includes(m.id) || DEMO_FAKE_NAMES.includes(m.name)) {
        return false;
      }
      return true;
    });
  }

  if (!team || team.length === 0) {
    team = [
      {
        id: loggedInId || ownerId || 'usr_owner',
        name: loggedInName,
        email: loggedInEmail,
        role: 'Owner',
        addedAt: board.createdAt || new Date().toISOString(),
        color: MEMBER_AVATAR_COLORS[0]
      }
    ];
    ownerId = team[0].id;
  } else {
    // If a user is logged in, ALWAYS map the board Owner to the logged-in user
    if (loggedInId) {
      ownerId = loggedInId;
      let ownerRowIdx = team.findIndex(m => m.role === 'Owner');
      if (ownerRowIdx === -1) ownerRowIdx = 0;

      team[ownerRowIdx] = {
        ...team[ownerRowIdx],
        id: loggedInId,
        name: loggedInName,
        email: loggedInEmail || team[ownerRowIdx].email,
        role: 'Owner',
        color: team[ownerRowIdx].color || MEMBER_AVATAR_COLORS[0]
      };
    }

    team = team.map((m, idx) => ({
      ...m,
      id: m.id || `member_${Date.now()}_${idx}`,
      color: m.color || MEMBER_AVATAR_COLORS[idx % MEMBER_AVATAR_COLORS.length]
    }));
  }

  const memberIds = team.map(m => m.id);
  return {
    ...board,
    projectType: board.projectType || "Software Development",
    targetDeadline: board.targetDeadline || null,
    ownerId: ownerId || loggedInId || 'usr_owner',
    team,
    memberIds
  };
}

function getStoredBoards() {
  try {
    const raw = localStorage.getItem(BOARDS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_BOARDS));
      return INITIAL_DEMO_BOARDS.map(sanitizeBoardData);
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return INITIAL_DEMO_BOARDS.map(sanitizeBoardData);

    return parsed.map(sanitizeBoardData);
  } catch (e) {
    return INITIAL_DEMO_BOARDS.map(sanitizeBoardData);
  }
}

function saveStoredBoards(boards) {
  localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(boards));
}


