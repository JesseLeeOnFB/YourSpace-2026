// dashboard.js - COMPLETE WITH FIXED NAVIGATION

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, query, where, orderBy, limit
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

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

const ADMIN_EMAILS = ["skeeterjeeter8@gmail.com", "daniellehunt01@gmail.com"];

function isAdmin(email) {
  return ADMIN_EMAILS.includes(email?.toLowerCase());
}

// Navigation handlers
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
  await signOut(auth);
  window.location.href = "login.html";
});

async function loadDashboard(userId) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      document.getElementById("giftCount").textContent = userData.giftCount || 0;
      document.getElementById("totalEarnings").textContent = `$${userData.totalEarnings?.toFixed(2) || "0.00"}`;
      document.getElementById("lastPayoutAmount").textContent = `$${userData.lastPayoutAmount?.toFixed(2) || "0.00"}`;
      document.getElementById("currentBalance").textContent = `$${userData.totalEarnings?.toFixed(2) || "0.00"}`;
      const lastPayout = userData.lastPayoutDate?.toDate() || new Date();
      const nextPayout = new Date(lastPayout.getTime() + 14 * 24 * 60 * 60 * 1000);
      document.getElementById("nextPayoutDate").textContent = nextPayout.toLocaleDateString();
      document.getElementById("nextPayoutAmount").textContent = `$${userData.totalEarnings?.toFixed(2) || "0.00"}`;
      loadRecentGifts(userId);
    }
  } catch (error) {
    console.error("Error loading dashboard:", error);
  }
}

async function loadRecentGifts(userId) {
  try {
    const recentGiftsList = document.getElementById("recentGiftsList");
    recentGiftsList.innerHTML = "";
    const giftsQuery = query(collection(db, "gifts"), where("toUserId", "==", userId), orderBy("createdAt", "desc"), limit(5));
    const giftsSnapshot = await getDocs(giftsQuery);
    if (giftsSnapshot.empty) {
      recentGiftsList.innerHTML = "<p style='color:#666;text-align:center;padding:2rem;'>No gifts received yet</p>";
      return;
    }
    giftsSnapshot.forEach(async (giftDoc) => {
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
    });
  } catch (error) {
    console.error("Error loading gifts:", error);
  }
}

// Stripe setup button
document.getElementById("stripeSetupBtn")?.addEventListener("click", () => {
  alert("🔒 Stripe integration coming soon! This will redirect you to complete Stripe Connect onboarding and tax information.");
});

// Auth state
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    // Show admin button if user is admin
    if (isAdmin(user.email)) {
      const adminBtn = document.getElementById("adminNavBtn");
      if (adminBtn) adminBtn.style.display = "inline-block";
    }

    loadDashboard(user.uid);
  }
});