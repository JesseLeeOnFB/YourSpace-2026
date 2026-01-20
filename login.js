// login.js - FIXED VERSION

import { initializeApp } from “https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js”;
import { getAuth, signInWithEmailAndPassword } from “https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js”;
import { getFirestore, doc, getDoc, updateDoc } from “https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js”;

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

// Wait for DOM
window.addEventListener(‘DOMContentLoaded’, () => {
const emailInput = document.getElementById(“emailInput”);
const passwordInput = document.getElementById(“passwordInput”);
const loginBtn = document.getElementById(“loginBtn”);
const signupBtn = document.getElementById(“signupBtn”);
const loginError = document.getElementById(“loginError”);

// LOGIN
loginBtn.addEventListener(“click”, async () => {
console.log(“Login clicked!”);
loginError.textContent = “”;
const email = emailInput.value.trim();
const password = passwordInput.value.trim();

```
if (!email || !password) {
  loginError.textContent = "Please enter both email and password.";
  return;
}

try {
  console.log("Logging in...");
  const userCred = await signInWithEmailAndPassword(auth, email, password);
  const userId = userCred.user.uid;
  
  console.log("Logged in! UID:", userId);
  
  // Track login streak
  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    const userData = userDoc.data();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const lastLogin = userData.lastLoginDate || 0;
    const lastLoginDay = new Date(lastLogin).setHours(0, 0, 0, 0);
    const yesterday = today - (24 * 60 * 60 * 1000);
    
    let newStreak = userData.loginStreak || 0;
    let longestStreak = userData.longestStreak || 0;
    
    if (lastLoginDay === today) {
      // Same day
    } else if (lastLoginDay === yesterday) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }
    
    if (newStreak > longestStreak) {
      longestStreak = newStreak;
    }
    
    await updateDoc(userRef, {
      lastLoginDate: now.getTime(),
      loginStreak: newStreak,
      longestStreak: longestStreak
    });
  }
  
  console.log("Redirecting to feed...");
  window.location.href = "feed.html";
} catch (err) {
  console.error("Login error:", err);
  loginError.textContent = "Login failed: " + err.message;
}
```

});

// SIGNUP - Redirect
signupBtn.addEventListener(“click”, () => {
console.log(“Redirecting to signup…”);
window.location.href = “signup.html”;
});
});

// Auto-redirect if already logged in
auth.onAuthStateChanged(user => {
if (user) {
console.log(“Already logged in, redirecting…”);
window.location.href = “feed.html”;
}
});
