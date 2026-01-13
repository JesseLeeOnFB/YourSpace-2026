// File: feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔑 Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Wait for DOM + auth ready
document.addEventListener("DOMContentLoaded", () => {
  const postBtn = document.getElementById("postBtn");
  const postInput = document.getElementById("postText");
  const postsContainer = document.getElementById("postsContainer");
  const trendingContainer = document.getElementById("trendingPost");
  const profileBtn = document.getElementById("profileBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const homeBtn = document.getElementById("homeBtn");

  // Navigation buttons
  homeBtn.addEventListener("click", () => window.location.href = "feed.html");
  profileBtn.addEventListener("click", () => window.location.href = "profile.html");
  logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));

  // Only attach post listener when user is signed in
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Post button
      postBtn.addEventListener("click", async () => {
        const text = postInput.value.trim();
        if (!text) return alert("Write something first!");

        try {
          // Get user profile
          const userSnap = await getDoc(doc(db, "users", user.uid));
          const profile = userSnap.exists() ? userSnap.data() : {};

          await addDoc(collection(db, "posts"), {
            text,
            userId: user.uid,
            displayName: profile.displayName || "Anonymous",
            photoURL: profile.photoURL || "",
            createdAt: serverTimestamp(),
            likes: 0,
            comments: []
          });

          postInput.value = "";
        } catch (err) {
          console.error("POST ERROR:", err);
          alert("Error posting: " + err.message);
        }
      });
    }
  });

  // Real-time feed
  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, (snapshot) => {
    postsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");
      postDiv.innerHTML = `
        <p><strong>${data.displayName}</strong></p>
        <p>${data.text}</p>
        <button class="likeBtn">Like (${data.likes || 0})</button>
        <button class="commentBtn">Comment</button>
        <button class="shareBtn">Share</button>
      `;
      postsContainer.appendChild(postDiv);
    });
  });

  // Trending post (top liked last hour)
  setInterval(async () => {
    const postsSnap = await getDocs(collection(db, "posts"));
    let topPost = null;
    postsSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (!topPost || (data.likes || 0) > (topPost.likes || 0)) topPost = data;
    });
    trendingContainer.innerHTML = topPost
      ? `<strong>${topPost.displayName}</strong>: ${topPost.text} (Likes: ${topPost.likes || 0})`
      : "No posts yet";
  }, 3600*1000); // update hourly
});
