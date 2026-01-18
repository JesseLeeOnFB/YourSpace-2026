import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc,
  collection, addDoc, getDocs, query, orderBy, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

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

const top10List = document.getElementById("top10List");

const musicInput = document.getElementById("musicInput");
const addMusicBtn = document.getElementById("addMusicBtn");
const musicPlayerContainer = document.getElementById("musicPlayerContainer");
const playlist = document.getElementById("playlist");

const customHTMLInput = document.getElementById("customHTMLInput");
const saveCustomHTMLBtn = document.getElementById("saveCustomHTMLBtn");
const resetCustomHTMLBtn = document.getElementById("resetCustomHTMLBtn");
const customHTMLDisplay = document.getElementById("customHTMLDisplay");

let currentUser = null;
let viewedUserId = null;
let musicList = [];

// Navigation buttons
document.getElementById("navFeed").onclick = () => window.location.href = "feed.html";
document.getElementById("navProfile").onclick = () => window.location.href = "profile.html";
document.getElementById("navMessages").onclick = () => window.location.href = "messages.html";
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  window.location.href = "login.html";
};

// Auth
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;

  const params = new URLSearchParams(window.location.search);
  viewedUserId = params.get("uid") || user.uid;

  await loadProfile(viewedUserId);
  await loadWall(viewedUserId);
  await loadTop10(viewedUserId);
  await loadMusic(viewedUserId);

  const isOwnProfile = currentUser.uid === viewedUserId;
  bioInput.style.display = isOwnProfile ? "block" : "none";
  saveBioBtn.style.display = isOwnProfile ? "block" : "none";
  pfpInput.style.display = isOwnProfile ? "block" : "none";
  savePfpBtn.style.display = isOwnProfile ? "block" : "none";
  themeSelect.style.display = isOwnProfile ? "block" : "none";
  customHTMLInput.style.display = isOwnProfile ? "block" : "none";
  saveCustomHTMLBtn.style.display = isOwnProfile ? "block" : "none";
  resetCustomHTMLBtn.style.display = isOwnProfile ? "block" : "none";
});

// Load profile
async function loadProfile(uid) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, { bio: "", profilePicture: "", theme: "default", username: "YourSpace User", top10Friends: [], musicPlaylist: [] });
  }
  const data = (await getDoc(userRef)).data();
  profileName.textContent = data.username || "YourSpace User";
  profileBio.textContent = data.bio || "This is the bio lol";
  profilePic.src = data.profilePicture || "default-avatar.png";
  applyTheme(data.theme || "default");
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
  if (!file) return alert("Select an image first");
  const pfpRef = ref(storage, `profilePictures/${currentUser.uid}`);
  await uploadBytes(pfpRef, file);
  const url = await getDownloadURL(pfpRef);
  await updateDoc(doc(db, "users", currentUser.uid), { profilePicture: url });
  profilePic.src = url;
  pfpInput.value = "";
});

// Wall
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
  top10List.innerHTML = "";
  const snap = await getDoc(doc(db, "users", uid));
  const friends = snap.data()?.top10Friends || [];
  friends.forEach(async friendUid => {
    const friendSnap = await getDoc(doc(db, "users", friendUid));
    const data = friendSnap.data();
    const li = document.createElement("li");
    li.innerHTML = `<a href="profile.html?uid=${friendUid}"><img src="${data.profilePicture || "default-avatar.png"}" width="50" /> ${data.username || "User"}</a>`;
    top10List.appendChild(li);
  });
}

// Music player
addMusicBtn?.addEventListener("click", async () => {
  const url = musicInput.value.trim();
  if (!url) return;
  musicList.push(url);
  displayPlaylist();
  await updateDoc(doc(db, "users", currentUser.uid), { musicPlaylist: musicList });
  musicInput.value = "";
});
async function loadMusic(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  musicList = snap.data()?.musicPlaylist || [];
  displayPlaylist();
}
function displayPlaylist() {
  playlist.innerHTML = "";
  musicList.forEach((url, i) => {
    const li = document.createElement("li");
    li.textContent = url;
    li.onclick = () => {
      const embedURL = getEmbedURL(url);
      musicPlayerContainer.innerHTML = `<iframe width="300" height="80" src="${embedURL}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    };
    playlist.appendChild(li);
  });
}
function getEmbedURL(url) {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const vid = url.split("v=")[1] || url.split("/").pop();
    return `https://www.youtube.com/embed/${vid}?autoplay=1`;
  }
  return url;
}

// Custom HTML container
saveCustomHTMLBtn?.addEventListener("click", () => {
  customHTMLDisplay.innerHTML = customHTMLInput.value;
});
resetCustomHTMLBtn?.addEventListener("click", () => {
  customHTMLInput.value = "";
  customHTMLDisplay.innerHTML = "";
});
