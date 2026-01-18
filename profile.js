// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// --------------------
// Firebase Config
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

const top10Container = document.getElementById("top10Container");

const musicInput = document.getElementById("musicInput");
const addMusicBtn = document.getElementById("addMusicBtn");
const musicPlayer = document.getElementById("musicPlayer");

const customHtmlInput = document.getElementById("customHtmlInput");
const saveCustomHtmlBtn = document.getElementById("saveCustomHtmlBtn");
const customHtmlPreview = document.getElementById("customHtmlPreview");

// Navigation
document.getElementById("navFeed").onclick = () => window.location.href = "feed.html";
document.getElementById("navProfile").onclick = () => window.location.href = "profile.html";
document.getElementById("navMessages").onclick = () => window.location.href = "messages.html";
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  window.location.href = "login.html";
};

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
    window.location.href = "login.html";
    return;
  }

  currentUser = user;

  const params = new URLSearchParams(window.location.search);
  viewedUserId = params.get("uid") || currentUser.uid;

  await loadProfile(viewedUserId);
  await loadWall(viewedUserId);
  await loadTop10(viewedUserId);

  const isOwnProfile = viewedUserId === currentUser.uid;

  bioInput.style.display = isOwnProfile ? "block" : "none";
  saveBioBtn.style.display = isOwnProfile ? "block" : "none";
  pfpInput.style.display = isOwnProfile ? "block" : "none";
  savePfpBtn.style.display = isOwnProfile ? "block" : "none";
  themeSelect.style.display = isOwnProfile ? "block" : "none";
  customHtmlInput.style.display = isOwnProfile ? "block" : "none";
  saveCustomHtmlBtn.style.display = isOwnProfile ? "block" : "none";
});

// --------------------
// Load Profile
// --------------------
async function loadProfile(uid) {
  const userRef = doc(db, "users", uid);
  let snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      bio: "",
      profilePicture: "",
      theme: "dark",
      username: "YourSpace User",
      musicPlaylist: [],
      createdAt: serverTimestamp()
    });
    snap = await getDoc(userRef);
  }

  const data = snap.data();
  profileName.textContent = data.username || "YourSpace User";
  profileBio.textContent = data.bio || "This is the bio lol";

  profilePic.src = data.profilePicture || "default-avatar.png";
  applyTheme(data.theme || "dark");

  // Load music playlist if available
  if (data.musicPlaylist?.length) {
    musicPlayer.src = data.musicPlaylist[0]; // autoplay first song
  }
}

// --------------------
// Save Bio
// --------------------
saveBioBtn?.addEventListener("click", async () => {
  const text = bioInput.value.trim();
  if (!text) return;
  await updateDoc(doc(db, "users", currentUser.uid), { bio: text });
  profileBio.textContent = text;
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
// Wall Posts
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
  const text = wallInput.value.trim();
  if (!text) return;

  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const username = userSnap.data()?.username || "User";

  await addDoc(collection(db, "users", viewedUserId, "wallComments"), {
    text,
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
// Top 10 Friends
// --------------------
async function loadTop10(uid) {
  top10Container.innerHTML = "";
  const userSnap = await getDoc(doc(db, "users", uid));
  const friends = userSnap.data()?.top10Friends || [];

  friends.forEach(f => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `
      <img src="${f.pfpURL || 'default-avatar.png'}" width="30" height="30" style="border-radius:50%;">
      <a href="profile.html?uid=${f.uid}">${f.username || 'Unknown'}</a>
    `;
    top10Container.appendChild(div);
  });
}

// --------------------
// Music Player
// --------------------
addMusicBtn?.addEventListener("click", async () => {
  const url = musicInput.value.trim();
  if (!url) return;

  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);
  const playlist = snap.data()?.musicPlaylist || [];

  playlist.push(url);
  await updateDoc(userRef, { musicPlaylist: playlist });
  musicPlayer.src = url;
  musicInput.value = "";
});

// --------------------
// Custom HTML
// --------------------
saveCustomHtmlBtn?.addEventListener("click", async () => {
  const html = customHtmlInput.value.trim();
  if (!html) return;

  customHtmlPreview.innerHTML = html;
  await updateDoc(doc(db, "users", currentUser.uid), { customHtml: html });
});

// Load custom HTML if exists
async function loadCustomHtml(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  const html = snap.data()?.customHtml || "";
  if (html) customHtmlPreview.innerHTML = html;
}
