// creator-dashboard.js - Display creator earnings and rewards

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, collection, query, where, orderBy, getDocs, limit } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

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

// Navigation
document.getElementById("feedBtn").onclick = () => window.location.href = "feed.html";
document.getElementById("profileBtn").onclick = () => window.location.href = "profile.html";
document.getElementById("dashboardBtn").onclick = () => window.location.href = "creator-dashboard.html";
document.getElementById("messagesBtn").onclick = () => window.location.href = "messages.html";
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  window.location.href = "login.html";
};

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    loadDashboard(user.uid);
  }
});

async function loadDashboard(userId) {
  try {
    // Load user data
    const userDoc = await getDoc(doc(db, "users", userId));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const rewards = userData.rewards || {};
      const totalEarned = userData.totalEarned || 0;
      const pendingPayout = userData.pendingPayout || 0;
      
      // Update earnings summary
      document.getElementById("totalEarned").textContent = `$${totalEarned.toFixed(2)}`;
      document.getElementById("pendingPayout").textContent = `$${pendingPayout.toFixed(2)}`;
      
      // Calculate next payout date
      if (pendingPayout >= 25) {
        const nextPayoutDate = new Date();
        nextPayoutDate.setDate(nextPayoutDate.getDate() + 14); // 14 day buffer
        document.getElementById("nextPayout").textContent = nextPayoutDate.toLocaleDateString();
      } else {
        document.getElementById("nextPayout").textContent = `Need $${(25 - pendingPayout).toFixed(2)} more`;
      }
      
      // Update reward counts
      document.getElementById("houseCount").textContent = rewards.house || 0;
      document.getElementById("carCount").textContent = rewards.car || 0;
      document.getElementById("truckCount").textContent = rewards.truck || 0;
      document.getElementById("minivanCount").textContent = rewards.minivan || 0;
      document.getElementById("puppyCount").textContent = rewards.puppy || 0;
      document.getElementById("catCount").textContent = rewards.cat || 0;
      document.getElementById("grassCount").textContent = rewards.grass || 0;
      document.getElementById("jetCount").textContent = rewards.jet || 0;
    }
    
    // Load recent rewards
    await loadRecentRewards(userId);
    
    // Load payout history
    await loadPayoutHistory(userId);
    
    // Check Stripe connection status
    checkStripeConnection(userId);
    
  } catch (error) {
    console.error("Error loading dashboard:", error);
  }
}

async function loadRecentRewards(userId) {
  try {
    const rewardsQuery = query(
      collection(db, "rewardTransactions"),
      where("toUserId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    
    const snapshot = await getDocs(rewardsQuery);
    const rewardsList = document.getElementById("recentRewardsList");
    
    if (snapshot.empty) {
      rewardsList.innerHTML = '<p class="no-rewards">No rewards received yet</p>';
      return;
    }
    
    rewardsList.innerHTML = "";
    
    snapshot.forEach((docSnap) => {
      const reward = docSnap.data();
      const rewardItem = document.createElement("div");
      rewardItem.className = "reward-item";
      
      const date = reward.createdAt ? new Date(reward.createdAt.toMillis()).toLocaleDateString() : "Recent";
      const rewardIcon = getRewardIcon(reward.rewardType);
      
      rewardItem.innerHTML = `
        <div class="reward-info">
          <p class="reward-date">${date}</p>
          <p class="reward-sender">${rewardIcon} ${reward.quantity}x ${capitalizeFirst(reward.rewardType)} from ${reward.fromUsername}</p>
          <p class="reward-type">Status: ${reward.status}</p>
        </div>
        <div class="reward-value">+$${reward.creatorPayout.toFixed(2)}</div>
      `;
      
      rewardsList.appendChild(rewardItem);
    });
    
  } catch (error) {
    console.error("Error loading recent rewards:", error);
  }
}

async function loadPayoutHistory(userId) {
  try {
    const payoutsQuery = query(
      collection(db, "payouts"),
      where("userId", "==", userId),
      orderBy("paidAt", "desc"),
      limit(10)
    );
    
    const snapshot = await getDocs(payoutsQuery);
    const historyContainer = document.getElementById("payoutHistory");
    
    if (snapshot.empty) {
      historyContainer.innerHTML = '<p class="no-history">No payouts yet. Keep creating!</p>';
      return;
    }
    
    historyContainer.innerHTML = "";
    
    snapshot.forEach((docSnap) => {
      const payout = docSnap.data();
      const historyItem = document.createElement("div");
      historyItem.className = "history-item";
      
      const date = payout.paidAt ? new Date(payout.paidAt.toMillis()).toLocaleDateString() : "Processing";
      
      historyItem.innerHTML = `
        <div>
          <p class="history-date">${date}</p>
          <p class="payout-method">Via ${payout.method || "Stripe"}</p>
        </div>
        <p class="history-amount">$${payout.amount.toFixed(2)}</p>
      `;
      
      historyContainer.appendChild(historyItem);
    });
    
  } catch (error) {
    console.error("Error loading payout history:", error);
  }
}

function checkStripeConnection(userId) {
  // In production, this would check if user has connected Stripe
  // For now, we'll show a placeholder
  const statusEl = document.getElementById("stripeStatus");
  statusEl.textContent = "Not connected";
  statusEl.className = "setup-status not-connected";
  
  document.getElementById("stripeConnectBtn").onclick = () => {
    alert("Stripe Connect integration coming soon! This will redirect you to Stripe to set up automatic payouts.");
  };
}

function getRewardIcon(rewardType) {
  const icons = {
    house: "🏠",
    car: "🚗",
    truck: "🚚",
    minivan: "🚐",
    puppy: "🐶",
    cat: "🐱",
    grass: "🌱",
    jet: "✈️"
  };
  return icons[rewardType] || "🎁";
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Download tax forms button
document.getElementById("downloadTaxBtn").onclick = () => {
  alert("Tax forms will be available through your Stripe dashboard after your first payout. Stripe automatically handles 1099 generation and IRS filing.");
};
