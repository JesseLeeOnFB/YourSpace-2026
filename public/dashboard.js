// dashboard.js - Creator Dashboard Logic with Debug Logging
console.log("Dashboard.js loaded");

// Check if Firebase is loaded
if (typeof firebase === 'undefined') {
  console.error("Firebase not loaded! Make sure Firebase SDK is included before this script.");
  alert("Firebase not loaded. Check console for errors.");
}

const db = firebase.firestore();
const auth = firebase.auth();

console.log("Firebase initialized:", { db, auth });

// ────────────────────────────────────────────────
// Wait for auth & load data
// ────────────────────────────────────────────────
auth.onAuthStateChanged(async (user) => {
  console.log("Auth state changed:", user);
  
  if (!user) {
    console.log("No user logged in, redirecting to login");
    window.location.href = 'login.html';
    return;
  }

  console.log("User logged in:", user.uid, user.email);
  document.getElementById('creatorName').textContent = user.displayName || user.email.split('@')[0];

  // ────────────────────────────────────────────────
  // Realtime user document listener
  // ────────────────────────────────────────────────
  const userRef = db.collection('users').doc(user.uid);
  console.log("Setting up user document listener for:", user.uid);
  
  userRef.onSnapshot(async (snap) => {
    console.log("User snapshot received, exists:", snap.exists);
    
    if (!snap.exists) {
      console.log("User document doesn't exist, creating with defaults...");
      try {
        await userRef.set({
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
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
          stripeTaxInfoProvided: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log("Default user document created");
      } catch (err) {
        console.error("Error creating user document:", err);
      }
      return;
    }

    const data = snap.data();
    console.log("User data loaded:", data);

    // Basic stats
    const totalPosts = data.totalPosts || 0;
    const totalLikes = data.totalLikes || 0;
    const totalComments = data.totalComments || 0;
    const loginStreak = data.loginStreak || 0;
    
    console.log("Setting basic stats:", { totalPosts, totalLikes, totalComments, loginStreak });
    
    document.getElementById('totalPosts').textContent = totalPosts;
    document.getElementById('totalLikes').textContent = totalLikes;
    document.getElementById('totalComments').textContent = totalComments;
    document.getElementById('loginStreak').textContent = loginStreak;

    // Payout section
    const payoutBalance = (data.payoutBalance || 0) / 100;
    const totalGiftsReceived = data.totalGiftsReceived || 0;
    const totalEarned = (data.totalEarned || 0) / 100;
    
    console.log("Setting payout data:", { payoutBalance, totalGiftsReceived, totalEarned });
    
    document.getElementById('pendingPayout').textContent = `$${payoutBalance.toFixed(2)}`;
    
    const balanceEl = document.getElementById('payout-balance');
    if (balanceEl) {
      balanceEl.textContent = `$${payoutBalance.toFixed(2)}`;
    } else {
      console.warn("payout-balance element not found");
    }

    document.getElementById('totalGiftsReceived').textContent = totalGiftsReceived;
    document.getElementById('totalEarned').textContent = `$${totalEarned.toFixed(2)}`;

    // Stripe Connect status
    const stripeSetup = document.getElementById('stripeSetup');
    const payoutStatus = document.getElementById('payoutStatus');
    const statusText = document.getElementById('statusText');
    
    console.log("Stripe status:", {
      accountId: data.stripeAccountId,
      accountStatus: data.stripeAccountStatus,
      taxInfo: data.stripeTaxInfoProvided
    });
    
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

    // Rewards
    const rewards = data.rewards || {};
    console.log("Setting rewards:", rewards);
    
    document.getElementById('houseCount').textContent = rewards.house || 0;
    document.getElementById('carCount').textContent = rewards.car || 0;
    document.getElementById('truckCount').textContent = rewards.truck || 0;
    document.getElementById('petCount').textContent = rewards.pet || 0;
    document.getElementById('diamondCount').textContent = rewards.diamond || 0;
    document.getElementById('crownCount').textContent = rewards.crown || 0;

    // Next payout countdown
    console.log("Updating payout countdown with lastPayoutDate:", data.lastPayoutDate);
    updatePayoutCountdown(data.lastPayoutDate);
    
    // Load payout history
    console.log("Loading payout history...");
    await loadPayoutHistory(user.uid);
  }, (err) => {
    console.error("Dashboard snapshot error:", err);
    alert("Error loading dashboard: " + err.message);
  });

  // Load top posts & weekly engagement
  console.log("Loading top posts and weekly engagement...");
  await loadTopPosts(user.uid);
  await loadWeeklyEngagement(user.uid);
});

// ────────────────────────────────────────────────
// Next Payout Countdown
// ────────────────────────────────────────────────
function updatePayoutCountdown(lastPayoutTimestamp) {
  console.log("Calculating payout countdown...");
  const now = new Date();
  let nextPayout = new Date(now);
  
  const currentDay = now.getDay();
  let daysUntilNext;
  
  if (currentDay === 0) {
    daysUntilNext = 3;
  } else if (currentDay <= 3) {
    daysUntilNext = 3 - currentDay;
    if (daysUntilNext === 0 && now.getHours() >= 12) {
      daysUntilNext = 4;
    }
  } else {
    daysUntilNext = 7 - currentDay;
  }
  
  nextPayout.setDate(now.getDate() + daysUntilNext);
  nextPayout.setHours(12, 0, 0, 0);
  
  const dateStr = nextPayout.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  console.log("Next payout:", dateStr, "in", daysUntilNext, "days");
  
  document.getElementById('nextPayoutDate').textContent = dateStr;
  
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
  console.log("Loading payout history for user:", uid);
  try {
    const snapshot = await db.collection('payouts')
      .where('userId', '==', uid)
      .orderBy('payoutDate', 'desc')
      .limit(10)
      .get();
    
    console.log("Payout history loaded, count:", snapshot.size);
    
    const historyList = document.getElementById('payoutHistoryList');
    
    if (snapshot.empty) {
      historyList.innerHTML = '<p style="text-align: center; color: #65676b; padding: 2rem;">No payout history yet</p>';
      return;
    }
    
    historyList.innerHTML = '';
    
    snapshot.forEach(doc => {
      const payout = doc.data();
      console.log("Payout record:", payout);
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
// Top Posts
// ────────────────────────────────────────────────
async function loadTopPosts(uid) {
  console.log("Loading top posts for user:", uid);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    const snapshot = await db.collection('posts')
      .where('userId', '==', uid)
      .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(sevenDaysAgo))
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    console.log("Posts loaded, count:", snapshot.size);

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

    posts.sort((a, b) => b.score - a.score);
    const topPosts = posts.slice(0, 5);
    
    console.log("Top posts:", topPosts.map(p => ({ id: p.id, score: p.score })));

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
    list.innerHTML = '<p style="text-align:center;color:#f44336;padding:2rem;">Error: ' + err.message + '</p>';
  }
}

// ────────────────────────────────────────────────
// Weekly Engagement
// ────────────────────────────────────────────────
async function loadWeeklyEngagement(uid) {
  console.log("Loading weekly engagement for user:", uid);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    const snapshot = await db.collection('posts')
      .where('userId', '==', uid)
      .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(sevenDaysAgo))
      .get();

    console.log("Engagement posts loaded, count:", snapshot.size);

    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      totalLikes += data.likedBy?.length || 0;
      totalComments += data.comments?.length || 0;
      totalShares += data.shares?.length || 0;
    });

    console.log("Engagement totals:", { totalLikes, totalComments, totalShares });

    const maxValue = Math.max(totalLikes, totalComments, totalShares, 10);
    
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
console.log("Setting up navigation listeners...");

document.getElementById('feedNavBtn').onclick = () => window.location.href = 'feed.html';
document.getElementById('profileNavBtn').onclick = () => window.location.href = 'profile.html';
document.getElementById('messagesNavBtn').onclick = () => window.location.href = 'messages.html';
document.getElementById('notificationsNavBtn').onclick = () => window.location.href = 'notifications.html';
document.getElementById('dashboardNavBtn').onclick = () => window.location.href = 'dashboard.html';
document.getElementById('adminNavBtn').onclick = () => window.location.href = 'admin.html';
document.getElementById('contactNavBtn').onclick = () => window.location.href = 'contact.html';
document.getElementById('logoutBtn').onclick = async () => {
  console.log("Logging out...");
  await auth.signOut();
  window.location.href = 'login.html';
};

const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger.onclick = () => {
  hamburger.classList.toggle('active');
  navLinks.classList.toggle('active');
};

console.log("Dashboard.js initialization complete");