import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Firebase config
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

// DOM Elements
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

const musicInput = document.getElementById("musicInput");
const addSongBtn = document.getElementById("addSongBtn");
const musicPlaylist = document.getElementById("musicPlaylist");
const musicPlayer = document.getElementById("musicPlayer");

const navFeedBtn = document.getElementById("feedNavBtn");
const navProfileBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

// State
let currentUser = null;
let viewedUserId = null;

// Navigation
navFeedBtn?.addEventListener("click", () => window.location.href = "feed.html");
navProfileBtn?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "login.html";
});

// Auth
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  currentUser = user;

  const params = new URLSearchParams(window.location.search);
  viewedUserId = params.get("uid") || user.uid;

  await loadProfile(viewedUserId);
  await loadWall(viewedUserId);
  await loadTop10(viewedUserId);
  await loadMusic(viewedUserId);

  // Own profile? Show edit controls
  const isOwn = viewedUserId === user.uid;
  bioInput.style.display = isOwn ? "block" : "none";
  saveBioBtn.style.display = isOwn ? "block" : "none";
  pfpInput.style.display = isOwn ? "block" : "none";
  savePfpBtn.style.display = isOwn ? "block" : "none";
  themeSelect.style.display = isOwn ? "block" : "none";
});

// Load profile
async function loadProfile(uid) {
  const refUser = doc(db, "users", uid);
  let snap = await getDoc(refUser);

  if (!snap.exists()) {
    await setDoc(refUser, { bio:"", profilePicture:"", theme:"dark", createdAt:serverTimestamp() });
    snap = await getDoc(refUser);
  }

  const data = snap.data();
  profileName.textContent = data.username || "YourSpace User";
  profileBio.textContent = data.bio || "This is the bio lol";

  if (data.profilePicture) profilePic.src = data.profilePicture;
  else profilePic.src = "default-avatar.png";

  applyTheme(data.theme || "dark");
}

// Save bio
saveBioBtn?.addEventListener("click", async () => {
  if (!bioInput.value.trim()) return;
  await updateDoc(doc(db, "users", currentUser.uid), { bio: bioInput.value.trim() });
  profileBio.textContent = bioInput.value.trim();
  bioInput.value = "";
});

// Save profile picture
savePfpBtn?.addEventListener("click", async () => {
  const file = pfpInput.files[0];
  if (!file) { alert("Select a file first"); return; }

  const refPfp = ref(storage, `profilePictures/${currentUser.uid}`);
  await uploadBytes(refPfp, file);
  const url = await getDownloadURL(refPfp);

  await updateDoc(doc(db, "users", currentUser.uid), { profilePicture: url });
  profilePic.src = url;
  pfpInput.value = "";
});

// Wall comments
async function loadWall(uid) {
  wallContainer.innerHTML = "";
  const q = query(collection(db, "users", uid, "wallComments"), orderBy("createdAt","desc"));
  const snap = await getDocs(q);

  snap.forEach(docSnap => {
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

  await addDoc(collection(db, "users", viewedUserId, "wallComments"), {
    text: wallInput.value.trim(),
    userId: currentUser.uid,
    username,
    createdAt: serverTimestamp()
  });

  wallInput.value = "";
  loadWall(viewedUserId);
});

// Themes
themeSelect?.addEventListener("change", async (e) => {
  const theme = e.target.value;
  applyTheme(theme);
  await updateDoc(doc(db, "users", currentUser.uid), { theme });
});

function applyTheme(theme) {
  document.body.className = "";
  document.body.classList.add(`theme-${theme}`);
}

// Top 10 friends
async function loadTop10(uid) {
  const snap = await getDoc(doc(db,"users",uid));
  const friends = snap.data()?.top10Friends || [];
  const container = document.getElementById("top10FriendsContainer");
  container.innerHTML = "";
  friends.forEach(f => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `<img src="${f.pfpURL||'default-avatar.png'}"><a href="profile.html?uid=${f.uid}">${f.username||'Unknown'}</a>`;
    container.appendChild(div);
  });
}

// Music
async function loadMusic(uid) {
  const snap = await getDoc(doc(db,"users",uid));
  const songs = snap.data()?.musicPlaylist || [];
  musicPlaylist.innerHTML = "";

  songs.forEach((song, i) => {
    const li = document.createElement("li");
    li.textContent = song;
    li.onclick = () => {
      musicPlayer.src = convertToEmbed(song);
      musicPlayer.play();
    };
    musicPlaylist.appendChild(li);
  });
}

addSongBtn?.addEventListener("click", async () => {
  if (!musicInput.value.trim()) return;
  const snap = await getDoc(doc(db,"users",currentUser.uid));
  const songs = snap.data()?.musicPlaylist || [];
  songs.push(musicInput.value.trim());

  await updateDoc(doc(db,"users",currentUser.uid), { musicPlaylist: songs });
  loadMusic(currentUser.uid);
  musicInput.value = "";
});

function convertToEmbed(url) {
  // Simple YouTube embed
  if(url.includes("youtube.com") || url.includes("youtu.be")){
    let videoId = url.split("v=")[1] || url.split("/").pop();
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  }
  return url;
}
