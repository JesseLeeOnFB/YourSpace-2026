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
const customHtmlInput = document.getElementById("customHtmlInput");
const saveCustomHtmlBtn = document.getElementById("saveCustomHtmlBtn");
const resetCustomHtmlBtn = document.getElementById("resetCustomHtmlBtn");

const top10Container = document.getElementById("top10FriendsContainer");

const musicUrlInput = document.getElementById("musicUrlInput");
const addMusicBtn = document.getElementById("addMusicBtn");
const musicPlaylistContainer = document.getElementById("musicPlaylistContainer");
const musicPlayer = document.getElementById("musicPlayer");

// --------------------
// State
// --------------------
let currentUser = null;
let viewedUserId = null;
let playlist = [];
let currentSongIndex = 0;

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
  await loadMusic(viewedUserId);

  const isOwnProfile = viewedUserId === user.uid;

  bioInput.style.display = isOwnProfile ? "block" : "none";
  saveBioBtn.style.display = isOwnProfile ? "block" : "none";
  pfpInput.style.display = isOwnProfile ? "block" : "none";
  savePfpBtn.style.display = isOwnProfile ? "block" : "none";
  themeSelect.style.display = isOwnProfile ? "block" : "none";
  customHtmlInput.style.display = isOwnProfile ? "block" : "none";
  saveCustomHtmlBtn.style.display = isOwnProfile ? "block" : "none";
  resetCustomHtmlBtn.style.display = isOwnProfile ? "block" : "none";
});

// --------------------
// Profile Functions
// --------------------
async function loadProfile(uid) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      bio: "",
      profilePicture: "",
      theme: "dark",
      top10Friends: [],
      musicPlaylist: [],
      username: "YourSpace User",
      createdAt: serverTimestamp()
    });
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

  await updateDoc(doc(db, "users", currentUser.uid), {
    bio: bioInput.value.trim()
  });
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
      del.onclick = async () => {
        await deleteDoc(doc(db, "users", uid, "wallComments", docSnap.id));
        loadWall(uid);
      };
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
// Custom HTML
// --------------------
saveCustomHtmlBtn?.addEventListener("click", () => {
  document.body.innerHTML += customHtmlInput.value;
});

resetCustomHtmlBtn?.addEventListener("click", () => {
  window.location.reload();
});

// --------------------
// Top 10 Friends
// --------------------
async function loadTop10(uid) {
  top10Container.innerHTML = "";
  const snap = await getDoc(doc(db, "users", uid));
  const friends = snap.data()?.top10Friends || [];

  for (let friendUid of friends) {
    const friendSnap = await getDoc(doc(db, "users", friendUid));
    const data = friendSnap.data();
    if (!data) continue;

    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `<img src="${data.profilePicture || 'default-avatar.png'}">
                     <span class="friend-name" data-uid="${friendUid}">${data.username || "User"}</span>`;

    div.querySelector(".friend-name").addEventListener("click", () => {
      window.location.href = `profile.html?uid=${friendUid}`;
    });

    top10Container.appendChild(div);
  }
}

// --------------------
// Music Player
// --------------------
async function loadMusic(uid) {
  musicPlaylistContainer.innerHTML = "";
  const snap = await getDoc(doc(db, "users", uid));
  playlist = snap.data()?.musicPlaylist || [];

  playlist.forEach((song, idx) => {
    const div = document.createElement("div");
    div.className = "music-song";
    div.textContent = song.title || song.url;
    div.addEventListener("click", () => playSong(idx));
    musicPlaylistContainer.appendChild(div);
  });
}

addMusicBtn?.addEventListener("click", async () => {
  const url = musicUrlInput.value.trim();
  if (!url) return;

  playlist.push({ url, title: url.split("/").pop() });
  await updateDoc(doc(db, "users", currentUser.uid), { musicPlaylist: playlist });
  loadMusic(currentUser.uid);
  musicUrlInput.value = "";
});

function playSong(idx) {
  currentSongIndex = idx;
  const song = playlist[idx];
  if (!song) return;
  let embedUrl = "";

  // YouTube example (auto-convert link)
  if (song.url.includes("youtube.com") || song.url.includes("youtu.be")) {
    const videoId = song.url.split("v=")[1] || song.url.split("/").pop();
    embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  }
  // Spotify & others can be added similarly

  musicPlayer.src = embedUrl;
}
