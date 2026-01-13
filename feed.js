// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase config (your keys)
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

document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const postBtn = document.getElementById("postBtn");
  const postInput = document.getElementById("postText");
  const postsContainer = document.getElementById("postsContainer");
  const trendingContainer = document.getElementById("trendingPost");
  const profileBtn = document.getElementById("profileBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const homeBtn = document.getElementById("homeBtn");

  // NAV
  profileBtn.addEventListener("click", () => window.location.href = "profile.html");
  logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));
  homeBtn.addEventListener("click", () => window.location.href = "feed.html");

  // CREATE POST
  postBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in!");
    
    const text = postInput.value.trim();
    if (!text) return alert("Write something first!");
    
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const profile = userSnap.exists() ? userSnap.data() : {};
      await addDoc(collection(db, "posts"), {
        text,
        userId: user.uid,
        displayName: profile.displayName || user.email,
        photoURL: profile.photoURL || "",
        createdAt: serverTimestamp(),
        likes: 0,
        comments: [],
      });
      postInput.value = "";
    } catch (err) {
      console.error(err);
      alert("Error posting: " + err.message);
    }
  });

  // DISPLAY FEED
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

  // TRENDING POST - hourly top liked
  setInterval(async () => {
    const postsSnap = await getDocs(collection(db, "posts"));
    let topPost = null;
    postsSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (!topPost || (data.likes || 0) > (topPost.likes || 0)) topPost = data;
    });
    trendingContainer.innerHTML = topPost ? `<strong>${topPost.displayName}</strong>: ${topPost.text} (Likes: ${topPost.likes || 0})` : "No posts yet";
  }, 3600 * 1000);
});
