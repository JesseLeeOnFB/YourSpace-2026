// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.29.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/9.29.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.29.0/firebase-firestore.js";

// Firebase Config
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

// Elements
const signupUsername = document.getElementById("signupUsername");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");
const signupBtn = document.getElementById("signupBtn");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");

const authMessage = document.getElementById("authMessage");

// Signup
signupBtn.addEventListener("click", async () => {
  authMessage.textContent = "";
  if (!signupUsername.value || !signupEmail.value || !signupPassword.value) {
    authMessage.textContent = "Please fill out all signup fields.";
    return;
  }
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, signupEmail.value, signupPassword.value);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, { displayName: signupUsername.value });

    // Create user doc in Firestore
    await setDoc(doc(db, "users", user.uid), {
      username: signupUsername.value,
      email: signupEmail.value,
      createdAt: new Date(),
      bio: "",
      location: "",
      music: "",
      top10Friends: []
    });

    authMessage.style.color = "green";
    authMessage.textContent = "Signup successful! Redirecting to feed...";
    setTimeout(() => { window.location.href = "feed.html"; }, 1000);

  } catch (err) {
    console.error(err);
    authMessage.style.color = "red";
    authMessage.textContent = "Signup failed: " + err.message;
  }
});

// Login
loginBtn.addEventListener("click", async () => {
  authMessage.textContent = "";
  if (!loginEmail.value || !loginPassword.value) {
    authMessage.textContent = "Please fill out all login fields.";
    return;
  }
  try {
    const userCredential = await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
    authMessage.style.color = "green";
    authMessage.textContent = "Login successful! Redirecting to feed...";
    setTimeout(() => { window.location.href = "feed.html"; }, 500);
  } catch (err) {
    console.error(err);
    authMessage.style.color = "red";
    authMessage.textContent = "Login failed: " + err.message;
  }
});
