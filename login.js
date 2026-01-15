import { auth } from './firebase.js'; // make sure path matches your repo

// Keep user logged in and redirect
auth.onAuthStateChanged(user => {
    if (user) {
        window.location.href = 'feed.html'; // redirect logged-in users automatically
    }
});

const loginBtn = document.getElementById('loginBtn');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');

loginBtn.addEventListener('click', async () => {
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {
        loginError.textContent = "Please enter both email and password.";
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
        // Only redirect after login succeeds
        window.location.href = 'feed.html';
    } catch (err) {
        console.error("Login failed:", err);
        loginError.textContent = "Login failed: " + err.message;
    }
});
