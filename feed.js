import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

  const user = auth.currentUser;
  if (!user) return alert("You must be logged in!");

  // Nav buttons
  profileBtn.addEventListener("click", () => window.location.href = "profile.html");
  logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));
  homeBtn.addEventListener("click", () => window.location.href = "feed.html");

  // Post button
  postBtn.addEventListener("click", async () => {
    const text = postInput.value.trim();
    if (!text) return alert("Write something first!");

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
  });

  // Display posts
  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, snapshot => {
    postsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");
      postDiv.innerHTML = `
        <div class="post-header">
          <img class="post-photo" src="${data.photoURL || 'default.png'}" alt="Profile">
          <strong>${data.displayName || 'Anonymous'}</strong>
        </div>
        <p class="post-text">${data.text}</p>
        <div class="post-buttons">
          <button class="likeBtn">Like (${data.likes || 0})</button>
          <button class="commentBtn">Comment (${data.comments?.length || 0})</button>
          <button class="shareBtn">Share</button>
          ${data.userId === user.uid ? '<button class="deleteBtn">Delete</button>' : ''}
        </div>
        <div class="comment-section" id="comment-${docSnap.id}"></div>
      `;
      postsContainer.appendChild(postDiv);

      // Like
      postDiv.querySelector(".likeBtn").addEventListener("click", async () => {
        await setDoc(doc(db, "posts", docSnap.id), {
          likes: (data.likes || 0) + 1
        }, { merge: true });
      });

      // Delete
      if (data.userId === user.uid) {
        postDiv.querySelector(".deleteBtn").addEventListener("click", async () => {
          await deleteDoc(doc(db, "posts", docSnap.id));
        });
      }

      // Comment (simple prompt for now)
      postDiv.querySelector(".commentBtn").addEventListener("click", async () => {
        const comment = prompt("Write your comment:");
        if (!comment) return;
        const comments = data.comments || [];
        comments.push({ userId: user.uid, text: comment });
        await setDoc(doc(db, "posts", docSnap.id), { comments }, { merge: true });
      });

      // Share (simple link copy)
      postDiv.querySelector(".shareBtn").addEventListener("click", () => {
        const url = `${window.location.href}?post=${docSnap.id}`;
        navigator.clipboard.writeText(url);
        alert("Post link copied!");
      });
    });
  });

  // Trending Post: top liked in last hour
  setInterval(async () => {
    const postsSnap = await getDocs(collection(db, "posts"));
    const oneHourAgo = Date.now() - 3600 * 1000;
    let topPost = null;
    postsSnap.forEach(docSnap => {
      const data = docSnap.data();
      const timestamp = data.createdAt?.toMillis?.() || 0;
      if (timestamp < oneHourAgo) return;
      if (!topPost || (data.likes || 0) > (topPost.likes || 0)) topPost = data;
    });
    trendingContainer.innerHTML = topPost ? `<strong>${topPost.displayName}</strong>: ${topPost.text} (Likes: ${topPost.likes || 0})` : "No trending posts yet";
  }, 3600 * 1000);

});
