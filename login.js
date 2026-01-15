import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const auth = getAuth();

// Grab form elements
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

// Form submit handler
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Both email and password are required.");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Logged in as:", userCredential.user.email);

    // Redirect safely after login
    window.location.replace("feed.html");
  } catch (err) {
    console.error("Login error:", err);
    alert("Failed to login. Check your email and password.");
  }
});

// Auto-redirect if already logged in
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User already logged in:", user.email);
    if (window.location.pathname.includes("index.html") || window.location.pathname === "/") {
      window.location.replace("feed.html");
    }
  }
});
