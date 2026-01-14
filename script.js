// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// -------------------- Firebase Config --------------------
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// -------------------- DOM Elements --------------------
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const usernameInput = document.getElementById("username");

// -------------------- SIGNUP --------------------
signupBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const displayName = usernameInput.value.trim();

  if (!email || !password || !displayName) {
    alert("Please fill in all fields!");
    return;
  }

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    // Update display name in Firebase Auth
    await updateProfile(userCred.user, { displayName });

    // Create Firestore user document
    await setDoc(doc(db, "users", userCred.user.uid), {
      displayName,
      bio: "",
      photoURL: "",
      musicURL: "",
      theme: "",
      createdAt: serverTimestamp()
    });

    alert("Account created successfully!");
    window.location.href = "feed.html"; // redirect to feed page

  } catch (err) {
    console.error("Signup error:", err);
    alert(err.message);
  }
});

// -------------------- LOGIN --------------------
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Enter both email and password!");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "feed.html"; // redirect to feed page
  } catch (err) {
    console.error("Login error:", err);
    alert(err.message);
  }
});
