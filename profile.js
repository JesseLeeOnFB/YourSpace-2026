import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, deleteDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Firebase Init
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

// DOM
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
const musicPlaylist = document.getElementById("musicPlaylist");

// Navigation
document.getElementById("navFeed").onclick = () => window.location.href="feed.html";
document.getElementById("navProfile").onclick = () => window.location.href="profile.html";
document.getElementById("navMessages").onclick = () => window.location.href="messages.html";
document.getElementById("navLogout").onclick = () => { signOut(auth).then(()=>window.location.href="login.html"); };

// State
let currentUser = null;
let viewedUserId = null;
let playlist = [];

// Auth
onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.replace("login.html");
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

// Load Profile
async function loadProfile(uid){
  const userRef = doc(db,"users",uid);
  const snap = await getDoc(userRef);
  if(!snap.exists()) await setDoc(userRef,{bio:"",theme:"dark",username:"YourSpace User"});
  const data = (await getDoc(userRef)).data();

  profileName.textContent = data.username || "YourSpace User";
  profileBio.textContent = data.bio || "This is the bio lol";

  // Profile picture
  try {
    const pfpRef = ref(storage, `profilePictures/${uid}`);
    profilePic.src = await getDownloadURL(pfpRef);
  } catch {
    profilePic.src = "default-avatar.png";
  }

  applyTheme(data.theme || "dark");
}

// Save Bio
saveBioBtn?.addEventListener("click", async ()=>{
  if(!bioInput.value.trim()) return;
  await updateDoc(doc(db,"users",currentUser.uid),{bio:bioInput.value.trim()});
  profileBio.textContent=bioInput.value.trim();
  bioInput.value="";
});

// Save PFP
savePfpBtn?.addEventListener("click",async()=>{
  const file = pfpInput.files[0];
  if(!file){ alert("Select image"); return; }
  const pfpRef = ref(storage, `profilePictures/${currentUser.uid}`);
  await uploadBytes(pfpRef,file);
  profilePic.src = await getDownloadURL(pfpRef);
  pfpInput.value="";
});

// Wall
async function loadWall(uid){
  wallContainer.innerHTML="";
  const q = query(collection(db,"users",uid,"wallComments"),orderBy("createdAt","desc"));
  const snap = await getDocs(q);
  snap.forEach(docSnap=>{
    const data=docSnap.data();
    const div=document.createElement("div");
    div.className="wall-post";
    div.innerHTML=`<strong>${data.username}</strong>: ${data.text}`;
    if(currentUser.uid===data.userId||currentUser.uid===uid){
      const del=document.createElement("button");
      del.textContent="Delete";
      del.onclick=async()=>{
        await deleteDoc(doc(db,"users",uid,"wallComments",docSnap.id));
        loadWall(uid);
      };
      div.appendChild(del);
    }
    wallContainer.appendChild(div);
  });
}

postWallBtn?.addEventListener("click",async()=>{
  if(!wallInput.value.trim()) return;
  const userSnap = await getDoc(doc(db,"users",currentUser.uid));
  const username = userSnap.data()?.username || "User";
  await addDoc(collection(db,"users",viewedUserId,"wallComments"),{
    text: wallInput.value.trim(),
    userId: currentUser.uid,
    username,
    createdAt: new Date()
  });
  wallInput.value="";
  loadWall(viewedUserId);
});

// Themes
themeSelect?.addEventListener("change",async(e)=>{
  const theme = e.target.value;
  applyTheme(theme);
  await updateDoc(doc(db,"users",currentUser.uid),{theme});
});

function applyTheme(theme){
  document.body.className="";
  document.body.classList.add(`theme-${theme}`);
}

// Top10
async function loadTop10(uid){
  top10Container.innerHTML="";
  const userSnap=await getDoc(doc(db,"users",uid));
  const top10=userSnap.data()?.top10Friends||[];
  for(const friendId of top10){
    try{
      const fSnap=await getDoc(doc(db,"users",friendId));
      const fData=fSnap.data();
      const div=document.createElement("div");
      div.className="top10-user";
      const imgUrl = fData.profilePicture ? await getDownloadURL(ref(storage, `profilePictures/${friendId}`)) : "default-avatar.png";
      div.innerHTML=`<a href="profile.html?uid=${friendId}"><img src="${imgUrl}"><span>${fData.username}</span></a>`;
      top10Container.appendChild(div);
    }catch{}
  }
}

// Music
async function loadMusic(uid){
  playlist = [];
  musicPlaylist.innerHTML="";
  const userSnap = await getDoc(doc(db,"users",uid));
  const songs = userSnap.data()?.musicPlaylist||[];
  songs.forEach((songUrl,i)=>{
    const btn = document.createElement("button");
    btn.textContent = `Song ${i+1}`;
    btn.onclick = ()=>playSong(songUrl);
    musicPlaylist.appendChild(btn);
    playlist.push(songUrl);
  });
}

addMusicBtn?.addEventListener("click",async()=>{
  const url = musicInput.value.trim();
  if(!url) return;
  playlist.push(url);
  await updateDoc(doc(db,"users",currentUser.uid),{
    musicPlaylist: playlist
  });
  loadMusic(currentUser.uid);
  musicInput.value="";
});

function playSong(url){
  // Only one song at a time
  musicPlayer.innerHTML=`<iframe src="${url.replace("watch?v=","embed/")}" allow="autoplay" allowfullscreen></iframe>`;
}
