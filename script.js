// Firebase SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Grab DOM elements
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const usernameInput = document.getElementById("usernameInput");
const messageDiv = document.getElementById("message");

// Login handler
loginBtn.addEventListener("click", async () => {
  messageDiv.textContent = "";
  try {
    const userCredential = await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    console.log("Login successful:", userCredential.user.uid);
    window.location.href = "feed.html"; // Redirect to feed
  } catch (err) {
    console.error("Login error:", err);
    messageDiv.textContent = "Login failed. Check email/password.";
  }
});

// Signup handler
signupBtn.addEventListener("click", async () => {
  messageDiv.textContent = "";
  if (!usernameInput.value) {
    messageDiv.textContent = "Please enter a username.";
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
    console.log("Signup successful:", userCredential.user.uid);

    // Save username to Firestore
    import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
    const db = getFirestore(app);
    await setDoc(doc(db, "users", userCredential.user.uid), {
      username: usernameInput.value,
      createdAt: new Date()
    });

    window.location.href = "feed.html"; // Redirect to feed
  } catch (err) {
    console.error("Signup error:", err);
    messageDiv.textContent = "Signup failed. Check console.";
  }
});
