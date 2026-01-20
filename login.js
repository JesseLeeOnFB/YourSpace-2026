// login.js
import { initializeApp } from “https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js”;
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from “https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js”;
import { getFirestore, doc, setDoc, getDoc, updateDoc } from “https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js”;

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

// DOM
const emailInput = document.getElementById(“emailInput”);
const passwordInput = document.getElementById(“passwordInput”);
const loginBtn = document.getElementById(“loginBtn”);
const signupBtn = document.getElementById(“signupBtn”);
const loginError = document.getElementById(“loginError”);

// LOGIN
loginBtn.addEventListener(“click”, async () => {
loginError.textContent = “”;
const email = emailInput.value.trim();
const password = passwordInput.value.trim();

if (!email || !password) {
loginError.textContent = “Please enter both email and password.”;
return;
}

try {
const userCred = await signInWithEmailAndPassword(auth, email, password);
const userId = userCred.user.uid;

```
// Track login streak (Features #11, #12)
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
    // Already logged in today, don't change streak
  } else if (lastLoginDay === yesterday) {
    // Consecutive day login
    newStreak += 1;
  } else {
    // Streak broken, start new
    newStreak = 1;
  }
  
  // Update longest streak if current is higher
  if (newStreak > longestStreak) {
    longestStreak = newStreak;
  }
  
  await updateDoc(userRef, {
    lastLoginDate: now.getTime(),
    loginStreak: newStreak,
    longestStreak: longestStreak
  });
}

window.location.href = "feed.html"; // redirect to feed
```

} catch (err) {
loginError.textContent = “Login failed: “ + err.message;
}
});

// SIGN UP
signupBtn.addEventListener(“click”, async () => {
loginError.textContent = “”;
const email = emailInput.value.trim();
const password = passwordInput.value.trim();

if (!email || !password) {
loginError.textContent = “Please enter both email and password.”;
return;
}

try {
const userCred = await createUserWithEmailAndPassword(auth, email, password);

```
// Create default user profile in Firestore
await setDoc(doc(db, "users", userCred.user.uid), {
  username: email.split("@")[0],
  bio: "",
  location: "",
  pfpURL: "default-avatar.png",
  topFriends: [],
  wallComments: [],
  musicURL: ""
});

window.location.href = "feed.html"; // redirect to feed
```

} catch (err) {
loginError.textContent = “Sign up failed: “ + err.message;
}
});

// Auto-redirect if already logged in
auth.onAuthStateChanged(user => {
if (user) {
window.location.href = “feed.html”;
}
});
