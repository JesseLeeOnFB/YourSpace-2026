import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc,
  updateDoc, getDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

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
const pfpImg = document.getElementById("pfp");
const usernameDisplay = document.getElementById("usernameDisplay");
const bioDisplay = document.getElementById("bioDisplay");

const wallContainer = document.getElementById("wallPostsContainer");
const wallInput = document.getElementById("wallInput");
const postWallBtn = document.getElementById("postWallBtn");

const customHtmlInput = document.getElementById("customHtmlInput");
const applyCustomBtn = document.getElementById("applyCustomBtn");
const resetCustomBtn = document.getElementById("resetCustomBtn");

const top10Container = document.getElementById("top10FriendsContainer");

const musicInput = document.getElementById("musicLinkInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const clearMusicBtn = document.getElementById("clearMusicBtn");
const musicEmbedContainer = document.getElementById("musicEmbedContainer");

// NAVIGATION
document.getElementById("feedNavBtn").addEventListener("click", () => window.location.href = "feed.html");
document.getElementById("profileNavBtn").addEventListener("click", () => window.location.href = "profile.html");

// ---------------------
// Helpers
// ---------------------
async function loadProfile() {
  const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
  if (!snap.exists()) return;

  const data = snap.data();
  pfpImg.src = data.pfpURL || "default-avatar.png";
  usernameDisplay.textContent = data.username || "Anonymous";
  bioDisplay.textContent = data.bio || "No bio set";

  // Load Top 10 friends
  top10Container.innerHTML = "";
  (data.top10Friends || []).forEach(f => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `<img src="${f.pfpURL||'default-avatar.png'}" width="30" height="30" style="border-radius:50%;"> ${f.username || 'Unknown'}`;
    top10Container.appendChild(div);
  });

  // Load music
  if (data.musicURL) {
    musicEmbedContainer.innerHTML = `<iframe src="${data.musicURL}" allow="autoplay; encrypted-media"></iframe>`;
  }
}

// ---------------------
// WALL POSTS
// ---------------------
async function loadWallPosts() {
  wallContainer.innerHTML = "";
  const snap = await getDocs(query(collection(db, "wall"), orderBy("createdAt", "desc")));
  snap.forEach(docSnap => {
    const post = docSnap.data();
    const div = document.createElement("div");
    div.className = "wall-post";
    div.innerHTML = `<p><strong>${post.username}:</strong> ${post.text}</p>`;
    wallContainer.appendChild(div);
  });
}

postWallBtn?.addEventListener("click", async () => {
  const text = wallInput.value.trim();
  if (!text) return;
  const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
  const username = snap.exists() ? snap.data().username : "Anonymous";

  await addDoc(collection(db, "wall"), {
    userId: auth.currentUser.uid,
    username,
    text,
    createdAt: new Date()
  });

  wallInput.value = "";
  loadWallPosts();
});

// ---------------------
// CUSTOM HTML / THEME
// ---------------------
applyCustomBtn?.addEventListener("click", () => {
  const code = customHtmlInput.value.trim();
  const container = document.getElementById("profilePage");
  container.innerHTML += code;
});

resetCustomBtn?.addEventListener("click", () => {
  location.reload();
});

// ---------------------
// MUSIC PLAYER
// ---------------------
function convertToEmbed(url) {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const id = url.split("v=")[1]?.split("&")[0] || url.split("/").pop();
    return `https://www.youtube.com/embed/${id}`;
  }
  if (url.includes("spotify.com")) {
    return url.replace("open.spotify.com", "open.spotify.com/embed");
  }
  if (url.includes("soundcloud.com")) {
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}`;
  }
  return null;
}

saveMusicBtn?.addEventListener("click", async () => {
  const link = musicInput.value.trim();
  const embed = convertToEmbed(link);
  if (!embed) return alert("Unsupported link");

  await updateDoc(doc(db, "users", auth.currentUser.uid), { musicURL: embed });
  musicEmbedContainer.innerHTML = `<iframe src="${embed}" allow="autoplay; encrypted-media"></iframe>`;
  musicInput.value = "";
});

clearMusicBtn?.addEventListener("click", async () => {
  await updateDoc(doc(db, "users", auth.currentUser.uid), { musicURL: "" });
  musicEmbedContainer.innerHTML = "";
});

// ---------------------
// LOAD ALL ON AUTH
// ---------------------
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    loadProfile();
    loadWallPosts();
  }
});
