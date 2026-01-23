// dashboard.js - COMPLETE WITH FIXED NAVIGATION

import { initializeApp } from “https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js”;
import {
getFirestore, collection, doc, getDoc, getDocs, query, where, orderBy, limit
} from “https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js”;
import { getAuth, signOut } from “https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js”;

const firebaseConfig = {
apiKey: “AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8”,
authDomain: “yourspace-2026.firebaseapp.com”,
projectId: “yourspace-2026”,
storageBucket: “yourspace-2026.firebasestorage.app”,
messagingSenderId: “72667267302”,
appId: “1:72667267302:web:2bed5f543e05d49ca8fb27”
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const ADMIN_EMAILS = [“skeeterjeeter8@gmail.com”, “daniellehunt01@gmail.com”];

function isAdmin(email) {
return ADMIN_EMAILS.includes(email?.toLowerCase());
}

// Navigation handlers
document.getElementById(“feedNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “feed.html”;
});

document.getElementById(“profileNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “profile.html”;
});

document.getElementById(“messagesNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “messages.html”;
});

document.getElementById(“notificationsNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “notifications.html”;
});

document.getElementById(“dashboardNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “dashboard.html”;
});

document.getElementById(“adminNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “admin.html”;
});

document.getElementById(“contactNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “contact.html”;
});

document.getElementById(“logoutBtn”)?.addEventListener(“click”, async () => {
await signOut(auth);
window.location.href = “login.html”;
});

// Hamburger menu
const hamburger = document.getElementById(“hamburger”);
const navLinks = document.getElementById(“navLinks”);

if (hamburger && navLinks) {
hamburger.addEventListener(“click”, () => {
hamburger.classList.toggle(“active”);
navLinks.classList.toggle(“active”);
});

navLinks.querySelectorAll(“button”).forEach(button => {
button.addEventListener(“click”, () => {
hamburger.classList.remove(“active”);
navLinks.classList.remove(“active”);
});
});

document.addEventListener(“click”, (e) => {
if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
hamburger.classList.remove(“active”);
navLinks.classList.remove(“active”);
}
});
}

// Load dashboard data
async function loadDashboard(userId) {
try {
const userRef = doc(db, “users”, userId);
const userDoc = await getDoc(userRef);

```
if (!userDoc.exists()) {
  console.error("User document not found");
  return;
}

const userData = userDoc.data();
const totalEarnings = userData.totalEarnings || 0;
const stripeVerified = userData.stripeVerified || false;
const stripeTaxComplete = userData.stripeTaxComplete || false;

// Update earnings display
document.getElementById("totalEarnings").textContent = `$${totalEarnings.toFixed(2)}`;
document.getElementById("pendingPayout").textContent = `$${totalEarnings.toFixed(2)}`;

// Get gift count
const giftsQuery = query(
  collection(db, "gifts"),
  where("toUserId", "==", userId)
);
const giftsSnapshot = await getDocs(giftsQuery);
document.getElementById("totalGifts").textContent = giftsSnapshot.size;

// Calculate days until payout
const lastPayoutDate = userData.lastPayoutDate;
let daysUntilPayout = 14;

if (lastPayoutDate) {
  const lastPayout = new Date(lastPayoutDate.toMillis());
  const now = new Date();
  const daysSinceLastPayout = Math.floor((now - lastPayout) / (1000 * 60 * 60 * 24));
  daysUntilPayout = Math.max(0, 14 - daysSinceLastPayout);
}

document.getElementById("daysUntilPayout").textContent = daysUntilPayout;

// Show/hide Stripe setup
if (stripeVerified && stripeTaxComplete) {
  document.getElementById("stripeNotVerified").style.display = "none";
  document.getElementById("stripeVerified").style.display = "block";
  
  // Calculate next payout date
  const nextPayoutDate = new Date();
  nextPayoutDate.setDate(nextPayoutDate.getDate() + daysUntilPayout);
  document.getElementById("nextPayoutDate").textContent = nextPayoutDate.toLocaleDateString();
  document.getElementById("nextPayoutAmount").textContent = `$${totalEarnings.toFixed(2)}`;
} else {
  document.getElementById("stripeNotVerified").style.display = "block";
  document.getElementById("stripeVerified").style.display = "none";
}

// Load recent gifts
await loadRecentGifts(userId);
```

} catch (error) {
console.error(“Error loading dashboard:”, error);
alert(“Error loading dashboard data”);
}
}

// Load recent gifts
async function loadRecentGifts(userId) {
try {
const giftsQuery = query(
collection(db, “gifts”),
where(“toUserId”, “==”, userId),
orderBy(“createdAt”, “desc”),
limit(10)
);

```
const giftsSnapshot = await getDocs(giftsQuery);
const recentGiftsList = document.getElementById("recentGiftsList");

if (giftsSnapshot.empty) {
  recentGiftsList.innerHTML = "<p style='color:#666;text-align:center;padding:2rem;'>No gifts received yet</p>";
  return;
}

recentGiftsList.innerHTML = "";

for (const giftDoc of giftsSnapshot.docs) {
  const gift = giftDoc.data();
  const fromUserDoc = await getDoc(doc(db, "users", gift.fromUserId));
  const fromUsername = fromUserDoc.exists() ? fromUserDoc.data().username : "Anonymous";
  
  const giftEl = document.createElement("div");
  giftEl.style.cssText = "padding:1rem;border-bottom:1px solid #222;display:flex;justify-content:space-between;align-items:center;";
  
  const giftIcons = {
    rose: "🌹",
    coffee: "☕",
    bear: "🧸",
    cake: "🍰",
    diamond: "💎",
    yacht: "🛥️"
  };
  
  const time = gift.createdAt ? new Date(gift.createdAt.toMillis()).toLocaleDateString() : "Recently";
  
  giftEl.innerHTML = `
    <div>
      <span style="font-size:1.5rem;margin-right:0.5rem;">${giftIcons[gift.giftType] || "🎁"}</span>
      <strong>${fromUsername}</strong>
      <span style="color:#666;margin-left:0.5rem;">${time}</span>
    </div>
    <div style="color:#00ff00;font-weight:bold;">+$${gift.amount.toFixed(2)}</div>
  `;
  
  recentGiftsList.appendChild(giftEl);
}
```

} catch (error) {
console.error(“Error loading gifts:”, error);
}
}

// Stripe setup button
document.getElementById(“stripeSetupBtn”)?.addEventListener(“click”, () => {
alert(“🔒 Stripe integration coming soon! This will redirect you to complete Stripe Connect onboarding and tax information.”);
});

// Auth state
auth.onAuthStateChanged((user) => {
if (!user) {
window.location.href = “login.html”;
} else {
// Show admin button if user is admin
if (isAdmin(user.email)) {
const adminBtn = document.getElementById(“adminNavBtn”);
if (adminBtn) adminBtn.style.display = “inline-block”;
}

```
loadDashboard(user.uid);
```

}
});
