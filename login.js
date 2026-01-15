import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.replace("feed.html");
  } catch (err) {
    console.error("Login failed:", err);
    alert("Login failed. Check your email and password.");
  }
});

// Redirect if already logged in
onAuthStateChanged(auth, (user) => {
  if (user && (window.location.pathname.includes("index.html") || window.location.pathname === "/")) {
    window.location.replace("feed.html");
  }
});
