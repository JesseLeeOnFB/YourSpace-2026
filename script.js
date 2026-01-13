console.log("🔥 script.js LOADED");
alert("JS LOADED");
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log("🔥 script.js loaded");

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

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// DOM elements
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

if (signupBtn) {
    signupBtn.addEventListener("click", async () => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
            await updateProfile(userCredential.user, { displayName: usernameInput.value });
            await setDoc(doc(db, "users", userCredential.user.uid), {
                username: usernameInput.value,
                email: emailInput.value
            });
            window.location.href = "feed.html";
        } catch (err) { console.error(err); alert(err.message); }
    });
}

if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
            window.location.href = "feed.html";
        } catch (err) { console.error(err); alert(err.message); }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await signOut(auth);
        window.location.href = "index.html";
    });
}
