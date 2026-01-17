// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
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

const top10List = document.getElementById("top10List");

const themeSelect = document.getElementById("themeSelect");

const musicInput = document.getElementById("musicInput");
const addSongBtn = document.getElementById("addSongBtn");
const playlistContainer = document.getElementById("playlistContainer");
const audioPlayer = document.getElementById("audioPlayer");

const feedNavBtn = document.getElementById("feedNavBtn");
const profileNavBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

const newConversationBtn = document.getElementById("newConversationBtn");
const conversationsContainer = document.getElementById("conversationsContainer");

// --------------------
// State
// --------------------
let currentUser = null;
let viewedUserId = null;
let playlist = [];

// --------------------
// Navigation
// --------------------
feedNavBtn?.addEventListener("click", () => window.location.href = "feed.html");
profileNavBtn?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

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

  // Only allow edits on own profile
  const isOwn = viewedUserId === user.uid;
  bioInput.style.display = isOwn ? "block" : "none";
  saveBioBtn.style.display = isOwn ? "block" : "none";
  pfpInput.style.display = isOwn ? "block" : "none";
  savePfpBtn.style.display = isOwn ? "block" : "none";
  themeSelect.style.display = isOwn ? "block" : "none";
});

// --------------------
// Load Profile
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

  await updateDoc(doc(db, "users", currentUser.uid), { bio: bioInput.value.trim() });
  profileBio.textContent = bioInput.value.trim();
  bioInput.value = "";
});

// --------------------
// Save Profile Picture
// --------------------
savePfpBtn?.addEventListener("click", async () => {
  const file = pfpInput.files[0];
  if (!file) { alert("Select an image first"); return; }

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

  snap.forEach(docSnap => {
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
// Top 10 Friends
// --------------------
async function loadTop10(uid) {
  top10List.innerHTML = "";
  const snap = await getDoc(doc(db, "users", uid));
  const friends = snap.data()?.top10Friends || [];

  friends.forEach(f => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `
      <img src="${f.pfpURL || 'default-avatar.png'}" width="40" height="40" style="border-radius:50%;">
      <a href="profile.html?uid=${f.uid}">${f.username || 'Unknown'}</a>
    `;
    top10List.appendChild(div);
  });
}

// --------------------
// Music Player
// --------------------
async function loadPlaylist(uid) {
  playlistContainer.innerHTML = "";
  const snap = await getDoc(doc(db, "users", uid));
  playlist = snap.data()?.musicPlaylist || [];

  playlist.forEach((song, idx) => {
    const div = document.createElement("div");
    div.className = "playlist-song";
    div.innerHTML = `<button data-index="${idx}">${song.title || song}</button>`;
    div.querySelector("button").addEventListener("click", () => {
      audioPlayer.src = song.url || song;
      audioPlayer.play();
    });
    playlistContainer.appendChild(div);
  });
}

addSongBtn?.addEventListener("click", async () => {
  if (!musicInput.value.trim()) return;
  const url = musicInput.value.trim();
  playlist.push({ url, title: url.split("/").pop() });

  await updateDoc(doc(db, "users", currentUser.uid), { musicPlaylist: playlist });
  musicInput.value = "";
  loadPlaylist(currentUser.uid);
});

// --------------------
// Themes
// --------------------
themeSelect?.addEventListener("change", async e => {
  const theme = e.target.value;
  applyTheme(theme);
  await updateDoc(doc(db, "users", currentUser.uid), { theme });
});

function applyTheme(theme) {
  document.body.className = "";
  document.body.classList.add(`theme-${theme}`);
}

// --------------------
// Private Messages (Button placeholder)
// --------------------
newConversationBtn?.addEventListener("click", () => {
  alert("Private messages system will open here (in next update).");
});
