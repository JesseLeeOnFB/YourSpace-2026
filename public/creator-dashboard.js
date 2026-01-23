// creator-dashboard.js - with unlock logic

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, collection, query, where, orderBy, getDocs, limit, updateDoc, increment } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
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

      // ... rest of your existing loadDashboard code (next payout calc, recent gifts, etc.)
    }
  } catch (error) {
    console.error("Error loading dashboard:", error);
  }
}

// ... rest of your file remains unchanged