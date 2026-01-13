// feed.js
console.log("🔥 feed.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// DOM elements
const postBtn = document.getElementById("postBtn");
const postInput = document.getElementById("postText");
const feedContainer = document.getElementById("feedContainer");
const logoutBtn = document.getElementById("logoutBtn");

// LOGOUT
logoutBtn.addEventListener("click", () => {
  signOut(auth).then(() => location.href = "index.html");
});

// POST
postBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  const text = postInput.value.trim();

  if (!user) {
    alert("You must be logged in!");
    return;
  }

  if (!text) {
    alert("Write something first!");
    return;
  }

  try {
    await addDoc(collection(db, "posts"), {
      text,
      userId: user.uid,
      displayName: user.displayName || user.email,
      photoURL: user.photoURL || "",
      createdAt: serverTimestamp()
    });

    postInput.value = "";
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});

// LIVE FEED
const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
onSnapshot(q, (snapshot) => {
  feedContainer.innerHTML = ""; // Clear feed
  snapshot.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.classList.add("post");

    div.innerHTML = `
      <strong>${data.displayName}</strong><br>
      ${data.text}<br>
      <small>${data.createdAt?.toDate ? data.createdAt.toDate() : ''}</small>
    `;

    feedContainer.appendChild(div);
  });
});
