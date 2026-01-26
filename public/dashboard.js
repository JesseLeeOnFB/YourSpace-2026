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
    if (!snap.exists) {
      console.log("User document doesn't exist, creating with defaults...");
      // Initialize user document with default values
      await userRef.set({
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        loginStreak: 0,
        payoutBalance: 0,
        totalGiftsReceived: 0,
        totalEarned: 0,
        rewards: {
          house: 0,
          car: 0,
          truck: 0,
          pet: 0,
          diamond: 0,
          crown: 0
        },
        lastPayoutDate: null,
        stripeAccountId: null,
        stripeAccountStatus: null,
        stripeTaxInfoProvided: false
      }, { merge: true });
      return;
    }

    const data = snap.data();
    console.log("User data loaded:", data);

    // Basic stats
    document.getElementById('totalPosts').textContent = data.totalPosts || 0;
    document.getElementById('totalLikes').textContent = data.totalLikes || 0;
    document.getElementById('totalComments').textContent = data.totalComments || 0;
    document.getElementById('loginStreak').textContent = data.loginStreak || 0;

    // Payout section
    const payoutBalance = (data.payoutBalance || 0) / 100; // cents → dollars
    document.getElementById('pendingPayout').textContent = `$${payoutBalance.toFixed(2)}`;
    
    // Update the realtime balance display
    const balanceEl = document.getElementById('payout-balance');
    if (balanceEl) {
      balanceEl.textContent = `$${payoutBalance.toFixed(2)}`;
    }

    document.getElementById('totalGiftsReceived').textContent = data.totalGiftsReceived || 0;
    const totalEarned = (data.totalEarned || 0) / 100;
    document.getElementById('totalEarned').textContent = `$${totalEarned.toFixed(2)}`;

    // Stripe Connect status
    const stripeSetup = document.getElementById('stripeSetup');
    const payoutStatus = document.getElementById('payoutStatus');
    const statusText = document.getElementById('statusText');
    
    if (!data.stripeAccountId || data.stripeAccountStatus !== 'complete') {
      stripeSetup.style.display = 'block';
      payoutStatus.querySelector('.status-indicator').style.backgroundColor = '#f44336';
      statusText.textContent = 'Payment setup incomplete - complete Stripe verification to receive payouts';
      
      document.getElementById('stripeVerifiedStatus').textContent = 
        data.stripeAccountId ? '✓ Stripe account connected' : '⚠️ Connect Stripe account';
      document.getElementById('stripeTaxStatus').textContent = 
        data.stripeTaxInfoProvided ? '✓ Tax information completed' : '⚠️ Complete tax info';
    } else {
      stripeSetup.style.display = 'none';
      payoutStatus.querySelector('.status-indicator').style.backgroundColor = '#4caf50';
      statusText.textContent = 'Payment setup complete - ready to receive payouts';
    }

    // Rewards (house, car, etc.)
    const rewards = data.rewards || {};
    document.getElementById('houseCount').textContent = rewards.house || 0;
    document.getElementById('carCount').textContent = rewards.car || 0;
    document.getElementById('truckCount').textContent = rewards.truck || 0;
    document.getElementById('petCount').textContent = rewards.pet || 0;
    document.getElementById('diamondCount').textContent = rewards.diamond || 0;
    document.getElementById('crownCount').textContent = rewards.crown || 0;

    // Next payout countdown
    updatePayoutCountdown(data.lastPayoutDate);
    
    // Load payout history
    await loadPayoutHistory(user.uid);
  }, (err) => {
    console.error("Dashboard snapshot error:", err);
  });

  // Load top posts & weekly engagement (one-time on load)
  await loadTopPosts(user.uid);
  await loadWeeklyEngagement(user.uid);
});

// ────────────────────────────────────────────────
// Next Payout Countdown (bi-weekly on Wed & Sun)
// ────────────────────────────────────────────────
function updatePayoutCountdown(lastPayoutTimestamp) {
  const now = new Date();
  let nextPayout = new Date(now);
  
  // Bi-weekly payouts: Wednesday (day 3) and Sunday (day 0)
  const currentDay = now.getDay();
  let daysUntilNext;
  
  if (currentDay === 0) {
    // It's Sunday - next payout is Wednesday
    daysUntilNext = 3;
  } else if (currentDay <= 3) {
    // Monday, Tuesday, or Wednesday - next payout is this Wednesday
    daysUntilNext = 3 - currentDay;
    if (daysUntilNext === 0) {
      // It's Wednesday - check if payout time has passed (assuming noon cutoff)
      if (now.getHours() >= 12) {
        daysUntilNext = 4; // Next is Sunday
      }
    }
  } else {
    // Thursday, Friday, or Saturday - next payout is Sunday
    daysUntilNext = 7 - currentDay;
  }
  
  nextPayout.setDate(now.getDate() + daysUntilNext);
  nextPayout.setHours(12, 0, 0, 0); // Noon payout time
  
  // Format the date
  document.getElementById('nextPayoutDate').textContent = nextPayout.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  // Calculate days remaining
  const diffTime = nextPayout - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const countdownEl = document.getElementById('payoutCountdown');
  if (diffDays === 0) {
    countdownEl.textContent = 'Today!';
    countdownEl.style.color = '#4caf50';
  } else if (diffDays === 1) {
    countdownEl.textContent = 'Tomorrow';
    countdownEl.style.color = '#ff9800';
  } else {
    countdownEl.textContent = `${diffDays} days`;
  }
}

// ────────────────────────────────────────────────
// Load Payout History
// ────────────────────────────────────────────────
async function loadPayoutHistory(uid) {
  try {
    const snapshot = await db.collection('payouts')
      .where('userId', '==', uid)
      .orderBy('payoutDate', 'desc')
      .limit(10)
      .get();
    
    const historyList = document.getElementById('payoutHistoryList');
    
    if (snapshot.empty) {
      historyList.innerHTML = '<p style="text-align: center; color: #65676b; padding: 2rem;">No payout history yet</p>';
      return;
    }
    
    historyList.innerHTML = '';
    
    snapshot.forEach(doc => {
      const payout = doc.data();
      const amount = (payout.amount || 0) / 100;
      const date = payout.payoutDate?.toDate();
      const status = payout.status || 'pending';
      
      const item = document.createElement('div');
      item.className = 'payout-history-item';
      item.innerHTML = `
        <div class="payout-history-date">
          ${date ? date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          }) : 'Pending'}
        </div>
        <div class="payout-history-amount">$${amount.toFixed(2)}</div>
        <div class="payout-history-status status-${status}">
          ${status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      `;
      historyList.appendChild(item);
    });
  } catch (err) {
    console.error("Payout history error:", err);
  }
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
      .limit(20) // Get more posts to sort
      .get();

    const list = document.getElementById('topPostsList');
    list.innerHTML = '';

    if (snapshot.empty) {
      list.innerHTML = '<p style="text-align:center;color:#666;padding:2rem;">No posts this week</p>';
      return;
    }

    const posts = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const score = (data.likedBy?.length || 0) + (data.comments?.length || 0);
      posts.push({ id: doc.id, ...data, score });
    });

    // Sort by score descending and take top 5
    posts.sort((a, b) => b.score - a.score);
    const topPosts = posts.slice(0, 5);

    topPosts.forEach(post => {
      const item = document.createElement('div');
      item.className = 'top-post-item';
      item.innerHTML = `
        <p class="post-preview">${post.text?.substring(0, 80) || 'Media post'}${post.text?.length > 80 ? '...' : ''}</p>
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
    const list = document.getElementById('topPostsList');
    list.innerHTML = '<p style="text-align:center;color:#f44336;padding:2rem;">Error loading posts</p>';
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
    let totalShares = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      totalLikes += data.likedBy?.length || 0;
      totalComments += data.comments?.length || 0;
      totalShares += data.shares?.length || 0;
    });

    // Update bars with dynamic max based on highest value
    const maxValue = Math.max(totalLikes, totalComments, totalShares, 10); // At least 10 for scale
    
    const likesPercent = (totalLikes / maxValue) * 100;
    const commentsPercent = (totalComments / maxValue) * 100;
    const sharesPercent = (totalShares / maxValue) * 100;
    
    document.getElementById('likesBar').style.width = `${likesPercent}%`;
    document.getElementById('likesValue').textContent = totalLikes;

    document.getElementById('commentsBar').style.width = `${commentsPercent}%`;
    document.getElementById('commentsValue').textContent = totalComments;

    document.getElementById('sharesBar').style.width = `${sharesPercent}%`;
    document.getElementById('sharesValue').textContent = totalShares;
  } catch (err) {
    console.error("Engagement error:", err);
  }
}

// ────────────────────────────────────────────────
// Navigation & Logout
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