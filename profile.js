import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Firebase Config
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
const addMusicBtn = document.getElementById("addMusicBtn");
const musicList = document.getElementById("musicList");
const musicPlayer = document.getElementById("musicPlayer");

const top10List = document.getElementById("top10List");

const customHTMLInput = document.getElementById("customHTMLInput");
const applyCustomBtn = document.getElementById("applyCustomBtn");
const resetCustomBtn = document.getElementById("resetCustomBtn");

// Navigation Buttons
document.getElementById("feedNavBtn").onclick = () => window.location.href = "feed.html";
document.getElementById("profileNavBtn").onclick = () => window.location.href = "profile.html";
document.getElementById("messagesNavBtn").onclick = () => window.location.href = "messages.html";
document.getElementById("logoutBtn").onclick = async () => { await auth.signOut(); window.location.href="login.html"; }

let currentUser = null;
let viewedUserId = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  currentUser = user;
  const params = new URLSearchParams(window.location.search);
  viewedUserId = params.get("uid") || user.uid;

  await loadProfile(viewedUserId);
  await loadWall(viewedUserId);
  await loadTop10();
  await loadMusic(viewedUserId);

  const isOwnProfile = viewedUserId === user.uid;
  bioInput.style.display = isOwnProfile ? "block" : "none";
  saveBioBtn.style.display = isOwnProfile ? "block" : "none";
  pfpInput.style.display = isOwnProfile ? "block" : "none";
  savePfpBtn.style.display = isOwnProfile ? "block" : "none";
  themeSelect.style.display = isOwnProfile ? "block" : "none";
});

// ------------------ Profile ------------------
async function loadProfile(uid){
  const userRef = doc(db,"users",uid);
  let snap = await getDoc(userRef);
  if(!snap.exists()){ await setDoc(userRef,{bio:"",profilePicture:"",theme:"dark",createdAt:serverTimestamp()}); snap = await getDoc(userRef); }
  const data = snap.data();
  profileName.textContent = data.username || "YourSpace User";
  profileBio.textContent = data.bio || "This is the bio lol";
  profilePic.src = data.profilePicture || "default-avatar.png";
  applyTheme(data.theme || "dark");
}

// Save Bio
saveBioBtn?.addEventListener("click", async ()=>{
  if(!bioInput.value.trim()) return;
  await updateDoc(doc(db,"users",currentUser.uid),{bio:bioInput.value.trim()});
  profileBio.textContent = bioInput.value.trim();
  bioInput.value = "";
});

// Save Profile Picture
savePfpBtn?.addEventListener("click", async ()=>{
  const file = pfpInput.files[0];
  if(!file){ alert("Select an image first"); return; }
  const pfpRef = ref(storage, `profilePictures/${currentUser.uid}`);
  await uploadBytes(pfpRef, file);
  const url = await getDownloadURL(pfpRef);
  await updateDoc(doc(db,"users",currentUser.uid),{profilePicture:url});
  profilePic.src = url;
  pfpInput.value = "";
});

// ------------------ Wall ------------------
async function loadWall(uid){
  wallContainer.innerHTML = "";
  const q = query(collection(db,"users",uid,"wallComments"),orderBy("createdAt","desc"));
  const snap = await getDocs(q);
  snap.forEach(docSnap=>{
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "wall-post";
    div.innerHTML = `<strong>${data.username}</strong>: ${data.text}`;
    if(currentUser.uid===data.userId || currentUser.uid===uid){
      const del = document.createElement("button");
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
  await addDoc(collection(db,viewedUserId,"wallComments"),{text:wallInput.value.trim(),userId:currentUser.uid,username,createdAt:serverTimestamp()});
  wallInput.value="";
  loadWall(viewedUserId);
});

// ------------------ Themes ------------------
themeSelect?.addEventListener("change", async (e)=>{
  const theme = e.target.value;
  applyTheme(theme);
  await updateDoc(doc(db,"users",currentUser.uid),{theme});
});

function applyTheme(theme){
  document.body.className="";
  document.body.classList.add(`theme-${theme}`);
}

// ------------------ Top 10 ------------------
async function loadTop10(){
  const q = query(collection(db,"users"),orderBy("createdAt","asc")); // simple order
  const snap = await getDocs(q);
  top10List.innerHTML="";
  let count=0;
  snap.forEach(docSnap=>{
    if(count>=10) return;
    const data=docSnap.data();
    const li=document.createElement("li");
    li.innerHTML=`<img src="${data.profilePicture||'default-avatar.png'}" width="40" height="40" style="border-radius:50%"><a href="profile.html?uid=${docSnap.id}">${data.username||'User'}</a>`;
    top10List.appendChild(li);
    count++;
  });
}

// ------------------ Music ------------------
async function loadMusic(uid){
  const userSnap = await getDoc(doc(db,"users",uid));
  const playlist = userSnap.data()?.musicPlaylist || [];
  renderPlaylist(playlist);
}

addMusicBtn?.addEventListener("click", async()=>{
  const link = musicInput.value.trim();
  if(!link) return;
  const userRef = doc(db,"users",currentUser.uid);
  const snap = await getDoc(userRef);
  const playlist = snap.data()?.musicPlaylist || [];
  playlist.push(link);
  await updateDoc(userRef,{musicPlaylist:playlist});
  renderPlaylist(playlist);
  musicInput.value="";
});

function renderPlaylist(list){
  musicList.innerHTML="";
  list.forEach((link,i)=>{
    const btn=document.createElement("button");
    btn.textContent=`Song ${i+1}`;
    btn.onclick=()=>{
      // detect YouTube link and embed
      if(link.includes("youtube.com") || link.includes("youtu.be")){
        let videoId = link.split("v=")[1] || link.split("/").pop();
        videoId = videoId.split("&")[0];
        musicPlayer.src=`https://www.youtube.com/embed/${videoId}?autoplay=1`;
      } else {
        // fallback, just open in new tab
        window.open(link,"_blank");
      }
    };
    musicList.appendChild(btn);
  });
}

// ------------------ Custom HTML ------------------
applyCustomBtn?.addEventListener("click",()=>{
  const code=customHTMLInput.value;
  const container=document.querySelector(".profile-container");
  container.innerHTML+=code;
});

resetCustomBtn?.addEventListener("click",()=>{
  window.location.reload();
});
