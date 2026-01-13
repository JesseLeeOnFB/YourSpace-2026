console.log("🔥 script.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const authContainer = document.getElementById("authContainer");
const welcomeContainer = document.getElementById("welcomeContainer");
const userEmailSpan = document.getElementById("userEmail");

// Sign up
signupBtn.addEventListener("click", () => {
  createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
    .then(userCredential => alert("Account created!"))
    .catch(error => alert(error.message));
});

// Login
loginBtn.addEventListener("click", () => {
  signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
    .then(userCredential => console.log("Logged in!"))
    .catch(error => alert(error.message));
});

// Logout
logoutBtn.addEventListener("click", () => signOut(auth));

// Auth state listener
onAuthStateChanged(auth, user => {
  if (user) {
    authContainer.style.display = "none";
    welcomeContainer.style.display = "block";
    userEmailSpan.textContent = user.email;
  } else {
    authContainer.style.display = "block";
    welcomeContainer.style.display = "none";
  }
});
