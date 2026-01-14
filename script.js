// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

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
const db = getFirestore(app);

// DOM elements
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const usernameInput = document.getElementById("usernameInput");
const messageDiv = document.getElementById("message");

// Helper function to show messages
function showMessage(msg, color="red") {
  messageDiv.textContent = msg;
  messageDiv.style.color = color;
}

// SIGN UP
signupBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const username = usernameInput.value.trim();

  if (!email || !password || !username) {
    showMessage("Please fill all fields.");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Set display name
    await updateProfile(user, { displayName: username });

    // Create Firestore user doc
    await setDoc(doc(db, "users", user.uid), {
      username: username,
      email: email,
      createdAt: new Date().toISOString(),
      bio: "",
      location: "",
      music: "",
      topFriends: []
    });

    showMessage("Signup successful!", "green");
    // Redirect to feed
    window.location.href = "feed.html";
  } catch (err) {
    console.error("Signup error:", err);
    showMessage(err.message);
  }
});

// LOGIN
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage("Please enter email and password.");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    showMessage(`Welcome back, ${user.displayName || "User"}!`, "green");
    // Redirect to feed
    window.location.href = "feed.html";
  } catch (err) {
    console.error("Login error:", err);
    showMessage(err.message);
  }
});
