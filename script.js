// ---------------------------
// Import Firebase modules
// ---------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, setDoc, doc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// ---------------------------
// Firebase config
// ---------------------------
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

// ---------------------------
// Initialize Firebase
// ---------------------------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------------------------
// DOM elements
// ---------------------------
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");

const signupUsername = document.getElementById("signupUsername");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupBtn = document.getElementById("signupBtn");

// ---------------------------
// Login
// ---------------------------
loginBtn.addEventListener("click", async () => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
    console.log("Login successful:", userCredential.user.email);
    window.location.href = "feed.html";
  } catch (error) {
    console.error("Login failed:", error);
    alert("Login failed: " + error.message);
  }
});

// ---------------------------
// Sign Up
// ---------------------------
signupBtn.addEventListener("click", async () => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, signupEmail.value, signupPassword.value);
    console.log("Sign up successful:", userCredential.user.email);

    // Create Firestore user doc with username
    const userRef = doc(db, "users", userCredential.user.uid);
    await setDoc(userRef, {
      username: signupUsername.value || "Anonymous",
      bio: "",
      location: "",
      music: "",
      topFriends: []
    });

    window.location.href = "feed.html";
  } catch (error) {
    console.error("Sign up failed:", error);
    alert("Sign up failed: " + error.message);
  }
});
