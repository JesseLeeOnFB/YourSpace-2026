import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
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

const musicInput = document.getElementById("musicInput");
const addMusicBtn = document.getElementById("addMusicBtn");
const playlistContainer = document.getElementById("playlistContainer");
const musicPlayer = document.getElementById("musicPlayer");

const top10Container = document.getElementById("top10FriendsContainer");

const navFeedBtn = document.getElementById("feedNavBtn");
const navProfileBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

// --------------------
// Navigation & Logout
// --------------------
navFeedBtn?.addEventListener("click", () => window.location.href = "feed.html");
navProfileBtn?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => { await auth.signOut(); window.location.href="login.html"; });

// --------------------
// State
// --------------------
let currentUser = null;
let viewedUserId = null;

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
  await loadPlaylist(viewedUserId);

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
    await setDoc(userRef, { bio:"", profilePicture:"", theme:"dark", createdAt: serverTimestamp() });
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
      del.onclick = async () => { await deleteDoc(doc(db,"users",uid,"wallComments",docSnap.id)); loadWall(uid); };
      div.appendChild(del);
    }

    wallContainer.appendChild(div);
  });
}

postWallBtn?.addEventListener("click", async () => {
  if (!wallInput.value.trim()) return;

  const userSnap = await getDoc(doc(db,"users",currentUser.uid));
  const username = userSnap.data()?.username || "User";

  await addDoc(collection(db,"users",viewedUserId,"wallComments"),{
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
themeSelect?.addEventListener("change", async e => {
  const theme = e.target.value;
  applyTheme(theme);
  await updateDoc(doc(db,"users",currentUser.uid),{ theme });
});

function applyTheme(theme) {
  document.body.className = "";
  document.body.classList.add(`theme-${theme}`);
}

// --------------------
// Top 10 Friends
// --------------------
async function loadTop10(uid){
  top10Container.innerHTML = "";
  const userSnap = await getDoc(doc(db,"users",uid));
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
let currentSongId = null;

async function loadPlaylist(uid){
  playlistContainer.innerHTML = "";
  const userSnap = await getDoc(doc(db,"users",uid));
  const playlist = userSnap.data()?.musicPlaylist || [];

  playlist.forEach((song,index)=>{
    const div = document.createElement("div");
    div.className = "playlist-song";
    div.innerHTML = `
      <span>${song.title||`Song ${index+1}`}</span>
      <button class="play-btn">Play</button>
      <button class="delete-btn">Delete</button>
    `;

    div.querySelector(".play-btn").addEventListener("click",()=>{ playSong(song.url); });
    if(currentUser.uid===viewedUserId){
      div.querySelector(".delete-btn").addEventListener("click", async()=>{
        playlist.splice(index,1);
        await updateDoc(doc(db,"users",currentUser.uid),{musicPlaylist:playlist});
        loadPlaylist(viewedUserId);
      });
    } else div.querySelector(".delete-btn").style.display="none";

    playlistContainer.appendChild(div);
  });
}

addMusicBtn?.addEventListener("click", async ()=>{
  const url = musicInput.value.trim(); if(!url) return;
  let title = url.split("/").pop()||"Song";
  if(url.includes("youtu")) title="YouTube Song";

  const userSnap = await getDoc(doc(db,"users",currentUser.uid));
  const playlist = userSnap.data()?.musicPlaylist||[];
  playlist.push({url,title});
  await updateDoc(doc(db,"users",currentUser.uid),{musicPlaylist:playlist});
  musicInput.value="";
  loadPlaylist(currentUser.uid);
});

function playSong(url){
  currentSongId=url;
  if(url.includes("youtu")){
    const videoId=url.split("v=")[1]?.split("&")[0]||"";
    musicPlayer.innerHTML=`<iframe width="100%" height="80" src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  } else if(url.includes("spotify")){
    musicPlayer.innerHTML=`<iframe src="${url}" width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media" allow="autoplay"></iframe>`;
  } else if(url.includes("soundcloud")){
    musicPlayer.innerHTML=`<iframe width="100%" height="80" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true"></iframe>`;
  } else { musicPlayer.innerHTML=`<p>Cannot play this link</p>`; }
}
