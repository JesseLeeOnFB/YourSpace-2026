import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// ---------------------
// Firebase Config
// ---------------------
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ---------------------
// DOM Elements
// ---------------------
const profilePfp = document.getElementById("profilePfp");
const profileUsername = document.getElementById("profileUsername");
const profileBio = document.getElementById("profileBio");
const wallContainer = document.getElementById("wallContainer");
const wallInput = document.getElementById("wallInput");
const wallPostBtn = document.getElementById("wallPostBtn");
const top10Container = document.getElementById("top10Container");
const customHtmlInput = document.getElementById("customHtmlInput");
const saveCustomHtmlBtn = document.getElementById("saveCustomHtmlBtn");
const customProfileContainer = document.getElementById("customProfileContainer");

const navFeedBtn = document.getElementById("feedNavBtn");
const navProfileBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ---------------------
// Navigation
// ---------------------
navFeedBtn?.addEventListener("click", () => window.location.href = "feed.html");
navProfileBtn?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// ---------------------
// Helpers
// ---------------------
async function getUserData(userId) {
  const snap = await getDoc(doc(db, "users", userId));
  return snap.exists() ? snap.data() : null;
}

// ---------------------
// Load Profile
// ---------------------
async function loadProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const data = await getUserData(user.uid);
  if (!data) return;

  profilePfp.src = data.pfpURL || "default-avatar.png";
  profileUsername.textContent = data.username || "Anonymous";
  profileBio.textContent = data.bio || "";

  // Wall posts
  wallContainer.innerHTML = "";
  const wallSnap = await getDocs(query(collection(db, "users", user.uid, "wall"), orderBy("createdAt", "desc")));
  wallSnap.forEach(docSnap => {
    const post = docSnap.data();
    const p = document.createElement("p");
    p.textContent = `${post.username || "Anonymous"}: ${post.text}`;
    wallContainer.appendChild(p);
  });

  // Top 10 friends
  top10Container.innerHTML = "";
  const friends = data.top10Friends || [];
  friends.forEach(f => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.textContent = f.username || "Unknown";
    top10Container.appendChild(div);
  });

  // Custom HTML/CSS
  if (data.customHtml) {
    customProfileContainer.innerHTML = data.customHtml;
  }
}

// ---------------------
// Post on Wall
// ---------------------
wallPostBtn.addEventListener("click", async () => {
  const text = wallInput.value.trim();
  if (!text) return;

  const user = auth.currentUser;
  const userData = await getUserData(user.uid);

  await addDoc(collection(db, "users", user.uid, "wall"), {
    username: userData.username || "Anonymous",
    text,
    createdAt: new Date()
  });

  wallInput.value = "";
  loadProfile();
});

// ---------------------
// Custom HTML / CSS Save
// ---------------------
saveCustomHtmlBtn?.addEventListener("click", async () => {
  const htmlCode = customHtmlInput.value;
  customProfileContainer.innerHTML = htmlCode;

  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    customHtml: htmlCode
  });
});

// ---------------------
// Auth State
// ---------------------
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    loadProfile();
  }
});
