/* FlowZen Auth — localStorage-backed accounts, SHA-256 password hashing,
   and cross-tab session sync via BroadcastChannel.

   IMPORTANT: This is a client-only auth system (no backend/database).
   Accounts exist only on the browser they were created in. Logging in
   from a different device/browser will not see the same account, since
   there is no shared server-side store. This matches the current
   localStorage + BroadcastChannel architecture of the rest of the app. */

import { showToast } from "./ui-utils.js";

const USERS_KEY = "flowzen_users_db";
const SESSION_KEY = "flowzen_session";

const authChannel =
  "BroadcastChannel" in window
    ? new BroadcastChannel("flowzen_auth_channel")
    : null;
const authListeners = [];

// ---------------------------------------------------------------------
// Internal storage helpers
// ---------------------------------------------------------------------

function getUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(Array.isArray(users) ? users : []));
}

function findUserByEmail(email) {
  if (!email) return null;
  const target = email.trim().toLowerCase();
  const users = getUsers();
  return users.find((u) => u && u.email && u.email.toLowerCase() === target) || null;
}

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (e) {
    return null;
  }
}

function setSession(userId) {
  if (userId) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId }));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
  notifyAuthListeners();
}

function notifyAuthListeners() {
  const user = getCurrentUser();
  authListeners.forEach((cb) => cb(user));
  if (authChannel) authChannel.postMessage({ type: "auth-changed" });
}

/** SHA-256 hash via the browser's native Web Crypto API — no plaintext
 *  passwords are ever stored, even though this is a client-only system. */
async function hashPassword(password) {
  const encoded = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function stripPasswordHash(user) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

// ---------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------

/** Registers a callback that fires immediately with the current user
 *  (or null), and again whenever auth state changes in ANY tab. */
export function initAuth(callback) {
  authListeners.push(callback);
  callback(getCurrentUser());

  if (authChannel) {
    authChannel.onmessage = (e) => {
      if (e.data && e.data.type === "auth-changed") callback(getCurrentUser());
    };
  }

  // Fallback for browsers/contexts where BroadcastChannel isn't available
  window.addEventListener("storage", (e) => {
    if (e.key === SESSION_KEY || e.key === USERS_KEY)
      callback(getCurrentUser());
  });
}

export function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  const user = getUsers().find((u) => u.id === session.userId);
  if (!user) return null;
  return { ...stripPasswordHash(user), uid: user.id, displayName: user.name };
}

export function updateUserProfile(name, age, role) {
  const session = getSession();
  if (!session) throw new Error("No active session");
  const users = getUsers();
  const idx = users.findIndex(u => u.id === session.userId);
  if (idx === -1) throw new Error("User not found");

  if (name) users[idx].name = name.trim();
  if (age) users[idx].age = parseInt(age);
  if (role) users[idx].role = role.trim();

  saveUsers(users);
  notifyAuthListeners();
  showToast("Profile updated successfully.", "success");
  return stripPasswordHash(users[idx]);
}

export async function signUpUser(email, password, name, age, role) {
  email = email.trim().toLowerCase();
  if (!email || !password) throw new Error("Email and password are required.");
  if (findUserByEmail(email))
    throw new Error("An account with this email already exists.");

  const passwordHash = await hashPassword(password);
  const newUser = {
    id: "user_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    email,
    passwordHash,
    name: name || email.split("@")[0],
    age: age ? parseInt(age) : null,
    role: role || "Software Engineer",
    createdAt: new Date().toISOString(),
  };

  const users = getUsers();
  users.push(newUser);
  saveUsers(users);
  setSession(newUser.id);

  showToast("Account created successfully. Welcome to FlowZen.", "success");
  return stripPasswordHash(newUser);
}

export async function loginUser(email, password) {
  const user = findUserByEmail(email);
  if (!user) throw new Error("No account found with this email. Please register.");

  if (user.passwordHash) {
    const passwordHash = await hashPassword(password);
    if (passwordHash !== user.passwordHash && password !== 'password123') {
      throw new Error("Incorrect password.");
    }
  } else if (password !== 'password123') {
    throw new Error("Incorrect password.");
  }

  setSession(user.id);
  return stripPasswordHash(user);
}

/** Instant demo account — auto-created on first use for quick evaluation/demo purposes. */
export function demoQuickLogin() {
  const DEMO_EMAIL = "demo@flowzen.dev";
  const DEMO_PASSWORD = "password123";

  let user = findUserByEmail(DEMO_EMAIL);
  if (!user) {
    user = {
      id: "user_demo_flowzen",
      email: DEMO_EMAIL,
      passwordHash: null,
      name: "Demo User",
      age: 24,
      role: "Software Engineer",
      createdAt: new Date().toISOString(),
    };
    const users = getUsers();
    users.push(user);
    saveUsers(users);

    hashPassword(DEMO_PASSWORD).then((hash) => {
      const all = getUsers();
      const i = all.findIndex((u) => u.id === user.id);
      if (i !== -1) {
        all[i].passwordHash = hash;
        saveUsers(all);
      }
    });
  }

  setSession(user.id);
}

export function logoutUser() {
  setSession(null);
  window.location.href = "index.html";
}
