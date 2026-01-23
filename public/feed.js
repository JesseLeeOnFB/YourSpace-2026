// feed.js - COMPLETE VERSION with gift-to-reward mapping

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  where,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

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
const storage = getStorage(app);
const auth = getAuth(app);

// Creator payout amounts (must match your Firebase Functions)
const CREATOR_PAYOUTS = {
  rose: 0.12,
  coffee: 0.29,
  bear: 0.58,
  cake: 0.86,
  diamond: 2.88,
  yacht: 5.75
};

const ADMIN_EMAILS = ["skeeterjeeter8@gmail.com", "daniellehunt01@gmail.com"];

function isAdmin(email) {
  return ADMIN_EMAILS.includes(email?.toLowerCase());
}

// Rate limiting for posts
const postTimestamps = [];
function checkRateLimit() {
  const now = Date.now();
  while (postTimestamps.length > 0 && now - postTimestamps[0] > 120000) postTimestamps.shift();
  if (postTimestamps.length >= 5) {
    alert(`⏱️ Slow down! Wait ${Math.ceil((120000 - (now - postTimestamps[0])) / 1000)} seconds.`);
    return false;
  }
  postTimestamps.push(now);
  return true;
}

// Spam filter
const BLOCKED_KEYWORDS = {
  racial: ['nigger', 'nigga', 'coon', 'spic', 'chink', 'faggot', 'fag', 'retard'],
  suicide: ['kill myself', 'suicide', 'kys'],
  threats: ['kill you', 'murder you', 'bomb'],
  selfHarm: ['cut myself', 'harm myself']
};

function containsBlockedKeyword(text) {
  if (!text) return { blocked: false };
  const lower = text.toLowerCase();
  for (const cat in BLOCKED_KEYWORDS) {
    for (const word of BLOCKED_KEYWORDS[cat]) {
      if (lower.includes(word)) return { blocked: true, category: cat };
    }
  }
  return { blocked: false };
}

const postsContainer = document.getElementById("postsContainer");
const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");

// Navigation handlers
document.getElementById("feedNavBtn")?.addEventListener("click", () => window.location.href = "feed.html");
document.getElementById("profileNavBtn")?.addEventListener("click", () => window.location.href = "profile.html");
document.getElementById("messagesNavBtn")?.addEventListener("click", () => window.location.href = "messages.html");
document.getElementById("notificationsNavBtn")?.addEventListener("click", () => window.location.href = "notifications.html");
document.getElementById("contactNavBtn")?.addEventListener("click", () => window.location.href = "contact.html");
document.getElementById("dashboardNavBtn")?.addEventListener("click", () => window.location.href = "dashboard.html");

// Hamburger menu
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

// Search functionality
const searchBar = document.getElementById("searchBar");
const searchResults = document.getElementById("searchResults");
const clearSearchBtn = document.getElementById("clearSearchBtn");

if (searchBar && searchResults) {
  searchBar.addEventListener("input", async (e) => {
    const term = e.target.value.trim().toLowerCase();
    if (clearSearchBtn) clearSearchBtn.style.display = term ? "block" : "none";
    if (!term) {
      searchResults.style.display = "none";
      return;
    }

    const usersSnap = await getDocs(collection(db, "users"));
    const matched = [];
    usersSnap.forEach((d) => {
      const u = d.data();
      if ((u.username || "").toLowerCase().includes(term)) {
        matched.push({ id: d.id, username: u.username, photo: u.photoURL });
      }
    });

    if (matched.length > 0) {
      searchResults.style.display = "block";
      searchResults.innerHTML = matched.map(u => `
        <div class="search-result-item" data-user-id="${u.id}">
          <img src="${u.photo || 'https://via.placeholder.com/50'}" class="search-result-avatar" />
          <strong>${u.username}</strong>
        </div>
      `).join("");

      searchResults.querySelectorAll(".search-result-item").forEach(item => {
        item.onclick = () => window.location.href = `profile.html?userId=${item.dataset.userId}`;
      });
    } else {
      searchResults.style.display = "block";
      searchResults.innerHTML = "<div class='no-results'>No users found</div>";
    }
  });

  document.addEventListener("click", (e) => {
    if (!searchBar.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.style.display = "none";
    }
  });
}

if (clearSearchBtn) {
  clearSearchBtn.addEventListener("click", () => {
    searchBar.value = "";
    searchResults.style.display = "none";
    clearSearchBtn.style.display = "none";
  });
}

// Create post
postBtn?.addEventListener("click", async () => {
  if (!checkRateLimit()) return;
  const text = postText.value.trim();
  if (!text) return alert("Please write something!");

  const blocked = containsBlockedKeyword(text);
  if (blocked.blocked) return alert(`Post blocked: inappropriate content (${blocked.category})`);

  try {
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in to post!");

    let mediaUrl = null;
    if (postFileInput.files[0]) {
      const file = postFileInput.files[0];
      const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      mediaUrl = await getDownloadURL(storageRef);
    }

    await addDoc(collection(db, "posts"), {
      text,
      mediaUrl,
      authorId: user.uid,
      authorName: user.displayName || "Anonymous",
      authorPhoto: user.photoURL || "",
      createdAt: serverTimestamp(),
      likes: 0,
      comments: 0
    });

    postText.value = "";
    postFileInput.value = "";
    alert("Post created!");
  } catch (err) {
    console.error("Post error:", err);
    alert("Failed to post: " + err.message);
  }
});

// ────────────────────────────────────────────────
// GIFT / REWARD SYSTEM (placeholder – adapt to your actual UI)
// ────────────────────────────────────────────────

let selectedGift = null;
let postOwnerId = null;
let giftId = null;

// Example: called when user selects a gift type from dialog
function selectGift(type) {
  selectedGift = type;
  // Here you would normally open Stripe Elements / redirect to payment
  console.log(`Selected gift: ${type} for post owner ${postOwnerId}`);
  // In real code: trigger Stripe payment flow
}

// Example: called when payment succeeds (replace with your real success handler)
async function handlePaymentSuccess(paymentIntent) {
  try {
    // 1. Update gift document status
    await updateDoc(doc(db, "gifts", giftId), {
      status: "paid",
      paidAt: serverTimestamp(),
      stripePaymentIntent: paymentIntent.id
    });

    // 2. Credit creator's earnings
    const creatorRef = doc(db, "users", postOwnerId);
    await updateDoc(creatorRef, {
      totalEarnings: increment(CREATOR_PAYOUTS[selectedGift] || 0),
      giftCount: increment(1)
    });

    // 3. Map gift → reward and increment count
    const rewardMapping = {
      rose: 'grass',
      coffee: 'cat',
      bear: 'puppy',
      cake: 'house',
      diamond: 'car',
      yacht: 'jet'
    };

    const rewardType = rewardMapping[selectedGift];
    if (rewardType && postOwnerId) {
      try {
        await updateDoc(creatorRef, {
          [`rewards.${rewardType}`]: increment(1)
        });
        console.log(`Incremented reward ${rewardType} for creator ${postOwnerId}`);
      } catch (err) {
        console.error("Failed to increment reward:", err);
      }
    }

    // 4. Add notification to creator
    await addDoc(collection(db, "users", postOwnerId, "notifications"), {
      type: "gift",
      fromUserId: auth.currentUser.uid,
      giftType: selectedGift,
      amount: CREATOR_PAYOUTS[selectedGift] || 0,
      createdAt: serverTimestamp(),
      read: false
    });

    alert("Gift sent successfully! Creator rewarded.");
  } catch (err) {
    console.error("Gift processing error:", err);
    alert("Error processing gift: " + err.message);
  }
}

// Placeholder for your real-time post loading, likes, comments, admin delete, etc.
// Add your existing feed rendering code here...
// Example stub:
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Load posts, show dashboard button, etc.
    console.log("User logged in:", user.uid);
  } else {
    window.location.href = "login.html";
  }
});