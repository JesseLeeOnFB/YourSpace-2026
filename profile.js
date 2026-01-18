// profile.js
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

// -------------------- Firebase Init --------------------
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

// -------------------- DOM Elements --------------------
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
const musicPlaylistDiv = document.getElementById("musicPlaylist");
const musicPlayerIframe = document.getElementById("musicPlayer");

const customHtmlInput = document.getElementById("customHtmlInput");
const applyCustomBtn = document.getElementById("applyCustomBtn");
const resetCustomBtn = document.getElementById("resetCustomBtn");

// -------------------- State --------------------
let currentUser = null;
let viewedUserId = null;
let musicPlaylist = [];

// -------------------- Auth Handling --------------------
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

  // Only allow edits on own profile
  const isOwnProfile = viewedUserId === user.uid;
  bioInput.style.display = isOwnProfile ? "block" : "none";
  saveBioBtn.style.display = isOwnProfile ? "block" : "none";
  pfpInput.style.display = isOwnProfile ? "block" : "none";
  savePfpBtn.style.display = isOwnProfile ? "block" : "none";
  themeSelect.style.display = isOwnProfile ? "block" : "none";
  addMusicBtn.style.display = isOwnProfile ? "block" : "none";
  musicInput.style.display = isOwnProfile ? "block" : "none";
  applyCustomBtn.style.display = isOwnProfile ? "block" : "none";
  resetCustomBtn.style.display = isOwnProfile ? "block" : "none";
});

// -------------------- Load Profile --------------------
async function loadProfile(uid) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      bio: "",
      profilePicture: "",
      theme: "dark",
      username: "YourSpace User",
      musicPlaylist: [],
      top10Friends: [],
      createdAt: serverTimestamp()
    });
  }

  const data = (await getDoc(userRef)).data();

  profileName.textContent = data.username || "YourSpace User";
  profileBio.textContent = data.bio || "This is the bio lol";

  if (data.profilePicture) profilePic.src = data.profilePicture;
  else profilePic.src = "default-avatar.png";

  applyTheme(data.theme || "dark");
}

// -------------------- Save Bio --------------------
saveBioBtn?.addEventListener("click", async () => {
  if (!bioInput.value.trim()) return;

  await updateDoc(doc(db, "users", currentUser.uid), {
    bio: bioInput.value.trim()
  });

  profileBio.textContent = bioInput.value.trim();
  bioInput.value = "";
});

// -------------------- Save Profile Picture --------------------
savePfpBtn?.addEventListener("click", async () => {
  const file = pfpInput.files[0];
  if (!file) {
    alert("Select an image first");
    return;
  }

  const pfpRef = ref(storage, `profilePictures/${currentUser.uid}`);
  await uploadBytes(pfpRef, file);
  const url = await getDownloadURL(pfpRef);

  await updateDoc(doc(db, "users", currentUser.uid), {
    profilePicture: url
  });

  profilePic.src = url;
  pfpInput.value = "";
});

// -------------------- Wall --------------------
async function loadWall(uid) {
  wallContainer.innerHTML = "";
  const q = query(
    collection(db, "users", uid, "wallComments"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "wall-post";
    div.innerHTML = `<strong>${data.username}</strong>: ${data.text}`;

    // Delete button
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

// -------------------- Top 10 Friends --------------------
async function loadTop10(uid) {
  top10Container.innerHTML = "";
  const userSnap = await getDoc(doc(db, "users", uid));
  const top10 = userSnap.data()?.top10Friends || [];

  top10.forEach(async (friendId, index) => {
    const friendSnap = await getDoc(doc(db, "users", friendId));
    if (!friendSnap.exists()) return;
    const friendData = friendSnap.data();

    const div = document.createElement("div");
    div.className = "top10-friend";
    div.innerHTML = `<img src="${friendData.profilePicture || 'default-avatar.png'}" class="top10-pfp">
                     <a href="profile.html?uid=${friendId}" class="top10-name">${friendData.username}</a>`;

    top10Container.appendChild(div);
  });
}

// -------------------- Music --------------------
async function loadMusic(uid) {
  const userSnap = await getDoc(doc(db, "users", uid));
  musicPlaylist = userSnap.data()?.musicPlaylist || [];

  renderMusicPlaylist();
}

function renderMusicPlaylist() {
  musicPlaylistDiv.innerHTML = "";
  musicPlaylist.forEach((link, i) => {
    const div = document.createElement("div");
    div.className = "song";
    div.innerHTML = `<span>${link}</span> 
                     <button onclick="playSong('${link}')">Play</button>`;
    musicPlaylistDiv.appendChild(div);
  });
}

window.playSong = (link) => {
  let embed = "";
  if (link.includes("youtube.com") || link.includes("youtu.be")) {
    const videoId = link.split("v=")[1] || link.split("/")[3];
    embed = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  } else embed = link;

  musicPlayerIframe.src = embed;
};

addMusicBtn?.addEventListener("click", async () => {
  if (!musicInput.value.trim()) return;

  musicPlaylist.push(musicInput.value.trim());
  await updateDoc(doc(db, "users", currentUser.uid), {
    musicPlaylist
  });

  musicInput.value = "";
  renderMusicPlaylist();
});

// -------------------- Themes --------------------
themeSelect?.addEventListener("change", async (e) => {
  const theme = e.target.value;
  applyTheme(theme);
  await updateDoc(doc(db, "users", currentUser.uid), { theme });
});

function applyTheme(theme) {
  document.body.className = "";
  document.body.classList.add(`theme-${theme}`);
}

// -------------------- Custom HTML --------------------
applyCustomBtn?.addEventListener("click", () => {
  const code = customHtmlInput.value.trim();
  if (!code) return;

  const container = document.querySelector(".profile-container");
  container.innerHTML += code;
});

resetCustomBtn?.addEventListener("click", () => {
  customHtmlInput.value = "";
  location.reload();
});
