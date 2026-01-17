import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, deleteDoc, serverTimestamp
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
// DOM
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
const musicPlayer = document.getElementById("musicPlayer");
const musicList = document.getElementById("musicList");

const feedNavBtn = document.getElementById("feedNavBtn");
const profileNavBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

let currentUser = null;
let viewedUserId = null;

// --------------------
// Navigation
// --------------------
feedNavBtn?.addEventListener("click", () => window.location.href="feed.html");
profileNavBtn?.addEventListener("click", () => window.location.href="profile.html");
logoutBtn?.addEventListener("click", async () => { await auth.signOut(); window.location.href="login.html"; });

// --------------------
// Auth
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

  const isOwn = viewedUserId === user.uid;
  bioInput.style.display = isOwn ? "block" : "none";
  saveBioBtn.style.display = isOwn ? "block" : "none";
  pfpInput.style.display = isOwn ? "block" : "none";
  savePfpBtn.style.display = isOwn ? "block" : "none";
  themeSelect.style.display = isOwn ? "block" : "none";
});

// --------------------
// Profile
// --------------------
async function loadProfile(uid) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, { bio:"", profilePicture:"", theme:"dark", createdAt:serverTimestamp() });
  }
  const data = (await getDoc(userRef)).data();
  profileName.textContent = data.username || "YourSpace User";
  profileBio.textContent = data.bio || "This is the bio lol";
  profilePic.src = data.profilePicture || "default-avatar.png";
  applyTheme(data.theme || "dark");
}

// Save Bio
saveBioBtn?.addEventListener("click", async ()=>{
  if(!bioInput.value.trim()) return;
  await updateDoc(doc(db,"users",currentUser.uid),{bio:bioInput.value.trim()});
  profileBio.textContent=bioInput.value.trim();
  bioInput.value="";
});

// Save Profile Picture
savePfpBtn?.addEventListener("click", async ()=>{
  const file=pfpInput.files[0];
  if(!file){ alert("Select image first"); return; }
  const pfpRef=ref(storage,`profilePictures/${currentUser.uid}`);
  await uploadBytes(pfpRef,file);
  const url=await getDownloadURL(pfpRef);
  await updateDoc(doc(db,"users",currentUser.uid),{profilePicture:url});
  profilePic.src=url;
  pfpInput.value="";
});

// --------------------
// Wall
// --------------------
async function loadWall(uid){
  wallContainer.innerHTML="";
  const q=query(collection(db,"users",uid,"wallComments"),orderBy("createdAt","desc"));
  const snap=await getDocs(q);
  snap.forEach(docSnap=>{
    const data=docSnap.data();
    const div=document.createElement("div");
    div.className="wall-post";
    div.innerHTML=`<strong>${data.username}</strong>: ${data.text}`;
    if(currentUser.uid===data.userId || currentUser.uid===uid){
      const del=document.createElement("button");
      del.textContent="Delete";
      del.onclick=async()=>{ await deleteDoc(doc(db,"users",uid,"wallComments",docSnap.id)); loadWall(uid);}
      div.appendChild(del);
    }
    wallContainer.appendChild(div);
  });
}

postWallBtn?.addEventListener("click", async()=>{
  if(!wallInput.value.trim()) return;
  const userSnap=await getDoc(doc(db,"users",currentUser.uid));
  const username=userSnap.data()?.username || "User";
  await addDoc(collection(db,"users",viewedUserId,"wallComments"),{text:wallInput.value.trim(),userId:currentUser.uid,username,createdAt:serverTimestamp()});
  wallInput.value="";
  loadWall(viewedUserId);
});

// --------------------
// Themes
// --------------------
themeSelect?.addEventListener("change", async (e)=>{
  const theme=e.target.value;
  applyTheme(theme);
  await updateDoc(doc(db,"users",currentUser.uid),{theme});
});

function applyTheme(theme){
  document.body.className="";
  document.body.classList.add(`theme-${theme}`);
}

// --------------------
// Top 10 Friends
// --------------------
async function loadTop10(uid){
  top10Container.innerHTML="";
  const snap=await getDoc(doc(db,"users",uid));
  const friends=snap.data()?.top10Friends||[];
  friends.forEach(f=>{
    const div=document.createElement("div");
    div.className="top-friend";
    div.innerHTML=`<img src="${f.pfpURL || 'default-avatar.png'}"><a href="profile.html?uid=${f.uid}">${f.username || 'Unknown'}</a>`;
    top10Container.appendChild(div);
  });
}

// --------------------
// Music Player
// --------------------
async function loadMusic(uid){
  musicList.innerHTML="";
  const snap=await getDoc(doc(db,"users",uid));
  const songs=snap.data()?.musicPlaylist||[];
  songs.forEach((s,i)=>{
    const li=document.createElement("li");
    li.textContent=s;
    li.onclick=()=>playMusic(s);
    musicList.appendChild(li);
  });
}

addMusicBtn?.addEventListener("click", async()=>{
  const link=musicInput.value.trim();
  if(!link) return;
  const docRef=doc(db,"users",currentUser.uid);
  const snap=await getDoc(docRef);
  const songs=snap.data()?.musicPlaylist||[];
  songs.push(link);
  await updateDoc(docRef,{musicPlaylist:songs});
  musicInput.value="";
  loadMusic(currentUser.uid);
});

function playMusic(link){
  // Determine embed for YouTube, Spotify, SoundCloud, Pandora
  let embed="";
  if(link.includes("youtube.com") || link.includes("youtu.be")){
    const videoId = link.split("v=")[1] || link.split("/").pop();
    embed=`<iframe width="300" height="150" src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  }
  // TODO: add Spotify, SoundCloud, Pandora parsing
  musicPlayer.innerHTML=embed;
}
