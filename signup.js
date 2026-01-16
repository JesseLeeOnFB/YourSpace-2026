// signup.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const signupBtn = document.getElementById("signupBtn");
const loginRedirectBtn = document.getElementById("loginRedirectBtn");
const signupError = document.getElementById("signupError");

// SIGN UP
signupBtn.addEventListener("click", async () => {
  signupError.textContent = "";
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    signupError.textContent = "Please enter both email and password.";
    return;
  }

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);

    // Create default user profile
    await setDoc(doc(db, "users", userCred.user.uid), {
      username: email.split("@")[0],
      bio: "",
      location: "",
      pfpURL: "default-avatar.png",
      topFriends: [],
      wallComments: [],
      musicURL: ""
    });

    window.location.href = "feed.html";
  } catch (err) {
    signupError.textContent = "Sign up failed: " + err.message;
  }
});

// Redirect to login
loginRedirectBtn.addEventListener("click", () => {
  window.location.href = "login.html";
});

// Auto-redirect if already logged in
auth.onAuthStateChanged(user => {
  if (user) window.location.href = "feed.html";
});
