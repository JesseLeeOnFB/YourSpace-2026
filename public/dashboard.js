// dashboard.js - Creator Dashboard Logic
// Firebase already initialized in feed.js style – assuming same config

const db = firebase.firestore();
const auth = firebase.auth();

// ────────────────────────────────────────────────
// Wait for auth & load data
// ────────────────────────────────────────────────
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('creatorName').textContent = user.displayName || user.email.split('@')[0];

  // ────────────────────────────────────────────────
  // Realtime user document listener
  // ────────────────────────────────────────────────
  const userRef = db.collection('users').doc(user.uid);
  userRef.onSnapshot(async (snap) => {
    if (!snap.exists) return;

    const data = snap.data();

    // Basic stats
    document.getElementById('totalPosts').textContent = data.totalPosts || 0;
    document.getElementById('totalLikes').textContent = data.totalLikes || 0;
    document.getElementById('totalComments').textContent = data.totalComments || 0;
    document.getElementById('loginStreak').textContent = data.loginStreak || 0;

    // Payout section
    const payoutBalance = (data.payoutBalance || 0) / 100; // cents → dollars
    document.getElementById('pendingPayout').textContent = `$${payoutBalance.toFixed(2)}`;

    document.getElementById('totalGiftsReceived').textContent = data.totalGiftsReceived || 0;
    const totalEarned = (data.totalEarned || 0) / 100;
    document.getElementById('totalEarned').textContent = `$${totalEarned.toFixed(2)}`;

    // Stripe Connect status
    const stripeSetup = document.getElementById('stripeSetup');
    if (!data.stripeAccountId || data.stripeAccountStatus !== 'complete') {
      stripeSetup.style.display = 'block';
      document.getElementById('stripeVerifiedStatus').textContent = 
        data.stripeAccountId ? '✓ Stripe account connected' : '⚠️ Connect Stripe account';
      document.getElementById('stripeTaxStatus').textContent = 
        data.stripeTaxInfoProvided ? '✓ Tax information completed' : '⚠️ Complete tax info';
    } else {
      stripeSetup.style.display = 'none';
    }

    // Rewards (house, car, etc.) – assuming stored as numbers in user doc
    document.getElementById('houseCount').textContent = data.rewards?.house || 0;
    document.getElementById('carCount').textContent = data.rewards?.car || 0;
    document.getElementById('truckCount').textContent = data.rewards?.truck || 0;
    document.getElementById('petCount').textContent = data.rewards?.pet || 0;
    document.getElementById('diamondCount').textContent = data.rewards?.diamond || 0;
    document.getElementById('crownCount').textContent = data.rewards?.crown || 0;

    // Next payout countdown (bi-weekly – every 14 days from last payout or fixed schedule)
    updatePayoutCountdown(data.lastPayoutDate);
  }, (err) => {
    console.error("Dashboard snapshot error:", err);
  });

  // Load top posts & weekly engagement (one-time on load)
  await loadTopPosts(user.uid);
  await loadWeeklyEngagement(user.uid);
});

// ────────────────────────────────────────────────
// Next Payout Countdown (bi-weekly)
// ────────────────────────────────────────────────
function updatePayoutCountdown(lastPayoutTimestamp) {
  const now = new Date();
  let nextPayout = new Date(now);

  // Simple bi-weekly: next Wednesday or Sunday after today
  const day = now.getDay(); // 0=Sun, 3=Wed
  let daysToAdd = (day <= 3) ? (3 - day) : (10 - day); // Next Wed; if past Wed → next Sun (day 0 +7)

  if (daysToAdd === 0) daysToAdd = 7; // If today is payout day, next is +14

  nextPayout.setDate(now.getDate() + daysToAdd);
  nextPayout.setHours(0, 0, 0, 0);

  document.getElementById('nextPayoutDate').textContent = nextPayout.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  const diffDays = Math.ceil((nextPayout - now) / (1000 * 60 * 60 * 24));
  document.getElementById('payoutCountdown').textContent = `${diffDays} days`;
}

// ────────────────────────────────────────────────
// Top Posts (last 7 days, sorted by likes + comments)
// ────────────────────────────────────────────────
async function loadTopPosts(uid) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    const snapshot = await db.collection('posts')
      .where('userId', '==', uid)
      .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(sevenDaysAgo))
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const list = document.getElementById('topPostsList');
    list.innerHTML = '';

    if (snapshot.empty) {
      list.innerHTML = '<p style="text-align:center;color:#666;">No posts this week</p>';
      return;
    }

    const posts = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const score = (data.likedBy?.length || 0) + (data.comments?.length || 0);
      posts.push({ id: doc.id, ...data, score });
    });

    // Sort by score descending
    posts.sort((a, b) => b.score - a.score);

    posts.forEach(post => {
      const item = document.createElement('div');
      item.className = 'top-post-item';
      item.innerHTML = `
        <p class="post-preview">${post.text?.substring(0, 80) || 'Media post'}...</p>
        <div class="post-stats">
          <span>👍 ${post.likedBy?.length || 0}</span>
          <span>💬 ${post.comments?.length || 0}</span>
        </div>
      `;
      item.onclick = () => window.location.href = `feed.html#post-${post.id}`;
      list.appendChild(item);
    });
  } catch (err) {
    console.error("Top posts error:", err);
  }
}

// ────────────────────────────────────────────────
// Weekly Engagement (last 7 days)
// ────────────────────────────────────────────────
async function loadWeeklyEngagement(uid) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    const snapshot = await db.collection('posts')
      .where('userId', '==', uid)
      .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(sevenDaysAgo))
      .get();

    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0; // if you track shares

    snapshot.forEach(doc => {
      const data = doc.data();
      totalLikes += data.likedBy?.length || 0;
      totalComments += data.comments?.length || 0;
      // totalShares += data.shares?.length || 0; // add if you track
    });

    // Update bars (max 100% = arbitrary high number, e.g. 500 interactions)
    const maxBar = 500;
    document.getElementById('likesBar').style.width = `${Math.min((totalLikes / maxBar) * 100, 100)}%`;
    document.getElementById('likesValue').textContent = totalLikes;

    document.getElementById('commentsBar').style.width = `${Math.min((totalComments / maxBar) * 100, 100)}%`;
    document.getElementById('commentsValue').textContent = totalComments;

    document.getElementById('sharesBar').style.width = `${Math.min((totalShares / maxBar) * 100, 100)}%`;
    document.getElementById('sharesValue').textContent = totalShares;
  } catch (err) {
    console.error("Engagement error:", err);
  }
}

// ────────────────────────────────────────────────
// Navigation & Logout (same as feed.js)
// ────────────────────────────────────────────────
document.getElementById('feedNavBtn').onclick = () => window.location.href = 'feed.html';
document.getElementById('profileNavBtn').onclick = () => window.location.href = 'profile.html';
document.getElementById('messagesNavBtn').onclick = () => window.location.href = 'messages.html';
document.getElementById('notificationsNavBtn').onclick = () => window.location.href = 'notifications.html';
document.getElementById('dashboardNavBtn').onclick = () => window.location.href = 'dashboard.html';
document.getElementById('adminNavBtn').onclick = () => window.location.href = 'admin.html';
document.getElementById('contactNavBtn').onclick = () => window.location.href = 'contact.html';
document.getElementById('logoutBtn').onclick = async () => {
  await auth.signOut();
  window.location.href = 'login.html';
};

// Hamburger menu
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger.onclick = () => {
  hamburger.classList.toggle('active');
  navLinks.classList.toggle('active');
};