// /YourSpace-2026/script.js
console.log("🔥 script.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const displayNameInput = document.getElementById("displayName");

// Sign Up
signupBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const displayName = displayNameInput.value.trim();

  if (!email || !password || !displayName) return alert("Fill all fields");

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCred.user;

    // Save displayName in Firestore
    await setDoc(doc(db, "users", user.uid), {
      displayName,
      bio: "",
      location: "",
      photoURL: "",
      musicURL: "",
      themeCSS: ""
    });

    window.location.href = "feed.html";
  } catch (err) {
    alert(err.message);
  }
});

// Login
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) return alert("Fill all fields");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "feed.html";
  } catch (err) {
    alert(err.message);
  }
});
