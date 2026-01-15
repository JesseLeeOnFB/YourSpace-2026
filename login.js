import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

// Redirect if already logged in, but only run this once
onAuthStateChanged(auth, (user) => {
  if (user && window.location.pathname.includes("index.html")) {
    window.location.replace("feed.html");
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // Only redirect after successful login, avoid double redirect
    window.location.replace("feed.html");
  } catch (err) {
    console.error("Login failed:", err);
    alert("Login failed. Check your email and password.");
  }
});
