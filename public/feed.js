// feed.js — YourSpace 2026
// -----------------------

// Firebase initialization
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

// -----------------------
// Elements
const feedContainer = document.getElementById("feedContainer");
const searchInput = document.getElementById("searchInput");

// -----------------------
// Helper: Clear search bar
const clearSearch = () => {
  searchInput.value = "";
  loadFeed();
};

// Add X button inside search bar
const searchWrapper = document.getElementById("searchWrapper");
const clearBtn = document.createElement("span");
clearBtn.textContent = "×";
clearBtn.style.cursor = "pointer";
clearBtn.style.marginLeft = "5px";
clearBtn.addEventListener("click", clearSearch);
searchWrapper.appendChild(clearBtn);

// -----------------------
// Load feed posts
const loadFeed = async () => {
  feedContainer.innerHTML = "<p>Loading...</p>";
  let query = db.collection("posts").orderBy("timestamp", "desc");
  
  // Filter by username if search input has value
  const searchValue = searchInput.value.trim();
  if(searchValue) {
    query = query.where("usernameLower", "==", searchValue.toLowerCase());
  }
  
  const snapshot = await query.get();
  feedContainer.innerHTML = "";
  
  if(snapshot.empty) {
    feedContainer.innerHTML = "<p>No posts found.</p>";
    return;
  }
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const postDiv = document.createElement("div");
    postDiv.classList.add("feed-post");
    postDiv.innerHTML = `
      <p><strong>${data.username}</strong></p>
      <p>${data.text}</p>
      <button class="giftBtn" data-postid="${doc.id}" data-username="${data.username}">Send Gift</button>
    `;
    feedContainer.appendChild(postDiv);
  });

  // Attach gift button events
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
        const stripe = Stripe("pk_live_51SsCC2DYg2OK71XSVGO4dsgGVtpUO1XcrgJp1pP5K0fTDVkDaunVwNzhH5ORf8QRJBMA9WDq9FY0Z6SrTWkSPvr100nhHBuJNM"); // <-- Replace with your PK
        await stripe.redirectToCheckout({ sessionId: session.id });
      } catch (err) {
        console.error(err);
        alert("Error creating checkout session.");
      }
    });
  });
};

// -----------------------
// Search bar event
searchInput.addEventListener("input", loadFeed);

// -----------------------
// Navigation buttons
document.querySelectorAll(".navBtn").forEach(btn => {
  btn.addEventListener("click", e => {
    const target = e.target.dataset.target;
    window.location.href = target;
  });
});

// -----------------------
// Initial feed load
auth.onAuthStateChanged(user => {
  if(!user) {
    window.location.href = "login.html";
    return;
  }
  loadFeed();
});
