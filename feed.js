// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
  const postBtn = document.getElementById("postBtn");
  const postInput = document.getElementById("postText");
  const postsContainer = document.getElementById("postsContainer");
  const trendingContainer = document.getElementById("trendingPost");
  const profileBtn = document.getElementById("profileBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const homeBtn = document.getElementById("homeBtn");

  // Wait for auth state
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      alert("You need to be logged in");
      window.location.href = "index.html";
      return;
    }

    // Navigation
    profileBtn.addEventListener("click", () => window.location.href = "profile.html");
    logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));
    homeBtn.addEventListener("click", () => window.location.href = "feed.html");

    // Post new message
    postBtn.addEventListener("click", async () => {
      const text = postInput.value.trim();
      if (!text) return alert("Write something first!");

      try {
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

    // Display posts in real-time
    const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    onSnapshot(postsQuery, (snapshot) => {
      postsContainer.innerHTML = "";
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const postDiv = document.createElement("div");
        postDiv.classList.add("post");
        postDiv.innerHTML = `
          <div class="post-header">
            <img src="${data.photoURL || 'https://via.placeholder.com/50'}" alt="Profile" class="post-photo">
            <strong>${data.displayName || "Anonymous"}</strong>
          </div>
          <p>${data.text}</p>
          <div class="post-actions">
            <button class="likeBtn">Like (${data.likes || 0})</button>
            <button class="commentBtn">Comment</button>
            <button class="shareBtn">Share</button>
            ${user.uid === data.userId ? '<button class="deleteBtn">Delete</button>' : ''}
          </div>
          <div class="commentsContainer"></div>
        `;
        postsContainer.appendChild(postDiv);

        const deleteBtn = postDiv.querySelector(".deleteBtn");
        if (deleteBtn) deleteBtn.addEventListener("click", async () => deleteDoc(doc(db, "posts", docSnap.id)));
      });
    });

    // Trending post hourly
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
});
