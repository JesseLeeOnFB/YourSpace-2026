console.log("🔥 script.js loaded");

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase config
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
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const authMsg = document.getElementById("authMsg");

// Sign Up
signupBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) return (authMsg.textContent = "Enter email and password");
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    // create user doc
    await setDoc(doc(db, "users", user.uid), { email, username: "", bio: "", music: "", photoURL: "" });
    authMsg.textContent = "Account created! Redirecting...";
    setTimeout(() => { window.location.href = "profile.html"; }, 1000);
  } catch (err) {
    authMsg.textContent = err.message;
  }
});

// Login
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) return (authMsg.textContent = "Enter email and password");
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    authMsg.textContent = "Login successful! Redirecting...";
    setTimeout(() => { window.location.href = "feed.html"; }, 500);
  } catch (err) {
    authMsg.textContent = err.message;
  }
});

// Redirect if already logged in
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "feed.html";
  }
});
