import { getAuth, signInWithEmailAndPassword } 
from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const auth = getAuth();

const loginBtn = document.getElementById("loginBtn");
const emailInput = document.getElementById("loginEmail");
const passwordInput = document.getElementById("loginPassword");

loginBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        alert("Please enter email and password.");
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Logged in:", userCredential.user.uid);

        window.location.href = "feed.html";
    } catch (error) {
        console.error("Login failed:", error);
        alert("Login failed: " + error.message);
    }
});
