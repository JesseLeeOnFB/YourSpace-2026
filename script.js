// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-firestore.js";

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

// ------------------- LOGIN -------------------
const loginBtn = document.getElementById("loginBtn");
loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Login success:", userCredential.user.uid);
    window.location.href = "feed.html";
  } catch (error) {
    console.error("Login failed:", error.message);
    alert("Login failed: " + error.message);
  }
});

// ------------------- SIGN UP -------------------
const signupBtn = document.getElementById("signupBtn");
signupBtn.addEventListener("click", async () => {
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  const username = document.getElementById("signupUsername").value.trim();

  if (!username) {
    alert("Please enter a username.");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, { displayName: username });

    // Create a users doc in Firestore
    await setDoc(doc(db, "users", user.uid), {
      username: username,
      createdAt: new Date(),
      bio: "",
      location: "",
      music: ""
    });

    console.log("Sign-up success:", user.uid);
    window.location.href = "feed.html";
  } catch (error) {
    console.error("Sign-up failed:", error.message);
    alert("Sign-up failed: " + error.message);
  }
});
