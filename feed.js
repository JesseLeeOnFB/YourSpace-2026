// /YourSpace-2026/feed.js
console.log("🔥 feed.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, serverTimestamp, onSnapshot, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// DOM
const logoutBtn = document.getElementById("logoutBtn");
const postBtn = document.getElementById("postBtn");
const postInput = document.getElementById("postText");
const postsContainer = document.getElementById("postsContainer");

// Logout
logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));

// Add Post
postBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  const text = postInput.value.trim();
  if (!user) return alert("Login first");
  if (!text) return alert("Write something first");

  const userDoc = await (await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js')).getDoc(doc(db, "users", user.uid));
  const profile = userDoc.exists() ? userDoc.data() : {};

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

// Render Posts
const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
onSnapshot(q, (snapshot) => {
  postsContainer.innerHTML = "";
  snapshot.forEach(docSnap => {
    const post = docSnap.data();
    const div = document.createElement("div");
    div.className = "post";
    div.innerHTML = `
      <img src="${post.photoURL || 'https://via.placeholder.com/50'}" class="post-pic">
      <b>${post.displayName}</b>: ${post.text} <br>
      <button onclick="likePost('${docSnap.id}', ${post.likes})">Like (${post.likes})</button>
      <button onclick="deletePost('${docSnap.id}', '${post.userId}')">Delete</button>
    `;
    postsContainer.appendChild(div);
  });
});

// Like/Delete functions
window.likePost = async (id, likes) => {
  const docRef = doc(db, "posts", id);
  await updateDoc(docRef, { likes: likes + 1 });
};

window.deletePost = async (id, userId) => {
  if (auth.currentUser.uid !== userId) return alert("Can't delete");
  const docRef = doc(db, "posts", id);
  await updateDoc(docRef, { text: "[deleted]" });
};
