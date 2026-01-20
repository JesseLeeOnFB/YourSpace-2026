// signup.js - Username uniqueness enforcement

import { initializeApp } from “https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js”;
import { getAuth, createUserWithEmailAndPassword } from “https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js”;
import { getFirestore, collection, query, where, getDocs, doc, setDoc } from “https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js”;

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

// Check if username is unique
async function isUsernameUnique(username) {
const usernameQuery = query(
collection(db, “users”),
where(“username”, “==”, username.toLowerCase())
);

const snapshot = await getDocs(usernameQuery);
return snapshot.empty;
}

document.getElementById(“signupBtn”)?.addEventListener(“click”, async () => {
const email = document.getElementById(“emailInput”).value.trim();
const password = document.getElementById(“passwordInput”).value;
const username = document.getElementById(“usernameInput”).value.trim();
const termsAccepted = document.getElementById(“termsCheckbox”)?.checked;

if (!email || !password || !username) {
alert(“Please fill in all fields”);
return;
}

if (!termsAccepted) {
alert(“You must accept the Terms & Conditions to create an account”);
return;
}

if (username.length < 3) {
alert(“Username must be at least 3 characters long”);
return;
}

if (username.length > 20) {
alert(“Username must be 20 characters or less”);
return;
}

// Check username uniqueness
try {
const isUnique = await isUsernameUnique(username);
if (!isUnique) {
alert(“This username is already taken. Please choose another.”);
return;
}

```
// Create account
const userCredential = await createUserWithEmailAndPassword(auth, email, password);
const user = userCredential.user;

// Create user profile
await setDoc(doc(db, "users", user.uid), {
  username: username.toLowerCase(),
  email: email,
  photoURL: "default-avatar.png",
  bio: "",
  location: "",
  theme: "default-theme",
  customHtml: "",
  music: ["", "", "", ""],
  autoplay: true,
  topFriends: [],
  createdAt: new Date(),
  stats: {
    posts: 0,
    comments: 0,
    reportsSubmitted: 0,
    reportsReceived: 0
  }
});

alert("Account created successfully!");
window.location.href = "feed.html";
```

} catch (error) {
console.error(“Signup error:”, error);
if (error.code === ‘auth/email-already-in-use’) {
alert(“This email is already registered. Please login instead.”);
} else if (error.code === ‘auth/weak-password’) {
alert(“Password should be at least 6 characters”);
} else {
alert(“Error creating account: “ + error.message);
}
}
});

// Login redirect
document.getElementById(“loginLink”)?.addEventListener(“click”, () => {
window.location.href = “login.html”;
});
