// Firebase config
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

// Elements
const feedContainer = document.getElementById("feedContainer");
const searchInput = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearBtn");

// Clear search
clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  loadFeed();
});

// -----------------------
// Load feed posts
async function loadFeed() {
  feedContainer.innerHTML = "<p>Loading...</p>";
  let query = db.collection("posts").orderBy("timestamp", "desc");

  const searchValue = searchInput.value.trim();
  if(searchValue) query = query.where("usernameLower", "==", searchValue.toLowerCase());

  const snapshot = await query.get();
  feedContainer.innerHTML = "";

  if(snapshot.empty) {
    feedContainer.innerHTML = "<p>No posts found.</p>";
    return;
  }

  snapshot.forEach(doc => {
    const data = doc.data();
    const username = data.username || "Anonymous";
    const text = data.text || "";

    const postDiv = document.createElement("div");
    postDiv.classList.add("feed-post");
    postDiv.innerHTML = `
      <p><strong>${username}</strong></p>
      <p>${text}</p>
      <button class="giftBtn" data-postid="${doc.id}" data-username="${username}">Send Gift</button>
    `;
    feedContainer.appendChild(postDiv);
  });

  // Gift button events
  document.querySelectorAll(".giftBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const postId = btn.dataset.postid;
      const recipient = btn.dataset.username;

      try {
        const res = await fetch("/createCheckoutSession", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId, recipient })
        });
        const session = await res.json();
        const stripe = Stripe("pk_live_51SsCC2DYg2OK71XSVGO4dsgGVtpUO1XcrgJp1pP5K0fTDVkDaunVwNzhH5ORf8QRJBMA9WDq9FY0Z6SrTWkSPvr100nhHBuJNM");
        await stripe.redirectToCheckout({ sessionId: session.id });
      } catch(err) {
        console.error(err);
        alert("Error creating checkout session.");
      }
    });
  });
}

// Search input
searchInput.addEventListener("input", loadFeed);

// Navigation
document.querySelectorAll(".navBtn").forEach(btn => {
  btn.addEventListener("click", e => {
    window.location.href = e.target.dataset.target;
  });
});

// Auth + initial load
auth.onAuthStateChanged(user => {
  if(!user) window.location.href = "login.html";
  else loadFeed();
});
