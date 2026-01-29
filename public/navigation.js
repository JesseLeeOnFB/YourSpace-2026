// navigation.js - ONLY navigation (NO Firebase declarations)

const ADMIN_EMAILS_NAV = ["skeeterjeeter8@gmail.com", "daniellehunt01@gmail.com"];

function setupNavigation() {
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
      await firebase.auth().signOut();
      window.location.href = 'login.html';
    };
  }
  
  if (hamburger && navLinks) {
    hamburger.onclick = () => {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('active');
    };
  }
}

function initializeAuth(requireAuth = true) {
  firebase.auth().onAuthStateChanged(user => {
    if (!user && requireAuth) {
      if (!window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
      }
    } else if (user) {
      const adminBtn = document.getElementById('adminNavBtn');
      if (adminBtn) {
        if (ADMIN_EMAILS_NAV.includes(user.email)) {
          adminBtn.style.display = 'inline-block';
        } else {
          adminBtn.style.display = 'none';
        }
      }
      if (typeof onAuthReady === 'function') {
        onAuthReady(user);
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  const publicPages = ['login.html', 'signup.html', 'about.html', 'index.html'];
  const currentPage = window.location.pathname.split('/').pop();
  const requireAuth = !publicPages.includes(currentPage);
  initializeAuth(requireAuth);
});