import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const auth = getAuth();

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // Successful login redirects to feed page
    window.location.href = "feed.html";
  } catch (error) {
    console.error("Login failed:", error);
    alert("Login failed. Please check your email and password.");
  }
});
