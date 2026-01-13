console.log("🔥 script.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// =====================
// ⚡ Firebase Config ⚡
// =====================
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// =====================
// ⚡ DOM Elements ⚡
// =====================
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authMsg = document.getElementById("auth-msg");

// =====================
// ⚡ Auth Functions ⚡
// =====================
if (signupBtn) {
  signupBtn.addEventListener("click", async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
      authMsg.textContent = "✅ Signed Up!";
      window.location.href = "profile.html";
    } catch (err) {
      authMsg.textContent = "❌ " + err.message;
    }
  });
}

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
      authMsg.textContent = "✅ Logged In!";
      window.location.href = "profile.html";
    } catch (err) {
      authMsg.textContent = "❌ " + err.message;
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}

// =====================
// ⚡ Profile Page ⚡
// =====================
const saveProfileBtn = document.getElementById("saveProfileBtn");
if (saveProfileBtn) {
  saveProfileBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("Not logged in!");
    const profileData = {
      username: document.getElementById("username").value,
      theme: document.getElementById("theme").value,
      music: document.getElementById("music").value
    };
    await setDoc(doc(db, "users", user.uid), profileData);
    alert("Profile saved!");
  });
}

// =====================
// ⚡ Posting ⚡
// =====================
const createPostBtn = document.getElementById("createPostBtn");
if (createPostBtn) {
  createPostBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("Not logged in!");
    const postData = {
      title: document.getElementById("postTitle").value,
      content: document.getElementById("postContent").value,
      image: document.getElementById("postImage").value,
      author: user.uid,
      timestamp: Date.now()
    };
    await addDoc(collection(db, "posts"), postData);
    alert("Post created!");
    window.location.reload();
  });
}

// =====================
// ⚡ Load Feed ⚡
// =====================
const feed = document.getElementById("feed");
if (feed) {
  async function loadPosts() {
    const querySnapshot = await getDocs(collection(db, "posts"));
    feed.innerHTML = "";
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");
      postDiv.innerHTML = `
        <h3>${data.title}</h3>
        <p>${data.content}</p>
        ${data.image ? `<img src="${data.image}" style="max-width:100%">` : ""}
      `;
      feed.appendChild(postDiv);
    });
  }
  loadPosts();
}
