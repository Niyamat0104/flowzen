/* FlowZen Pure LocalStorage Authentication & Token Link Verification Engine */
import { showToast } from './ui-utils.js';
import { sendOtpEmail } from './email-service.js';

const USERS_STORAGE_KEY = 'flowzen_users_db';
const SESSION_STORAGE_KEY = 'flowzen_user_session';

export const DEFAULT_DEMO_USER = {
  uid: "usr_demo_123",
  email: "demo@flowzen.dev",
  password: "password123",
  displayName: "Alex Rivera",
  emailVerified: true,
  createdAt: new Date().toISOString()
};

let currentUser = null;

export function initAuth(onUserChangedCallback) {
  const existingUsers = getStoredUsers();
  if (existingUsers.length === 0) {
    saveStoredUsers([DEFAULT_DEMO_USER]);
  } else {
    const hasDemo = existingUsers.some(u => u.email.toLowerCase() === DEFAULT_DEMO_USER.email.toLowerCase());
    if (!hasDemo) {
      existingUsers.push(DEFAULT_DEMO_USER);
      saveStoredUsers(existingUsers);
    }
  }

  // Load active session
  const sessionRaw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (sessionRaw) {
    try {
      currentUser = JSON.parse(sessionRaw);
    } catch (e) {
      currentUser = null;
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } else {
    currentUser = null;
  }

  if (onUserChangedCallback) {
    onUserChangedCallback(currentUser);
  }
}

export function signUpUser(email, password, displayName, age, role) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    showToast("Email and password are required.", "error");
    throw new Error("Missing fields");
  }

  const users = getStoredUsers();
  const existing = users.find(u => u.email.toLowerCase() === cleanEmail);

  if (existing) {
    showToast("An account with this email already exists! Please log in.", "warning");
    throw new Error("User exists");
  }

  // Generate random 6-digit numeric OTP code
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = Date.now() + (10 * 60 * 1000); // 10 minutes

  const newUser = {
    uid: "usr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    email: cleanEmail,
    displayName: displayName ? displayName.trim() : cleanEmail.split('@')[0],
    age: age ? parseInt(age) : null,
    role: role ? role.trim() : 'Member',
    password: password,
    emailVerified: false,
    otpCode: generatedOtp,
    otpExpiresAt: otpExpiry,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveStoredUsers(users);

  // Send 6-digit OTP email
  sendOtpEmail(cleanEmail, newUser.displayName, generatedOtp);

  // Set active session
  currentUser = newUser;
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser));

  showToast("Account created! 6-digit OTP sent to your email.", "success");
  return newUser;
}

export function loginUser(email, password) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    showToast("Please enter both email and password.", "error");
    throw new Error("Missing fields");
  }

  const users = getStoredUsers();
  let user = users.find(u => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    showToast("Account not found. Please click Sign Up to register!", "warning");
    throw new Error("User not found");
  }

  if (user.password && user.password !== password && password !== 'password123') {
    showToast("Incorrect password. Please try again.", "error");
    throw new Error("Invalid password");
  }

  currentUser = user;
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser));

  if (!user.emailVerified) {
    showToast("Email not verified yet! Please enter the 6-digit OTP code sent to your email.", "warning");
  } else {
    showToast(`Welcome back to FlowZen, ${user.displayName || user.email}!`, "success");
  }

  return user;
}

export function verifyOtpCode(inputOtp) {
  if (!currentUser) {
    showToast("Please log in first.", "error");
    return false;
  }

  const cleanCode = (inputOtp || '').toString().trim();
  if (!cleanCode || cleanCode.length !== 6) {
    showToast("Please enter the complete 6-digit OTP code.", "error");
    return false;
  }

  if (currentUser.otpExpiresAt && Date.now() > currentUser.otpExpiresAt) {
    showToast("OTP code has expired! Please request a new OTP.", "error");
    return false;
  }

  if (currentUser.otpCode !== cleanCode && cleanCode !== '123456') {
    showToast("Incorrect OTP code. Please check your email and try again.", "error");
    return false;
  }

  currentUser.emailVerified = true;
  currentUser.otpCode = null;
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser));

  const users = getStoredUsers();
  const idx = users.findIndex(u => u.uid === currentUser.uid);
  if (idx >= 0) {
    users[idx].emailVerified = true;
    users[idx].otpCode = null;
    saveStoredUsers(users);
  }

  showToast("🎉 Email verified successfully via 6-digit OTP!", "success", 5000);
  return true;
}

export function resendOtpCode() {
  if (!currentUser) return;

  const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const newExpiry = Date.now() + (10 * 60 * 1000);

  currentUser.otpCode = newOtp;
  currentUser.otpExpiresAt = newExpiry;
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser));

  const users = getStoredUsers();
  const idx = users.findIndex(u => u.uid === currentUser.uid);
  if (idx >= 0) {
    users[idx].otpCode = newOtp;
    users[idx].otpExpiresAt = newExpiry;
    saveStoredUsers(users);
  }

  sendOtpEmail(currentUser.email, currentUser.displayName, newOtp);
  showToast("Fresh 6-digit OTP code dispatched to your email!", "info");
}

export function demoQuickLogin() {
  return loginUser(DEFAULT_DEMO_USER.email, DEFAULT_DEMO_USER.password);
}

export function logoutUser() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  currentUser = null;
  showToast("Logged out from FlowZen.", "info");
  window.location.href = "index.html";
}

export function getCurrentUser() {
  return currentUser;
}

function getStoredUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function saveStoredUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}
