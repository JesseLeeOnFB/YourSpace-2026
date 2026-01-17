import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import {
  getFirestore, doc, getDoc, setDoc, updateDoc,
  collection, addDoc, getDocs, query, orderBy, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// --------------------
// Firebase Init
// --------------------
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --------------------
// DOM Elements
// --------------------
const profileName = document.getElementById("profileName");
const profileBio = document.getElementById("profileBio");
const profilePic = document.getElementById("profilePic");

const bioInput = document.getElementById("bioInput");
const saveBioBtn = document.getElementById("saveBioBtn");

const pfpInput = document.getElementById("pfpInput");
const savePfpBtn = document.getElementById("savePfpBtn");

const wallInput = document.getElementById("wallInput");
const postWallBtn = document.getElementById("postWallBtn");
const wallContainer = document.getElementById("wallContainer");

const themeSelect = document.getElementById("themeSelect");

const top10Container = document.getElementById("top10FriendsContainer");

const musicInput = document.getElementById("musicInput");
const addMusicBtn = document.getElementById("addMusicBtn");
const playlistEl = document.getElementById("playlist");
const audioPlayer = document.getElementById("audioPlayer");

const customHTMLInput = document.getElementById("customHTMLInput");
const applyCustomHTMLBtn = document.getElementById("applyCustomHTMLBtn");
const resetCustomHTMLBtn = document.getElementById("resetCustomHTMLBtn");
const customHTMLPreview = document.getElementById("customHTMLPreview");

// --------------------
// State
// --------------------
let currentUser = null;
let viewedUserId = null;

// --------------------
// Auth Handling
// --------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }
  currentUser = user;

  const params = new URLSearchParams(window.location.search);
  viewedUserId = params.get("uid") || user.uid;

  await loadProfile(viewedUserId);
  await loadWall(viewedUserId);
  await loadTop10(viewedUserId);
  await loadPlaylist(viewedUserId);

  const isOwnProfile = viewedUserId === user.uid;
  bioInput.style.display = isOwnProfile ? "block" : "none";
  saveBioBtn.style.display = isOwnProfile ? "block" : "none";
  pfpInput.style.display = isOwnProfile ? "block" : "none";
  savePfpBtn.style.display = isOwnProfile ? "block" : "none";
  themeSelect.style.display = isOwnProfile ? "block" : "none";
  musicInput.style.display = isOwnProfile ? "block" : "none";
  addMusicBtn.style.display = isOwnProfile ? "block" : "none";
  customHTMLInput.style.display = isOwnProfile ? "block" : "none";
  applyCustomHTMLBtn.style.display = isOwnProfile ? "block" : "none";
  resetCustomHTMLBtn.style.display = isOwnProfile ? "block" : "none";
});

// --------------------
// Load Profile
// --------------------
async function loadProfile(uid) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, { bio: "", profilePicture: "", theme: "dark", top10Friends: [], musicPlaylist: [], createdAt: serverTimestamp() });
  }

  const data = (await getDoc(userRef)).data();
  profileName.textContent = data.username || "YourSpace User";
  profileBio.textContent = data.bio || "This is the bio lol";

  profilePic.src = data.profilePicture || "default-avatar.png";
  applyTheme(data.theme || "dark");
}

// --------------------
// Save Bio
// --------------------
saveBioBtn?.addEventListener("click", async () => {
  if (!bioInput.value.trim()) return;
  await updateDoc(doc(db, "users", currentUser.uid), { bio: bioInput.value.trim() });
  profileBio.textContent = bioInput.value.trim();
  bioInput.value = "";
});

// --------------------
// Save Profile Picture
// --------------------
savePfpBtn?.addEventListener("click", async () => {
  const file = pfpInput.files[0];
  if (!file) return alert("Select an image first");
  const pfpRef = ref(storage, `profilePictures/${currentUser.uid}`);
  await uploadBytes(pfpRef, file);
  const url = await getDownloadURL(pfpRef);
  await updateDoc(doc(db, "users", currentUser.uid), { profilePicture: url });
  profilePic.src = url;
  pfpInput.value = "";
});

// --------------------
// Wall Comments
// --------------------
async function loadWall(uid) {
  wallContainer.innerHTML = "";
  const q = query(collection(db, "users", uid, "wallComments"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "wall-post";
    div.innerHTML = `<strong>${data.username}</strong>: ${data.text}`;
    if (currentUser.uid === data.userId || currentUser.uid === uid) {
      const del = document.createElement("button");
      del.textContent = "Delete";
      del.onclick = async () => { await deleteDoc(doc(db, "users", uid, "wallComments", docSnap.id)); loadWall(uid); };
      div.appendChild(del);
    }
    wallContainer.appendChild(div);
  });
}

postWallBtn?.addEventListener("click", async () => {
  if (!wallInput.value.trim()) return;
  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const username = userSnap.data()?.username || "User";
  await addDoc(collection(db, "users", viewedUserId, "wallComments"), { text: wallInput.value.trim(), userId: currentUser.uid, username, createdAt: serverTimestamp() });
  wallInput.value = "";
  loadWall(viewedUserId);
});

// --------------------
// Themes
// --------------------
themeSelect?.addEventListener("change", async (e) => {
  const theme = e.target.value;
  applyTheme(theme);
  await updateDoc(doc(db, "users", currentUser.uid), { theme });
});

function applyTheme(theme) {
  document.body.className = "";
  document.body.classList.add(`theme-${theme}`);
}

// --------------------
// Top 10 Friends
// --------------------
async function loadTop10(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  const friends = snap.data()?.top10Friends || [];
  top10Container.innerHTML = "";
  friends.forEach(f => {
    const li = document.createElement("li");
    li.innerHTML = `<img src="${f.pfpURL || 'default-avatar.png'}"><span>${f.username || 'Unknown'}</span>`;
    li.onclick = () => { window.location.href = `profile.html?uid=${f.uid}`; };
    top10Container.appendChild(li);
  });
}

// --------------------
// Music Player
// --------------------
addMusicBtn?.addEventListener("click", async () => {
  const url = musicInput.value.trim();
  if (!url) return;
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const playlist = snap.data()?.musicPlaylist || [];
  playlist.push(url);
  await updateDoc(doc(db, "users", currentUser.uid), { musicPlaylist: playlist });
  musicInput.value = "";
  loadPlaylist(currentUser.uid);
});

async function loadPlaylist(uid) {
  playlistEl.innerHTML = "";
  const snap = await getDoc(doc(db, "users", uid));
  const playlist = snap.data()?.musicPlaylist || [];
  playlist.forEach(url => {
    const li = document.createElement("li");
    li.textContent = url;
    li.onclick = () => { audioPlayer.src = convertToEmbed(url); audioPlayer.play(); };
    playlistEl.appendChild(li);
  });
}

function convertToEmbed(url) {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const videoId = url.split("v=")[1] || url.split("/").pop();
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  }
  return url;
}

// --------------------
// Custom HTML
// --------------------
applyCustomHTMLBtn?.addEventListener("click", () => {
  customHTMLPreview.innerHTML = customHTMLInput.value;
});

resetCustomHTMLBtn?.addEventListener("click", () => {
  customHTMLPreview.innerHTML = "";
  customHTMLInput.value = "";
});
