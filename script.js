import { auth } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// Elements
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authContainer = document.getElementById("auth-container");
const userInfo = document.getElementById("user-info");
const userEmailSpan = document.getElementById("user-email");

// Sign up
signupBtn.addEventListener("click", () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            alert("Sign Up successful!");
        })
        .catch((error) => {
            alert(error.message);
        });
});

// Login
loginBtn.addEventListener("click", () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            alert("Login successful!");
        })
        .catch((error) => {
            alert(error.message);
        });
});

// Logout
logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
        alert("Logged out!");
    });
});

// Monitor auth state
onAuthStateChanged(auth, (user) => {
    if (user) {
        authContainer.style.display = "none";
        userInfo.style.display = "block";
        userEmailSpan.textContent = user.email;
    } else {
        authContainer.style.display = "block";
        userInfo.style.display = "none";
        userEmailSpan.textContent = "";
    }
});
