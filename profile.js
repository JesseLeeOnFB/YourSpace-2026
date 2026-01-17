import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, orderBy, query
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

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
const storage = getStorage(app);
const auth = getAuth(app);

// ---------------------
// DOM Elements
// ---------------------
const profilePFP = document.getElementById("profilePFP");
const pfpInput = document.getElementById("pfpInput");
const savePfpBtn = document.getElementById("savePfpBtn");
const bioInput = document.getElementById("bioInput");
const saveBioBtn = document.getElementById("saveBioBtn");
const top10Container = document.getElementById("top10Container");

const musicInput = document.getElementById("musicInput");
const addMusicBtn = document.getElementById("addMusicBtn");
const musicPlayer = document.getElementById("musicPlayer");

const wallInput = document.getElementById("wallInput");
const postWallBtn = document.getElementById("postWallBtn");
const wallPostsContainer = document.getElementById("wallPostsContainer");

const presetThemeSelect = document.getElementById("presetThemeSelect");
const resetThemeBtn = document.getElementById("resetThemeBtn");

// ---------------------
// Helpers
// ---------------------
async function getUserData(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

// ---------------------
// Auth State
// ---------------------
let currentUser = null;
onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = "login.html";
  currentUser = user;
  await loadProfile();
  await loadTop10();
  await loadWall();
});

// ---------------------
// Load Profile
// ---------------------
async function loadProfile() {
  const data = await getUserData(currentUser.uid);
  if (!data) return;

  profilePFP.src = data.pfpURL || "default-avatar.png";
  bioInput.value = data.bio || "This is the bio...";
}

// ---------------------
// Update Profile Picture
// ---------------------
savePfpBtn.addEventListener("click", async () => {
  const file = pfpInput.files[0];
  if (!file) return alert("Select a file first");

  const storageRef = ref(storage, `profilePictures/${currentUser.uid}_${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  profilePFP.src = url;
  await updateDoc(doc(db, "users", currentUser.uid), { pfpURL: url });
  alert("Profile picture updated!");
});

// ---------------------
// Update Bio
// ---------------------
saveBioBtn.addEventListener("click", async () => {
  await updateDoc(doc(db, "users", currentUser.uid), { bio: bioInput.value });
  alert("Bio updated!");
});

// ---------------------
// Top 10 Friends
// ---------------------
async function loadTop10() {
  const data = await getUserData(currentUser.uid);
  const friends = data.top10Friends || [];
  top10Container.innerHTML = "";
  for (const f of friends) {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `<img src="${f.pfpURL||'default-avatar.png'}" width="40" height="40" style="border-radius:50%;"> ${f.username || 'Unknown'}`;
    div.addEventListener("click", () => window.location.href = `profile.html?uid=${f.uid}`);
    top10Container.appendChild(div);
  }
}

// ---------------------
// Wall Posts
// ---------------------
postWallBtn.addEventListener("click", async () => {
  const text = wallInput.value.trim();
  if (!text) return alert("Cannot post empty wall message");

  await addDoc(collection(db, "users", currentUser.uid, "wall"), {
    userId: currentUser.uid,
    text,
    createdAt: new Date()
  });

  wallInput.value = "";
  await loadWall();
});

async function loadWall() {
  wallPostsContainer.innerHTML = "";
  const q = query(collection(db, "users", currentUser.uid, "wall"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "wall-post";
    div.innerHTML = `<span class="post-user" data-uid="${data.userId}">${data.userId}</span>: ${data.text}`;
    div.querySelector(".post-user").addEventListener("click", e => {
      window.location.href = `profile.html?uid=${e.target.dataset.uid}`;
    });
    wallPostsContainer.appendChild(div);
  });
}

// ---------------------
// Music Player
// ---------------------
addMusicBtn.addEventListener("click", () => {
  const link = musicInput.value.trim();
  if (!link) return;
  let embedHTML = "";

  if (link.includes("youtube.com") || link.includes("youtu.be")) {
    const videoId = link.split("v=")[1] || link.split("/").pop();
    embedHTML = `<iframe width="300" height="150" src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  } else if (link.includes("spotify.com")) {
    embedHTML = `<iframe src="https://open.spotify.com/embed/${link.split(".com/")[1]}" width="300" height="80" frameborder="0" allow="autoplay; encrypted-media"></iframe>`;
  }

  musicPlayer.innerHTML = embedHTML;
  musicInput.value = "";
});

// ---------------------
// Themes
// ---------------------
presetThemeSelect.addEventListener("change", () => applyTheme(presetThemeSelect.value));
resetThemeBtn.addEventListener("click", () => applyTheme("default"));

function applyTheme(theme) {
  if (theme === "dark") {
    document.body.style.backgroundColor = "#111";
    document.body.style.color = "#fff";
  } else if (theme === "light") {
    document.body.style.backgroundColor = "#fff";
    document.body.style.color = "#000";
  } else if (theme === "retro") {
    document.body.style.backgroundColor = "#fbb148";
    document.body.style.color = "#111";
  } else {
    document.body.style.backgroundColor = "#222";
    document.body.style.color = "#fff";
  }
}
