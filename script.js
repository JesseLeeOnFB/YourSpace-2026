console.log("🔥 script.js loaded");

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const profileBtn = document.getElementById("profileBtn");
const feedBtn = document.getElementById("feedBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const usernameInput = document.getElementById("username");
const welcomeMsg = document.getElementById("welcomeMsg");
const authContainer = document.getElementById("authContainer");
const navContainer = document.getElementById("navContainer");

// Sign Up
signupBtn.addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  const username = usernameInput.value;

  if (!email || !password || !username) return alert("Enter all fields!");

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: username });

    // Create Firestore user doc
    await setDoc(doc(db, "users", user.uid), { username, email, bio:"", location:"", music:"", theme:"", photoUrl:"" });

  } catch (error) {
    alert(error.message);
  }
});

// Login
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  if (!email || !password) return alert("Enter email and password");

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert(error.message);
  }
});

// Logout
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

// Navigation
profileBtn.addEventListener("click", () => window.location.href = "profile.html");
feedBtn.addEventListener("click", () => window.location.href = "feed.html");

// Auth state
onAuthStateChanged(auth, (user) => {
  if (user) {
    authContainer.style.display = "none";
    navContainer.style.display = "block";
    welcomeMsg.innerText = `Welcome, ${user.displayName || user.email}`;
  } else {
    authContainer.style.display = "block";
    navContainer.style.display = "none";
  }
});
