// yourspace-scene.js - Build Your Visual Space - FULLY FIXED

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, updateDoc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

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

const UNLOCK_ORDER = ['house', 'grass', 'driveway', 'car', 'trees', 'truck', 'minivan', 'jet'];

// Universal navigation handlers
document.getElementById("feedNavBtn")?.addEventListener("click", () => {
  window.location.href = "feed.html";
});

document.getElementById("profileNavBtn")?.addEventListener("click", () => {
  window.location.href = "profile.html";
});

document.getElementById("messagesNavBtn")?.addEventListener("click", () => {
  window.location.href = "messages.html";
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
  await signOut(auth);
  window.location.href = "login.html";
});

// Hamburger menu functionality
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");

if (hamburger && navLinks) {
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navLinks.classList.toggle("active");
  });
  
  navLinks.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      hamburger.classList.remove("active");
      navLinks.classList.remove("active");
    });
  });
  
  document.addEventListener("click", (e) => {
    if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
      hamburger.classList.remove("active");
      navLinks.classList.remove("active");
    }
  });
}

// Back button
document.getElementById("backToDashboard")?.addEventListener("click", () => {
  window.location.href = "dashboard.html";
});

// Generate stars
function createStars() {
  const starsContainer = document.getElementById("stars");
  if (!starsContainer) return;
  
  for (let i = 0; i < 100; i++) {
    const star = document.createElement("div");
    star.style.position = "absolute";
    star.style.width = "2px";
    star.style.height = "2px";
    star.style.background = "#fff";
    star.style.borderRadius = "50%";
    star.style.left = Math.random() * 100 + "%";
    star.style.top = Math.random() * 60 + "%";
    star.style.opacity = Math.random();
    star.style.animation = `twinkle ${2 + Math.random() * 3}s infinite`;
    starsContainer.appendChild(star);
  }
}

// CSS animation for twinkling
const style = document.createElement("style");
style.textContent = `
  @keyframes twinkle {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }
`;
document.head.appendChild(style);

createStars();

// Unlock reward in scene
function unlockReward(rewardName) {
  console.log("Unlocking reward:", rewardName);
  
  // Handle trees specially (two separate elements)
  if (rewardName === 'trees') {
    const treeLeft = document.getElementById("treeLeft");
    const treeRight = document.getElementById("treeRight");
    if (treeLeft) {
      treeLeft.classList.add("unlocked");
      console.log("Added unlocked class to treeLeft");
    }
    if (treeRight) {
      treeRight.classList.add("unlocked");
      console.log("Added unlocked class to treeRight");
    }
  } else {
    const element = document.getElementById(rewardName);
    if (element) {
      element.classList.add("unlocked");
      console.log("Added unlocked class to element:", rewardName);
    } else {
      console.error("Element not found:", rewardName);
    }
  }
  
  // Update checklist
  const checklistItem = document.querySelector(`.reward-item[data-reward="${rewardName}"]`);
  if (checklistItem) {
    checklistItem.classList.add("unlocked");
    const statusEl = checklistItem.querySelector(".reward-status");
    if (statusEl) {
      statusEl.textContent = "✅";
    }
  }
}

// Load user's unlocked rewards
async function loadUserRewards() {
  if (!auth.currentUser) return;
  
  const userRef = doc(db, "users", auth.currentUser.uid);
  
  // Use onSnapshot for real-time updates
  onSnapshot(userRef, (docSnap) => {
    if (!docSnap.exists()) return;
    
    const data = docSnap.data();
    const unlockedRewards = data.unlockedRewards || [];
    
    console.log("Loading rewards from Firebase:", unlockedRewards);
    
    // Unlock each reward
    unlockedRewards.forEach((reward) => {
      unlockReward(reward);
    });
    
    // Update payout timer
    updatePayoutTimer(data.lastPayoutReset);
  });
}

// Update payout countdown timer
function updatePayoutTimer(lastReset) {
  if (!lastReset) {
    document.getElementById("payoutTimer").textContent = "14 days";
    return;
  }
  
  const resetDate = new Date(lastReset.toMillis ? lastReset.toMillis() : lastReset);
  const nextReset = new Date(resetDate);
  nextReset.setDate(nextReset.getDate() + 14);
  
  const now = new Date();
  const diff = nextReset - now;
  
  if (diff <= 0) {
    document.getElementById("payoutTimer").textContent = "Ready for reset!";
    document.getElementById("payoutTimer").style.color = "#00ff00";
    return;
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  document.getElementById("payoutTimer").textContent = `${days}d ${hours}h`;
}

// Test unlock button - FIXED TO PROPERLY UNLOCK EACH REWARD
document.getElementById("testUnlock").addEventListener("click", async () => {
  if (!auth.currentUser) return;
  
  const userRef = doc(db, "users", auth.currentUser.uid);
  const userDoc = await getDoc(userRef);
  const data = userDoc.data();
  const unlockedRewards = data?.unlockedRewards || [];
  
  // Find next reward to unlock
  const nextReward = UNLOCK_ORDER.find(r => !unlockedRewards.includes(r));
  
  if (nextReward) {
    const newUnlocked = [...unlockedRewards, nextReward];
    
    // Update Firebase
    await updateDoc(userRef, {
      unlockedRewards: newUnlocked
    });
    
    // Immediately unlock visually (don't wait for onSnapshot)
    unlockReward(nextReward);
    
    alert(`✨ Unlocked: ${nextReward.toUpperCase()}!`);
  } else {
    alert("🎉 All rewards unlocked! Scene complete!");
  }
});

// Reset scene
document.getElementById("resetScene").addEventListener("click", async () => {
  if (!confirm("Reset your entire scene? This will lock all rewards.")) return;
  if (!confirm("Are you absolutely sure? This cannot be undone.")) return;
  
  if (!auth.currentUser) return;
  
  const userRef = doc(db, "users", auth.currentUser.uid);
  await updateDoc(userRef, {
    unlockedRewards: [],
    lastPayoutReset: serverTimestamp()
  });
  
  // Remove all unlocked classes
  document.querySelectorAll(".unlocked").forEach(el => {
    el.classList.remove("unlocked");
  });
  
  // Reset checklist
  document.querySelectorAll(".reward-item").forEach(el => {
    el.classList.remove("unlocked");
    const statusEl = el.querySelector(".reward-status");
    if (statusEl) {
      statusEl.textContent = "🔒";
    }
  });
  
  alert("🔄 Scene reset! Earn rewards to build it again.");
});

// Auto-update timer every minute
setInterval(() => {
  if (auth.currentUser) {
    getDoc(doc(db, "users", auth.currentUser.uid)).then(docSnap => {
      if (docSnap.exists()) {
        updatePayoutTimer(docSnap.data().lastPayoutReset);
      }
    });
  }
}, 60000);

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    // Show dashboard for all users
    const dashboardBtn = document.getElementById("dashboardNavBtn");
    if (dashboardBtn) dashboardBtn.style.display = "inline-block";
    
    // Show admin button only for admins
    if (isAdmin(user.email)) {
      const adminBtn = document.getElementById("adminNavBtn");
      if (adminBtn) adminBtn.style.display = "inline-block";
    }
    
    loadUserRewards();
  }
});
