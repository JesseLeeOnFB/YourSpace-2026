// =====================
// Firebase & Stripe Setup
// =====================
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Use Stripe publishable key in browser, secret key only on server
const stripe = Stripe("pk_live_51SsCC2DYg2OK71XSVGO4dsgGVtpUO1XcrgJp1pP5K0fTDVkDaunVwNzhH5ORf8QRJBMA9WDq9FY0Z6SrTWkSPvr100nhHBuJNM"); // Replace with your publishable key

// =====================
// Global Variables
// =====================
let currentUser = null;
let allPosts = [];

// =====================
// DOM Elements
// =====================
const postsContainer = document.getElementById("postsContainer");
const searchBar = document.getElementById("searchBar");
const clearSearchBtn = document.getElementById("clearSearch");

// =====================
// Navigation Functions
// =====================
function goHome() { window.location.href = "index.html"; }
function goProfile() { window.location.href = "profile.html"; }
function goFeed() { window.location.href = "feed.html"; }
function logout() {
  auth.signOut().then(() => window.location.href = "login.html");
}

// =====================
// Search Bar Functions
// =====================
searchBar.addEventListener("input", () => renderPosts(searchBar.value));

function clearSearch() {
  searchBar.value = "";
  renderPosts();
}

// =====================
// Auth & Load Posts
// =====================
auth.onAuthStateChanged(async (user) => {
  if (!user) return window.location.href = "login.html";
  currentUser = user;
  await loadPosts();
});

async function loadPosts() {
  try {
    const snapshot = await db.collection("posts").orderBy("timestamp", "desc").get();
    allPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderPosts();
  } catch (err) {
    console.error("Error loading posts:", err);
    postsContainer.innerHTML = "<p>Error loading posts.</p>";
  }
}

// =====================
// Render Posts Function
// =====================
function renderPosts(filter = "") {
  postsContainer.innerHTML = "";

  const filteredPosts = allPosts.filter(post =>
    post.username.toLowerCase().includes(filter.toLowerCase())
  );

  if (filteredPosts.length === 0) {
    postsContainer.innerHTML = "<p>No posts found.</p>";
    return;
  }

  filteredPosts.forEach(post => {
    const postEl = document.createElement("div");
    postEl.className = "post";

    postEl.innerHTML = `
      <div class="post-header">
        <strong>${post.username}</strong>
      </div>
      <div class="post-body">
        <p>${post.content || ""}</p>
        ${post.imageURL ? `<img src="${post.imageURL}" alt="Post Image" class="post-img"/>` : ""}
      </div>
      <div class="post-footer">
        <button class="gift-btn" onclick="sendGift('${post.userId}')">🎁 Send Gift</button>
      </div>
    `;
    postsContainer.appendChild(postEl);
  });
}

// =====================
// Stripe Gift Checkout
// =====================
async function sendGift(recipientId) {
  if (!currentUser) return alert("Please log in first.");

  try {
    const res = await fetch("https://us-central1-yourspace-2026.cloudfunctions.net/stripeWebhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderId: currentUser.uid, recipientId })
    });

    const data = await res.json();

    if (data.url) {
      // Redirect user to Stripe Checkout
      window.location.href = data.url;
    } else {
      console.error("Invalid Stripe response:", data);
      alert("Error creating gift checkout session.");
    }
  } catch (err) {
    console.error("Stripe gift error:", err);
    alert("Payment error. Please try again.");
  }
}

// =====================
// Responsive Enhancements
// =====================
// Focus search on mobile automatically
if (/Mobi|Android/i.test(navigator.userAgent)) {
  searchBar.focus();
}
