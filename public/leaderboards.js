// leaderboards.js - PUBLIC GIFTING LEADERBOARDS

const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.functions();

// ═══════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════
document.getElementById('feedNavBtn').onclick = () => window.location.href = 'feed.html';
document.getElementById('profileNavBtn').onclick = () => window.location.href = 'profile.html';
document.getElementById('messagesNavBtn').onclick = () => window.location.href = 'messages.html';
document.getElementById('notificationsNavBtn').onclick = () => window.location.href = 'notifications.html';
document.getElementById('dashboardNavBtn').onclick = () => window.location.href = 'dashboard.html';
document.getElementById('leaderboardsNavBtn').onclick = () => window.location.href = 'leaderboards.html';
document.getElementById('contactNavBtn').onclick = () => window.location.href = 'contact.html';
document.getElementById('logoutBtn').onclick = async () => {
  await auth.signOut();
  window.location.href = 'login.html';
};

const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger.onclick = () => {
  hamburger.classList.toggle('active');
  navLinks.classList.toggle('active');
};

// ═══════════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════════
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.onclick = () => {
    // Remove active from all tabs and sections
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.leaderboard-section').forEach(s => s.classList.remove('active'));
    
    // Activate clicked tab and corresponding section
    btn.classList.add('active');
    const tabName = btn.dataset.tab;
    document.getElementById(`${tabName}-section`).classList.add('active');
  };
});

// ═══════════════════════════════════════════════════════════
// LOAD LEADERBOARDS
// ═══════════════════════════════════════════════════════════
async function loadLeaderboards() {
  try {
    // Call Firebase Function
    const getLeaderboards = functions.httpsCallable('getLeaderboards');
    const result = await getLeaderboards();
    const data = result.data;
    
    // Render Top Gifters
    renderGifters(data.topGifters);
    
    // Render Top Receivers
    renderReceivers(data.topReceivers);
    
    // Render Top Levels
    renderLevels(data.topLevels);
    
  } catch (error) {
    console.error('Error loading leaderboards:', error);
    
    // Show error state
    document.getElementById('gifters-loading').innerHTML = '<p style="color: red;">Error loading leaderboard</p>';
    document.getElementById('receivers-loading').innerHTML = '<p style="color: red;">Error loading leaderboard</p>';
    document.getElementById('levels-loading').innerHTML = '<p style="color: red;">Error loading leaderboard</p>';
  }
}

// ═══════════════════════════════════════════════════════════
// RENDER TOP GIFTERS
// ═══════════════════════════════════════════════════════════
function renderGifters(gifters) {
  const loading = document.getElementById('gifters-loading');
  const list = document.getElementById('gifters-list');
  const empty = document.getElementById('gifters-empty');
  
  loading.style.display = 'none';
  
  if (!gifters || gifters.length === 0) {
    empty.style.display = 'block';
    return;
  }
  
  list.style.display = 'block';
  list.innerHTML = '';
  
  gifters.forEach((user, index) => {
    const rank = index + 1;
    const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
    const avatarURL = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&size=60&background=667eea&color=fff`;
    
    const li = document.createElement('li');
    li.className = 'leaderboard-item';
    li.onclick = () => window.location.href = `profile.html?uid=${user.userId}`;
    
    li.innerHTML = `
      <div class="rank ${rankClass}">#${rank}</div>
      <img src="${avatarURL}" alt="${user.username}" class="user-avatar">
      <div class="user-info">
        <div class="username">@${user.username}</div>
        <div class="user-stats">${user.giftCount} gifts sent</div>
      </div>
      <div class="stat-value">$${user.totalValue.toFixed(2)}</div>
    `;
    
    list.appendChild(li);
  });
}

// ═══════════════════════════════════════════════════════════
// RENDER TOP RECEIVERS
// ═══════════════════════════════════════════════════════════
function renderReceivers(receivers) {
  const loading = document.getElementById('receivers-loading');
  const list = document.getElementById('receivers-list');
  const empty = document.getElementById('receivers-empty');
  
  loading.style.display = 'none';
  
  if (!receivers || receivers.length === 0) {
    empty.style.display = 'block';
    return;
  }
  
  list.style.display = 'block';
  list.innerHTML = '';
  
  receivers.forEach((user, index) => {
    const rank = index + 1;
    const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
    const avatarURL = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&size=60&background=667eea&color=fff`;
    
    const li = document.createElement('li');
    li.className = 'leaderboard-item';
    li.onclick = () => window.location.href = `profile.html?uid=${user.userId}`;
    
    li.innerHTML = `
      <div class="rank ${rankClass}">#${rank}</div>
      <img src="${avatarURL}" alt="${user.username}" class="user-avatar">
      <div class="user-info">
        <div class="username">@${user.username}</div>
        <div class="user-stats">${user.giftCount} gifts received</div>
      </div>
      <div class="stat-value">$${user.totalEarned.toFixed(2)}</div>
    `;
    
    list.appendChild(li);
  });
}

// ═══════════════════════════════════════════════════════════
// RENDER TOP LEVELS
// ═══════════════════════════════════════════════════════════
function renderLevels(levels) {
  const loading = document.getElementById('levels-loading');
  const list = document.getElementById('levels-list');
  const empty = document.getElementById('levels-empty');
  
  loading.style.display = 'none';
  
  if (!levels || levels.length === 0) {
    empty.style.display = 'block';
    return;
  }
  
  list.style.display = 'block';
  list.innerHTML = '';
  
  levels.forEach((user, index) => {
    const rank = index + 1;
    const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
    const avatarURL = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&size=60&background=667eea&color=fff`;
    
    const li = document.createElement('li');
    li.className = 'leaderboard-item';
    li.onclick = () => window.location.href = `profile.html?uid=${user.userId}`;
    
    li.innerHTML = `
      <div class="rank ${rankClass}">#${rank}</div>
      <img src="${avatarURL}" alt="${user.username}" class="user-avatar">
      <div class="user-info">
        <div class="username">@${user.username}</div>
        <div class="user-stats">${user.xp.toLocaleString()} XP</div>
      </div>
      <div class="stat-value">Level ${user.level}</div>
    `;
    
    list.appendChild(li);
  });
}

// ═══════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    loadLeaderboards();
  }
});