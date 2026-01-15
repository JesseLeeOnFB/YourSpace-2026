import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const auth = getAuth();

const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Both email and password are required.");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "feed.html"; // redirect to feed after login
  } catch (err) {
    console.error("Login error:", err);
    alert("Failed to login. Check your email and password.");
  }
});

// Auto-redirect if already logged in
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "feed.html";
  }
});
