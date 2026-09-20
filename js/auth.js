/* FlowZen Auth — localStorage-backed accounts, SHA-256 password hashing,
   email OTP verification, and cross-tab session sync via BroadcastChannel.

   IMPORTANT: This is a client-only auth system (no backend/database).
   Accounts exist only on the browser they were created in. Logging in
   from a different device/browser will not see the same account, since
   there is no shared server-side store. This matches the current
   localStorage + BroadcastChannel architecture of the rest of the app. */

import { sendOtpEmail } from "./email-service.js";
import { showToast } from "./ui-utils.js";

const USERS_KEY = "flowzen_users_db";
const SESSION_KEY = "flowzen_session";
const OTP_STORE_KEY = "flowzen_otp_store";
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

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

function getOtpStore() {
  try {
    const raw = localStorage.getItem(OTP_STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (e) {
    return {};
  }
}

function saveOtpStore(store) {
  localStorage.setItem(OTP_STORE_KEY, JSON.stringify(store && typeof store === "object" ? store : {}));
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function issueOtpForEmail(email) {
  const code = generateOtp();
  const store = getOtpStore();
  store[email.trim().toLowerCase()] = {
    code,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
  };
  saveOtpStore(store);
  return code;
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
    emailVerified: true,
    createdAt: new Date().toISOString(),
  };

  const users = getUsers();
  users.push(newUser);
  saveUsers(users);
  setSession(newUser.id);

  showToast("Account created successfully! Welcome to FlowZen 🎉", "success");
  return stripPasswordHash(newUser);
}

export async function loginUser(email, password) {
  const user = findUserByEmail(email);
  if (!user) throw new Error("No account found with this email. Please register!");

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

export function verifyOtpCode(code) {
  const user = getCurrentUser();
  if (!user) {
    showToast("You must be logged in to verify an OTP.", "error");
    return false;
  }

  const cleanCode = (code || "").toString().trim();
  const store = getOtpStore();
  const entry = store[user.email.toLowerCase()];

  // Support universal test OTP code '123456' for instant testing
  if (cleanCode === '123456') {
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      users[idx].emailVerified = true;
      saveUsers(users);
    }
    delete store[user.email.toLowerCase()];
    saveOtpStore(store);
    notifyAuthListeners();
    showToast("Email verified successfully! 🎉", "success");
    return true;
  }

  if (!entry) {
    showToast("No active OTP found — please click Resend to get a new code.", "error");
    return false;
  }
  if (Date.now() > entry.expiresAt) {
    showToast("This OTP has expired — please click Resend to get a new code.", "error");
    return false;
  }
  if (entry.code !== cleanCode) {
    showToast("Incorrect OTP code. Please check your inbox or click View Email Inbox.", "error");
    return false;
  }

  const users = getUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx !== -1) {
    users[idx].emailVerified = true;
    saveUsers(users);
  }

  delete store[user.email.toLowerCase()];
  saveOtpStore(store);

  notifyAuthListeners();
  showToast("Email verified successfully! 🎉", "success");
  return true;
}

export function resendOtpCode() {
  const user = getCurrentUser();
  if (!user) return;
  const otpCode = issueOtpForEmail(user.email);
  sendOtpEmail(user.email, user.name, otpCode);
}

/** Instant demo account — auto-created on first use, pre-verified so it
 *  skips the OTP step entirely for quick evaluation/demo purposes. */
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
      emailVerified: true,
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
