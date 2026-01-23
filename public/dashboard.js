// dashboard.js - Creator Dashboard

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, query, where, getDocs, doc, getDoc, orderBy, limit
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const ADMIN_EMAILS = [
  "skeeterjeeter8@gmail.com",
  "daniellehunt01@gmail.com"
];

function isAdmin(email) {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// Navigation
document.getElementById("feedNavBtn")?.addEventListener("click", () => {
  window.location.href = "feed.html";
});

document.getElementById("profileNavBtn")?.addEventListener("click", () => {
  window.location.href = "profile.html";
});

document.getElementById("messagesNavBtn")?.addEventListener("click", () => {
  window.location.href = "messages.html";
});

document.getElementById("notificationsNavBtn")?.addEventListener("click", () => {
  window.location.href = "notifications.html";
});

document.getElementById("dashboardNavBtn")?.addEventListener("click", () => {
  window.location.href = "dashboard.html";
});

document.getElementById("adminNavBtn")?.addEventListener("click", () => {
  window.location.href = "admin.html";
});

document.getElementById("contactNavBtn")?.addEventListener("click", () => {
  window.location.href = "contact.html";
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "login.html";
});

// Hamburger menu
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");
if (hamburger) {
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navLinks.classList.toggle("active");
  });
}

// ═══════════════════════════════════════════════════════════
// PAYOUT TRACKING SYSTEM
// ═══════════════════════════════════════════════════════════

async function loadPayoutTracking(userId, userData) {
  try {
    // Get all gifts received by this user
    const rewardsQuery = query(collection(db, "users", userId, "rewards"), orderBy("createdAt", "desc"));
    const rewardsSnapshot = await getDocs(rewardsQuery);
    
    let pendingAmount = 0;
    let totalGifts = 0;
    let totalEarnings = userData?.totalEarnings || 0;
    
    rewardsSnapshot.forEach((doc) => {
      const reward = doc.data();
      totalGifts++;
      
      // Check if this gift has been paid out
      const giftPaidOut = reward.paidOut || false;
      if (!giftPaidOut) {
        pendingAmount += reward.price || 0;
      }
    });
    
    // Update UI
    document.getElementById("pendingPayout").textContent = `$${pendingAmount.toFixed(2)}`;
    document.getElementById("totalGiftsReceived").textContent = totalGifts;
    document.getElementById("totalEarned").textContent = `$${totalEarnings.toFixed(2)}`;
    
    // Calculate next payout date (14-day cycles)
    const lastPayoutDate = userData?.lastPayoutDate || null;
    const nextPayoutInfo = calculateNextPayout(lastPayoutDate);
    
    document.getElementById("nextPayoutDate").textContent = nextPayoutInfo.dateString;
    document.getElementById("payoutCountdown").textContent = nextPayoutInfo.countdown;
    
    // Check Stripe verification status
    const stripeVerified = userData?.stripeVerified || false;
    const stripeTaxComplete = userData?.stripeTaxComplete || false;
    
    if (!stripeVerified || !stripeTaxComplete) {
      document.getElementById("stripeSetup").style.display = "block";
      document.getElementById("stripeVerifiedStatus").innerHTML = stripeVerified 
        ? "✅ Stripe account connected" 
        : "❌ Stripe account not connected";
      document.getElementById("stripeTaxStatus").innerHTML = stripeTaxComplete 
        ? "✅ Tax information completed" 
        : "❌ Tax information incomplete";
      
      document.getElementById("payoutStatus").innerHTML = `
        <div class="status-indicator warning"></div>
        <span>⚠️ Complete Stripe setup to receive payouts</span>
      `;
    } else if (pendingAmount === 0) {
      document.getElementById("payoutStatus").innerHTML = `
        <div class="status-indicator"></div>
        <span>💭 No pending payouts - start earning gifts!</span>
      `;
    } else if (pendingAmount < 10) {
      document.getElementById("payoutStatus").innerHTML = `
        <div class="status-indicator"></div>
        <span>📊 Minimum payout: $10.00 (You have $${pendingAmount.toFixed(2)})</span>
      `;
    } else {
      document.getElementById("payoutStatus").innerHTML = `
        <div class="status-indicator active"></div>
        <span>✅ Payout ready! Will be processed ${nextPayoutInfo.dateString}</span>
      `;
    }
    
    // Load payout history
    await loadPayoutHistory(userId);
    
  } catch (err) {
    console.error("Error loading payout tracking:", err);
  }
}

function calculateNextPayout(lastPayoutDate) {
  const PAYOUT_CYCLE_DAYS = 14;
  
  let nextPayoutDate;
  
  if (lastPayoutDate) {
    // Parse last payout date and add 14 days
    const lastDate = new Date(lastPayoutDate);
    nextPayoutDate = new Date(lastDate.getTime() + (PAYOUT_CYCLE_DAYS * 24 * 60 * 60 * 1000));
  } else {
    // If no previous payout, set to 14 days from now
    nextPayoutDate = new Date();
    nextPayoutDate.setDate(nextPayoutDate.getDate() + PAYOUT_CYCLE_DAYS);
  }
  
  // Calculate days until payout
  const now = new Date();
  const diffTime = nextPayoutDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let countdown;
  if (diffDays <= 0) {
    countdown = "Processing soon!";
  } else if (diffDays === 1) {
    countdown = "Tomorrow!";
  } else if (diffDays <= 7) {
    countdown = `In ${diffDays} days`;
  } else {
    countdown = `In ${diffDays} days`;
  }
  
  const dateString = nextPayoutDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  return { dateString, countdown, daysUntil: diffDays };
}

async function loadPayoutHistory(userId) {
  try {
    const payoutsQuery = query(
      collection(db, "users", userId, "payouts"),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    const payoutsSnapshot = await getDocs(payoutsQuery);
    
    const historyList = document.getElementById("payoutHistoryList");
    
    if (payoutsSnapshot.empty) {
      historyList.innerHTML = "<p style='text-align: center; color: #65676b; padding: 2rem;'>No payout history yet</p>";
      return;
    }
    
    historyList.innerHTML = "";
    
    payoutsSnapshot.forEach((doc) => {
      const payout = doc.data();
      const date = payout.createdAt ? new Date(payout.createdAt.toMillis()).toLocaleDateString() : "Unknown";
      const status = payout.status || "completed";
      const statusEmoji = status === "completed" ? "✅" : status === "pending" ? "⏳" : "❌";
      
      const item = document.createElement("div");
      item.className = "payout-history-item";
      item.innerHTML = `
        <div class="payout-history-info">
          <strong>$${payout.amount.toFixed(2)}</strong>
          <span>${date}</span>
        </div>
        <div class="payout-history-status ${status}">
          ${statusEmoji} ${status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      `;
      historyList.appendChild(item);
    });
    
  } catch (err) {
    console.error("Error loading payout history:", err);
  }
}

async function loadDashboard() {
  if (!auth.currentUser) return;
  
  const userId = auth.currentUser.uid;
  
  // Load user data
  const userDoc = await getDoc(doc(db, "users", userId));
  const userData = userDoc.data();
  
  document.getElementById("creatorName").textContent = userData?.username || auth.currentUser.email.split("@")[0];
  document.getElementById("loginStreak").textContent = userData?.loginStreak || 0;
  
  // Load posts stats
  const postsQuery = query(collection(db, "posts"), where("userId", "==", userId));
  const postsSnapshot = await getDocs(postsQuery);
  
  let totalLikes = 0;
  let totalComments = 0;
  const posts = [];
  
  for (const docSnap of postsSnapshot.docs) {
    const post = docSnap.data();
    posts.push({ id: docSnap.id, ...post });
    totalLikes += (post.likedBy || []).length;
    
    // Count comments
    const commentsQuery = query(collection(db, "posts", docSnap.id, "comments"));
    const commentsSnapshot = await getDocs(commentsQuery);
    totalComments += commentsSnapshot.size;
  }
  
  document.getElementById("totalPosts").textContent = postsSnapshot.size;
  document.getElementById("totalLikes").textContent = totalLikes;
  document.getElementById("totalComments").textContent = totalComments;
  
  // 💰 LOAD PAYOUT TRACKING
  await loadPayoutTracking(userId, userData);
  
  // Load rewards
  const rewards = userData?.rewards || {};
  document.getElementById("houseCount").textContent = rewards.house || 0;
  document.getElementById("carCount").textContent = rewards.car || 0;
  document.getElementById("truckCount").textContent = rewards.truck || 0;
  document.getElementById("petCount").textContent = rewards.pet || 0;
  document.getElementById("diamondCount").textContent = rewards.diamond || 0;
  document.getElementById("crownCount").textContent = rewards.crown || 0;
  
  // Show top posts
  posts.sort((a, b) => ((b.likedBy || []).length) - ((a.likedBy || []).length));
  const topPosts = posts.slice(0, 5);
  
  const topPostsList = document.getElementById("topPostsList");
  topPostsList.innerHTML = "";
  
  if (topPosts.length === 0) {
    topPostsList.innerHTML = "<p style='text-align:center; color:#65676b;'>No posts yet. Create your first post!</p>";
  } else {
    topPosts.forEach(post => {
      const postEl = document.createElement("div");
      postEl.className = "top-post-item";
      postEl.innerHTML = `
        <div class="top-post-text">${post.text?.substring(0, 100) || 'Post with media'}...</div>
        <div class="top-post-stats">
          <span>👍 ${(post.likedBy || []).length}</span>
          <span>💬 ${post.commentCount || 0}</span>
        </div>
      `;
      topPostsList.appendChild(postEl);
    });
  }
  
  // Engagement bars (last 7 days)
  const maxValue = Math.max(totalLikes, totalComments, 0);
  const likesPercent = maxValue > 0 ? (totalLikes / maxValue) * 100 : 0;
  const commentsPercent = maxValue > 0 ? (totalComments / maxValue) * 100 : 0;
  
  document.getElementById("likesBar").style.width = likesPercent + "%";
  document.getElementById("commentsBar").style.width = commentsPercent + "%";
  document.getElementById("sharesBar").style.width = "0%";
  
  document.getElementById("likesValue").textContent = totalLikes;
  document.getElementById("commentsValue").textContent = totalComments;
  document.getElementById("sharesValue").textContent = 0;
  
  // Add reward click animations
  document.querySelectorAll(".reward-item").forEach(item => {
    item.addEventListener("click", () => {
      item.classList.add("active");
      setTimeout(() => {
        item.classList.remove("active");
      }, 1000);
    });
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    // Show admin button if user is admin
    if (isAdmin(user.email)) {
      document.getElementById("adminNavBtn").style.display = "inline-block";
    }
    
    await loadDashboard();
  }
});