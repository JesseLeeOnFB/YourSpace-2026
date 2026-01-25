// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Stripe instance
const stripe = Stripe("sk_live_ _515sC02DYg20K7LXSw198h3UeMk8cR8U6heLO2c5twNBVnLc18RTmdiaFMF410dkyfHPdv63ixnKc270GL32s2vLp891VzZ105K");

// Global variables
let currentUser = null;

// ============================================
// AUTH
// ============================================
auth.onAuthStateChanged(user => {
  if (!user) return window.location.href = "login.html";
  currentUser = user;
  loadFeed();
});

// ============================================
// NAVIGATION
// ============================================
function goHome() { window.location.href = "index.html"; }
function goProfile() { window.location.href = "profile.html"; }
function goFeed() { window.location.href = "feed.html"; }

// ============================================
// SEARCH
// ============================================
const searchInput = document.getElementById("userSearch");
const clearSearchBtn = document.getElementById("clearSearch");

searchInput.addEventListener("input", () => loadFeed(searchInput.value.trim()));
clearSearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  loadFeed();
});

// ============================================
// LOAD FEED
// ============================================
async function loadFeed(searchUsername = "") {
  const feedContainer = document.getElementById("feedContainer");
  feedContainer.innerHTML = "<p>Loading...</p>";

  try {
    let query = db.collection("posts").orderBy("timestamp", "desc");
    if (searchUsername) {
      query = db.collection("users")
                .where("username", "==", searchUsername)
                .limit(1)
                .get()
                .then(async userSnap => {
                  if (userSnap.empty) return feedContainer.innerHTML = "<p>No user found</p>";
                  const userId = userSnap.docs[0].id;
                  const postsSnap = await db.collection("posts")
                                           .where("userId", "==", userId)
                                           .orderBy("timestamp", "desc")
                                           .get();
                  displayPosts(postsSnap);
                });
      return;
    }

    const snapshot = await query.get();
    displayPosts(snapshot);

  } catch (error) {
    console.error("Feed load error:", error);
    feedContainer.innerHTML = "<p>Error loading feed</p>";
  }
}

// ============================================
// DISPLAY POSTS
// ============================================
function displayPosts(snapshot) {
  const feedContainer = document.getElementById("feedContainer");
  if (snapshot.empty) {
    feedContainer.innerHTML = "<p>No posts yet</p>";
    return;
  }

  feedContainer.innerHTML = "";
  snapshot.forEach(doc => {
    const post = doc.data();
    const postEl = document.createElement("div");
    postEl.className = "post";

    postEl.innerHTML = `
      <p><strong>${post.username}</strong></p>
      <p>${post.text}</p>
      ${post.imageURL ? `<img src="${post.imageURL}" alt="Post Image">` : ""}
      <button onclick="sendGift('${doc.id}', '${post.userId}', '${post.username}')">🎁 Send Gift</button>
    `;

    feedContainer.appendChild(postEl);
  });
}

// ============================================
// SEND GIFT
// ============================================
async function sendGift(postId, recipientId, recipientUsername) {
  const amount = 500; // example $5
  try {
    const sessionRes = await fetch("/create-stripe-session", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({amount, recipientId})
    });
    const session = await sessionRes.json();
    const result = await stripe.redirectToCheckout({ sessionId: session.id });

    if (result.error) alert(result.error.message);
  } catch (error) {
    console.error("Gift error:", error);
    alert("Failed to send gift.");
  }
}
