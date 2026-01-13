console.log("🔥 feed.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

const postInput = document.getElementById("postInput");
const createPostBtn = document.getElementById("createPostBtn");
const feedDiv = document.getElementById("feed");
const logoutBtn = document.getElementById("logoutBtn");

onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = "index.html";

  // Logout
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });

  // Create post
  createPostBtn.addEventListener("click", async () => {
    if (!postInput.value.trim()) return alert("Enter something!");
    await addDoc(collection(db, "posts"), {
      text: postInput.value.trim(),
      userId: user.uid,
      username: user.displayName || "Anonymous",
      timestamp: serverTimestamp()
    });
    postInput.value = "";
    loadFeed();
  });

  // Load feed
  async function loadFeed() {
    feedDiv.innerHTML = "";
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      const postEl = document.createElement("div");
      postEl.className = "post";
      postEl.innerHTML = `<strong>${data.username}</strong>: ${data.text}`;
      feedDiv.appendChild(postEl);
    });
  }

  loadFeed();
});
