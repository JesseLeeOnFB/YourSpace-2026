// signup.js - FIXED VERSION

import { initializeApp } from “https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js”;
import { getAuth, createUserWithEmailAndPassword } from “https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js”;
import { getFirestore, doc, setDoc, serverTimestamp } from “https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js”;

const firebaseConfig = {
apiKey: “AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8”,
authDomain: “yourspace-2026.firebaseapp.com”,
projectId: “yourspace-2026”,
storageBucket: “yourspace-2026.firebasestorage.app”,
messagingSenderId: “72667267302”,
appId: “1:72667267302:web:2bed5f543e05d49ca8fb27”
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Wait for DOM to load
window.addEventListener(‘DOMContentLoaded’, () => {
const form = document.getElementById(“signupForm”);

if (!form) {
console.error(“Form not found!”);
return;
}

form.addEventListener(“submit”, async (e) => {
e.preventDefault();
e.stopPropagation();

```
console.log("Form submitted!");

const email = document.getElementById("email").value.trim();
const password = document.getElementById("password").value.trim();
const confirmPassword = document.getElementById("confirmPassword").value.trim();
const acceptTerms = document.getElementById("acceptTerms").checked;
const errorDiv = document.getElementById("errorMessage");

errorDiv.textContent = "";

console.log("Email:", email);
console.log("Terms accepted:", acceptTerms);

if (!acceptTerms) {
  errorDiv.textContent = "You must accept the Terms & Conditions";
  return;
}

if (password !== confirmPassword) {
  errorDiv.textContent = "Passwords do not match!";
  return;
}

if (password.length < 6) {
  errorDiv.textContent = "Password must be at least 6 characters";
  return;
}

try {
  console.log("Creating user...");
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  console.log("User created! UID:", user.uid);
  
  const username = email.split("@")[0];
  
  console.log("Creating profile...");
  await setDoc(doc(db, "users", user.uid), {
    email: user.email,
    username: username,
    photoURL: "default-avatar.png",
    bio: "",
    location: "",
    theme: "default-theme",
    music: ["", "", "", ""],
    autoplay: true,
    topFriends: [],
    customHtml: "",
    savedPosts: [],
    loginStreak: 1,
    longestStreak: 1,
    lastLoginDate: new Date().getTime(),
    termsAcceptedAt: serverTimestamp(),
    createdAt: serverTimestamp()
  });
  
  console.log("Profile created! Redirecting...");
  alert("Account created! Redirecting to feed...");
  window.location.href = "feed.html";
  
} catch (error) {
  console.error("Signup error:", error);
  if (error.code === "auth/email-already-in-use") {
    errorDiv.textContent = "Email already in use. Please log in instead.";
  } else if (error.code === "auth/invalid-email") {
    errorDiv.textContent = "Invalid email address.";
  } else if (error.code === "auth/weak-password") {
    errorDiv.textContent = "Password is too weak. Use at least 6 characters.";
  } else {
    errorDiv.textContent = "Error: " + error.message;
  }
}
```

});
});

// Also redirect if already logged in
auth.onAuthStateChanged(user => {
if (user) {
console.log(“User already logged in, redirecting…”);
window.location.href = “feed.html”;
}
});
