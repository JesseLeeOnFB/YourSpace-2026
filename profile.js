import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, increment
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Firebase Config
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

// DOM Elements
const profilePic = document.getElementById("profilePic");
const profilePicInput = document.getElementById("profilePicInput");
const saveProfilePicBtn = document.getElementById("saveProfilePicBtn");
const bioInput = document.getElementById("bioInput");
const saveBioBtn = document.getElementById("saveBioBtn");
const bioDisplay = document.getElementById("bioDisplay");
const top10Container = document.getElementById("top10Container");
const wallInput = document.getElementById("wallInput");
const postWallBtn = document.getElementById("postWallBtn");
const wallPostsContainer = document.getElementById("wallPostsContainer");
const customHTMLInput = document.getElementById("customHTMLInput");
const saveCustomHTMLBtn = document.getElementById("saveCustomHTMLBtn");
const resetCustomHTMLBtn = document.getElementById("resetCustomHTMLBtn");
const musicURLInput = document.getElementById("musicURLInput");
const addMusicBtn = document.getElementById("addMusicBtn");
const musicContainer = document.getElementById("musicContainer");

const navFeedBtn = document.getElementById("feedNavBtn");
const navProfileBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

// Navigation
navFeedBtn?.addEventListener("click", () => window.location.href = "feed.html");
navProfileBtn?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => { await signOut(auth); window.location.href = "login.html"; });

// Helpers
async function getUsername(userId) {
  try {
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() && snap.data().username ? snap.data().username : "Anonymous";
  } catch { return "Anonymous"; }
}

// Load profile info
async function loadProfile(uid) {
  const userId = uid || auth.currentUser.uid;
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return;

  const data = snap.data();
  profilePic.src = data.pfpURL || "default-avatar.png";
  bioDisplay.textContent = data.bio || "This is your bio...";
  bioInput.value = data.bio || "";

  // Top 10
  top10Container.innerHTML = "";
  (data.top10Friends || []).forEach(f => {
    const div = document.createElement("div");
    div.innerHTML = `<img src="${f.pfpURL || 'default-avatar.png'}"><a href="profile.html?uid=${f.uid}">${f.username}</a>`;
    top10Container.appendChild(div);
  });
}

// Save PFP
saveProfilePicBtn.addEventListener("click", async () => {
  if (!profilePicInput.files[0]) return alert("Select a file first");
  const file = profilePicInput.files[0];
  const storageRef = ref(storage, `pfp/${auth.currentUser.uid}/${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db, "users", auth.currentUser.uid), { pfpURL: url });
  profilePic.src = url;
  profilePicInput.value = "";
});

// Save Bio
saveBioBtn.addEventListener("click", async () => {
  await updateDoc(doc(db, "users", auth.currentUser.uid), { bio: bioInput.value });
  bioDisplay.textContent = bioInput.value;
});

// Wall Posts
async function loadWall() {
  wallPostsContainer.innerHTML = "";
  const snap = await getDocs(query(collection(db, "users", auth.currentUser.uid, "wallPosts"), orderBy("createdAt","desc")));
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "wall-post";
    div.innerHTML = `
      <p><strong>${data.username}</strong>: ${data.text}</p>
      ${data.userId === auth.currentUser.uid ? `<button class="delete-btn">Delete</button>` : ""}
    `;
    const deleteBtn = div.querySelector(".delete-btn");
    deleteBtn?.addEventListener("click", async () => {
      await deleteDoc(doc(db, "users", auth.currentUser.uid, "wallPosts", docSnap.id));
      div.remove();
    });
    wallPostsContainer.appendChild(div);
  });
}

// Post to wall
postWallBtn.addEventListener("click", async () => {
  if (!wallInput.value) return;
  const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  const username = userSnap.exists() ? userSnap.data().username : "Anonymous";
  await addDoc(collection(db, "users", auth.currentUser.uid, "wallPosts"), {
    text: wallInput.value,
    userId: auth.currentUser.uid,
    username,
    createdAt: new Date()
  });
  wallInput.value = "";
  loadWall();
});

// Custom HTML
saveCustomHTMLBtn.addEventListener("click", () => {
  const code = customHTMLInput.value;
  const container = document.getElementById("profilePage");
  container.innerHTML += code;
  localStorage.setItem("customHTML", code);
});
resetCustomHTMLBtn.addEventListener("click", () => {
  localStorage.removeItem("customHTML");
  location.reload();
});
window.addEventListener("load", () => {
  const saved = localStorage.getItem("customHTML");
  if (saved) document.getElementById("profilePage").innerHTML += saved;
});

// Preset Themes
document.querySelectorAll(".theme-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.body.className = btn.dataset.theme;
  });
});

// Music Player
addMusicBtn.addEventListener("click", () => {
  const url = musicURLInput.value.trim();
  if (!url) return;
  let embed = "";
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const videoId = url.split("v=")[1] || url.split("/")[3];
    embed = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  }
  // TODO: Add Spotify/Pandora/SoundCloud parsing
  musicContainer.innerHTML = embed;
});

// Auth
onAuthStateChanged(auth, user => {
  if (!user) window.location.href = "login.html";
  else loadProfile();
});
