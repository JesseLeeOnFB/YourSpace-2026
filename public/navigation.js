// navigation.js - UNIVERSAL NAVIGATION FOR ALL PAGES
// Include this file in ALL HTML pages after Firebase scripts

const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();

const ADMIN_EMAILS = ["skeeterjeeter8@gmail.com", "daniellehunt01@gmail.com"];

// ═══════════════════════════════════════════════════════════
// NAVIGATION FUNCTIONS
// ═══════════════════════════════════════════════════════════

function setupNavigation() {
  // Get all navigation buttons
  const feedBtn = document.getElementById('feedNavBtn');
  const profileBtn = document.getElementById('profileNavBtn');
  const messagesBtn = document.getElementById('messagesNavBtn');
  const notificationsBtn = document.getElementById('notificationsNavBtn');
  const dashboardBtn = document.getElementById('dashboardNavBtn');
  const leaderboardsBtn = document.getElementById('leaderboardsNavBtn');
  const adminBtn = document.getElementById('adminNavBtn');
  const contactBtn = document.getElementById('contactNavBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  
  // Set up click handlers
  if (feedBtn) feedBtn.onclick = () => window.location.href = 'feed.html';
  if (profileBtn) profileBtn.onclick = () => window.location.href = 'profile.html';
  if (messagesBtn) messagesBtn.onclick = () => window.location.href = 'messages.html';
  if (notificationsBtn) notificationsBtn.onclick = () => window.location.href = 'notifications.html';
  if (dashboardBtn) dashboardBtn.onclick = () => window.location.href = 'dashboard.html';
  if (leaderboardsBtn) leaderboardsBtn.onclick = () => window.location.href = 'leaderboards.html';
  if (adminBtn) adminBtn.onclick = () => window.location.href = 'admin.html';
  if (contactBtn) contactBtn.onclick = () => window.location.href = 'contact.html';
  
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await auth.signOut();
      window.location.href = 'login.html';
    };
  }
  
  // Hamburger menu
  if (hamburger && navLinks) {
    hamburger.onclick = () => {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('active');
    };
  }
}

// ═══════════════════════════════════════════════════════════
// AUTH STATE HANDLER
// ═══════════════════════════════════════════════════════════

function initializeAuth(requireAuth = true) {
  auth.onAuthStateChanged(user => {
    if (!user && requireAuth) {
      // Not logged in, redirect to login
      if (!window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
      }
    } else if (user) {
      // Logged in, show/hide admin button
      const adminBtn = document.getElementById('adminNavBtn');
      if (adminBtn) {
        if (ADMIN_EMAILS.includes(user.email)) {
          adminBtn.style.display = 'inline-block';
        } else {
          adminBtn.style.display = 'none';
        }
      }
      
      // Trigger page-specific callback if exists
      if (typeof onAuthReady === 'function') {
        onAuthReady(user);
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════
// AUTO-INITIALIZE ON PAGE LOAD
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  
  // Check if page requires auth (all pages except login/signup)
  const publicPages = ['login.html', 'signup.html', 'about.html', 'index.html'];
  const currentPage = window.location.pathname.split('/').pop();
  const requireAuth = !publicPages.includes(currentPage);
  
  initializeAuth(requireAuth);
});