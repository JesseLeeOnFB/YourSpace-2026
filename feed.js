console.log("🔥 feed.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔑 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM
const postBtn = document.getElementById("postBtn");
const postInput = document.getElementById("postText");
const postsFeed = document.getElementById("postsFeed");
const trendingPostDiv = document.getElementById("trendingPost");
const logoutBtn = document.getElementById("logoutBtn");
const goHomeBtn = document.getElementById("goHome");
const profileBtn = document.getElementById("profileBtn");

// Post creation
postBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  const text = postInput.value.trim();

  if (!user) return alert("You must be logged in");
  if (!text) return alert("Write something first");

  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const profile = userSnap.exists() ? userSnap.data() : {};

    await addDoc(collection(db, "posts"), {
      text,
      userId: user.uid,
      displayName: profile.displayName || user.email,
      photoURL: profile.photoURL || "",
      createdAt: serverTimestamp()
    });

    postInput.value = "";
    loadPosts();
  } catch (err) {
    console.error("POST ERROR:", err);
    alert(err.message);
  }
});

// Load posts
async function loadPosts() {
  postsFeed.innerHTML = "<p>Loading...</p>";
  try {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    postsFeed.innerHTML = "";

    let topPost = null;
    let maxLikes = -1; // placeholder for future like count

    snapshot.forEach(docSnap => {
      const post = docSnap.data();
      const postEl = document.createElement("div");
      postEl.classList.add("post");

      postEl.innerHTML = `
        <div class="postHeader">
          <img src="${post.photoURL || 'https://via.placeholder.com/50'}" alt="Profile" class="postProfilePic">
          <strong>${post.displayName}</strong>
        </div>
        <p>${post.text}</p>
      `;

      postsFeed.appendChild(postEl);

      // Determine trending post (placeholder logic)
      if ((post.likes || 0) > maxLikes) {
        maxLikes = post.likes;
        topPost = post;
      }
    });

    // Show trending
    if (topPost) {
      trendingPostDiv.innerHTML = `<strong>${topPost.displayName}:</strong> ${topPost.text}`;
    } else {
      trendingPostDiv.innerHTML = "No posts yet.";
    }
  } catch (err) {
    console.error("LOAD POSTS ERROR:", err);
    postsFeed.innerHTML = "<p>Error loading posts.</p>";
  }
}

// Initial load
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    loadPosts();
  }
});

// Logout
logoutBtn.addEventListener("click", () => signOut(auth));

// Navigation
goHomeBtn.addEventListener("click", () => window.location.href = "feed.html");
profileBtn.addEventListener("click", () => window.location.href = "profile.html");
