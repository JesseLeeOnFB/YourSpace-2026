console.log("🔥 feed.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
const postBtn = document.getElementById("postBtn");
const postInput = document.getElementById("postText");
const feedContainer = document.getElementById("feedContainer");
const logoutBtn = document.getElementById("logoutBtn");
const profileBtn = document.getElementById("profileBtn");

// Redirect if not logged in
onAuthStateChanged(auth, user => {
  if (!user) return window.location.href = "index.html";
  loadPosts();
});

// Post
postBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  const text = postInput.value.trim();
  if (!text) return alert("Write something first");
  try {
    await addDoc(collection(db, "posts"), {
      text,
      userId: user.uid,
      displayName: user.displayName || "Anonymous",
      createdAt: serverTimestamp(),
      likes: 0
    });
    postInput.value = "";
    loadPosts();
  } catch (err) { console.error(err); alert(err.message); }
});

// Logout/Profile
logoutBtn.addEventListener("click", () => signOut(auth).then(()=> window.location.href="index.html"));
profileBtn.addEventListener("click", () => window.location.href="profile.html"));

// Load Posts
async function loadPosts() {
  feedContainer.innerHTML = "";
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const postDiv = document.createElement("div");
    postDiv.className = "post";
    postDiv.innerHTML = `
      <strong>${data.displayName}</strong><br/>
      ${data.text}<br/>
      <button onclick="likePost('${docSnap.id}', ${data.likes})">Like (${data.likes || 0})</button>
      <button onclick="deletePost('${docSnap.id}', '${data.userId}')">Delete</button>
    `;
    feedContainer.appendChild(postDiv);
  });
}

// Like/Delete functions
window.likePost = async (postId, currentLikes) => {
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, { likes: (currentLikes || 0) + 1 });
  loadPosts();
};

window.deletePost = async (postId, postUserId) => {
  const user = auth.currentUser;
  if (user.uid !== postUserId) return alert("You can only delete your own posts");
  await deleteDoc(doc(db, "posts", postId));
  loadPosts();
};
