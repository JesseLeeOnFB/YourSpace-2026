// feed.js
console.log("🔥 feed.js loaded");

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { initializeApp } from
"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

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

postBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  const text = postInput.value.trim();

  if (!user) {
    alert("You must be logged in");
    return;
  }

  if (!text) {
    alert("Write something first");
    return;
  }

  try {
    // Load user profile
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
    alert("Posted!");
  } catch (err) {
    console.error("POST ERROR:", err);
    alert(err.message);
  }
});
