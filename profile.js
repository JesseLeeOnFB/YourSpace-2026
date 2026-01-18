import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc,
  collection, addDoc, getDocs, query, orderBy, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

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

const top10List = document.getElementById("top10List");
const musicInput = document.getElementById("musicInput");
const addSongBtn = document.getElementById("addSongBtn");
const musicList = document.getElementById("musicList");
const musicPlayer = document.getElementById("musicPlayer");

// --------------------
// State
// --------------------
let currentUser = null;
let viewedUserId = null;
let musicPlaylist = [];

// --------------------
// Auth Handling
// --------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.replace("login.html"); return; }
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
});

// --------------------
// Load Profile
// --------------------
async function loadProfile(uid) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, { bio:"", profilePicture:"", theme:"theme-light", createdAt:serverTimestamp() });
  }

  const data = (await getDoc(userRef)).data();
  profileName.textContent = data.username || "YourSpace User";
  profileBio.textContent = data.bio || "This is the bio lol";
  profilePic.src = data.profilePicture || "default-avatar.png";

  applyTheme(data.theme || "theme-light");
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
  if (!file) { alert("Select an image"); return; }

  const ext = file.name.split(".").pop();
  const pfpRef = ref(storage, `profilePictures/${currentUser.uid}.${ext}`);
  await uploadBytes(pfpRef, file);
  const url = await getDownloadURL(pfpRef);

  await updateDoc(doc(db, "users", currentUser.uid), { profilePicture: url });
  profilePic.src = url;
  pfpInput.value = "";
});

// --------------------
// Wall
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
  const username = (await getDoc(doc(db,"users",currentUser.uid))).data()?.username || "User";
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
  const userSnap = await getDoc(doc(db,"users",uid));
  const top10 = userSnap.data()?.top10Friends || [];
  for (const friend of top10) {
    const li = document.createElement("li");
    li.innerHTML = `<a href="profile.html?uid=${friend.uid}"><img src="${friend.profilePicture || 'default-avatar.png'}" alt="pfp" class="top10-pfp">${friend.username}</a>`;
    top10List.appendChild(li);
  }
}

// --------------------
// Music Player
// --------------------
async function loadMusic(uid) {
  const userSnap = await getDoc(doc(db,"users",uid));
  musicPlaylist = userSnap.data()?.musicPlaylist || [];
  renderMusic();
}

function renderMusic() {
  musicList.innerHTML = "";
  musicPlaylist.forEach((songURL,index)=>{
    const li = document.createElement("li");
    li.innerHTML = `<a href="#" data-url="${songURL}">Song ${index+1}</a>`;
    li.onclick = (e)=>{
      e.preventDefault();
      musicPlayer.src = convertURLtoEmbed(songURL);
    };
    musicList.appendChild(li);
  });
}

addSongBtn?.addEventListener("click", async ()=>{
  const url = musicInput.value.trim();
  if(!url) return;
  musicPlaylist.push(url);
  await updateDoc(doc(db,"users",currentUser.uid),{ musicPlaylist });
  renderMusic();
  musicInput.value = "";
});

function convertURLtoEmbed(url){
  // Only basic YouTube handling for now
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]+)/);
  if(match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
  return url;
}

// --------------------
// Theme
// --------------------
themeSelect?.addEventListener("change", async e=>{
  const theme = e.target.value;
  applyTheme(theme);
  await updateDoc(doc(db,"users",currentUser.uid),{ theme });
});

function applyTheme(theme){
  document.body.className = "";
  document.body.classList.add(theme);
}
