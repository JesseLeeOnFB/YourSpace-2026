// creator-dashboard.js - with unlock logic

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, collection, query, where, orderBy, getDocs, limit, updateDoc, increment } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-functions.js";

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
const functions = getFunctions(app);

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
    const userDoc = await getDoc(doc(db, "users", userId));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const rewards = userData.rewards || {};
      const totalEarned = userData.totalEarned || 0;
      const pendingPayout = userData.pendingPayout || 0;
      
      document.getElementById("totalEarned").textContent = `$${totalEarned.toFixed(2)}`;
      document.getElementById("pendingPayout").textContent = `$${pendingPayout.toFixed(2)}`;
      
      // NEW: Unlock logic + save to unlockedRewards
      const unlocked = [];
      if (rewards.house >= 1) unlocked.push('house');
      if (rewards.car >= 1) unlocked.push('car');
      if (rewards.truck >= 1) unlocked.push('truck');
      if (rewards.minivan >= 1) unlocked.push('minivan');
      if (rewards.puppy >= 1) unlocked.push('puppy');
      if (rewards.cat >= 1) unlocked.push('cat');
      if (rewards.grass >= 1) unlocked.push('grass');
      if (rewards.jet >= 1) unlocked.push('jet');

      // Save unlockedRewards array for yourspace-scene to read
      await updateDoc(doc(db, "users", userId), { unlockedRewards: unlocked });

      // Update reward counts in UI
      document.getElementById("houseCount").textContent = rewards.house || 0;
      document.getElementById("carCount").textContent = rewards.car || 0;
      document.getElementById("truckCount").textContent = rewards.truck || 0;
      document.getElementById("minivanCount").textContent = rewards.minivan || 0;
      document.getElementById("puppyCount").textContent = rewards.puppy || 0;
      document.getElementById("catCount").textContent = rewards.cat || 0;
      document.getElementById("grassCount").textContent = rewards.grass || 0;
      document.getElementById("jetCount").textContent = rewards.jet || 0;

      // Load recent rewards
      const recentRewardsList = document.getElementById("recentRewardsList");
      recentRewardsList.innerHTML = "";
      const rewardsQuery = query(collection(db, "rewards"), where("toUserId", "==", userId), orderBy("createdAt", "desc"), limit(10));
      const rewardsSnapshot = await getDocs(rewardsQuery);
      if (rewardsSnapshot.empty) {
        recentRewardsList.innerHTML = "<p class='no-rewards'>No rewards received yet</p>";
      } else {
        rewardsSnapshot.forEach((doc) => {
          const reward = doc.data();
          const item = document.createElement("div");
          item.className = "reward-history-item";
          item.innerHTML = `
            <div class="reward-history-info">
              <span class="reward-history-icon">${getRewardIcon(reward.type)}</span>
              <strong>$${reward.amount.toFixed(2)}</strong>
            </div>
            <span class="reward-history-time">${new Date(reward.createdAt.toMillis()).toLocaleString()}</span>
          `;
          recentRewardsList.appendChild(item);
        });
      }
      checkStripeConnection(userId);
    }
  } catch (error) {
    console.error("Error loading dashboard:", error);
  }
}

// Stripe setup
async function checkStripeConnection(userId) {
  try {
    const checkConnectStatus = httpsCallable(functions, 'checkConnectStatus');
    const result = await checkConnectStatus();
    const status = result.data.status;
    const stripeStatus = document.getElementById("stripeStatus");
    const stripeBtn = document.getElementById("stripeConnectBtn");

    if (status === "active") {
      stripeStatus.textContent = "Connected";
      stripeStatus.className = "setup-status connected";
      stripeBtn.disabled = true;
      stripeBtn.textContent = "Connected";
    } else {
      stripeStatus.textContent = "Not connected";
      stripeStatus.className = "setup-status not-connected";
      stripeBtn.onclick = async () => {
        try {
          const createConnectAccount = httpsCallable(functions, 'createConnectAccount');
          const result = await createConnectAccount({ email: auth.currentUser.email });
          window.location.href = result.data.url;
        } catch (error) {
          alert("Error starting Stripe setup: " + error.message);
        }
      };
    }
  } catch (error) {
    console.error("Error checking Stripe status:", error);
  }
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

// Download tax forms button
document.getElementById("downloadTaxBtn").onclick = () => {
  alert("Tax forms will be available through your Stripe dashboard after your first payout. Stripe automatically handles 1099 generation and IRS filing.");
};