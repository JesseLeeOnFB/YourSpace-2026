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
const authContainer = document.getElementById("auth-container");
const welcomeContainer = document.getElementById("welcome-container");
const welcomeMsg = document.getElementById("welcomeMsg");

signupBtn.addEventListener("click", async () => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    alert("Signed up! " + userCredential.user.email);
  } catch (err) { alert(err.message); }
});

loginBtn.addEventListener("click", async () => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    alert("Logged in! " + userCredential.user.email);
  } catch (err) { alert(err.message); }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  authContainer.style.display = "block";
  welcomeContainer.style.display = "none";
});

onAuthStateChanged(auth, user => {
  if (user) {
    authContainer.style.display = "none";
    welcomeContainer.style.display = "block";
    welcomeMsg.textContent = "Welcome " + user.email;
  } else {
    authContainer.style.display = "block";
    welcomeContainer.style.display = "none";
  }
});
