// login.js
import { auth } from "./firebase.js";

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    loginError.textContent = "";

    try {
        await auth.signInWithEmailAndPassword(email, password);
        // Redirect to feed only after successful login
        window.location.href = "feed.html";
    } catch (err) {
        console.error("Login error:", err);
        loginError.textContent = "Login failed. Check email and password.";
    }
});

// Optional: auto-redirect if already logged in
auth.onAuthStateChanged((user) => {
    if (user) {
        // Already logged in, go to feed
        if (!window.location.href.includes("feed.html")) {
            window.location.href = "feed.html";
        }
    }
});
