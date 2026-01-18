import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Firebase Init
const firebaseConfig = { apiKey:"AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8", authDomain:"yourspace-2026.firebaseapp.com", projectId:"yourspace-2026", storageBucket:"yourspace-2026.appspot.com", messagingSenderId:"72667267302", appId:"1:72667267302:web:2bed5f543e05d49ca8fb27" };
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
const top10List = document.getElementById("top10List");
const musicInput = document.getElementById("musicInput");
const addMusicBtn = document.getElementById("addMusicBtn");
const playlistContainer = document.getElementById("playlistContainer");
const playerContainer = document.getElementById("playerContainer");

let currentUser = null;
let viewedUserId = null;
let playlist = [];

// Navigation Buttons
document.getElementById("navFeedBtn").onclick = () => window.location.href="feed.html";
document.getElementById("navProfileBtn").onclick = () => window.location.href="profile.html";
document.getElementById("navMessagesBtn").onclick = () => window.location.href="messages.html";
document.getElementById("logoutBtn").onclick = async () => { await auth.signOut(); window.location.href="login.html"; };

// Auth
onAuthStateChanged(auth, async user => {
  if(!user) { window.location.href="login.html"; return; }
  currentUser = user;
  viewedUserId = new URLSearchParams(window.location.search).get("uid") || user.uid;
  await loadProfile(viewedUserId);
  await loadWall(viewedUserId);
  await loadTop10();
  await loadPlaylist();
  const isOwn = currentUser.uid === viewedUserId;
  bioInput.style.display = isOwn ? "block" : "none";
  saveBioBtn.style.display = isOwn ? "block" : "none";
  pfpInput.style.display = isOwn ? "block" : "none";
  savePfpBtn.style.display = isOwn ? "block" : "none";
  themeSelect.style.display = isOwn ? "block" : "none";
});

// Load Profile
async function loadProfile(uid){
  const userRef = doc(db,"users",uid);
  let snap = await getDoc(userRef);
  if(!snap.exists()){ await setDoc(userRef,{bio:"",profilePicture:"",theme:"light",username:"YourSpace User",createdAt:serverTimestamp()}); snap = await getDoc(userRef);}
  const data = snap.data();
  profileName.textContent = data.username || "YourSpace User";
  profileBio.textContent = data.bio || "This is the bio lol";
  profilePic.src = data.profilePicture || "default-avatar.png";
  themeSelect.value = data.theme || "light";
  applyTheme(themeSelect.value);
}

// Save Bio
saveBioBtn?.addEventListener("click", async ()=>{if(!bioInput.value.trim()) return; await updateDoc(doc(db,"users",currentUser.uid),{bio:bioInput.value.trim()}); profileBio.textContent=bioInput.value.trim(); bioInput.value="";});

// Save Profile Picture
savePfpBtn?.addEventListener("click", async ()=>{
  const file = pfpInput.files[0];
  if(!file){ alert("Select an image"); return; }
  const pfpRef = ref(storage, `profilePictures/${currentUser.uid}`);
  await uploadBytes(pfpRef,file);
  const url = await getDownloadURL(pfpRef);
  await updateDoc(doc(db,"users",currentUser.uid),{profilePicture:url});
  profilePic.src=url;
  pfpInput.value="";
});

// Wall
async function loadWall(uid){
  wallContainer.innerHTML="";
  const q = query(collection(db,"users",uid,"wallComments"),orderBy("createdAt","desc"));
  const snap = await getDocs(q);
  snap.forEach(docSnap=>{
    const data = docSnap.data();
    const div=document.createElement("div");
    div.className="wall-post";
    div.innerHTML=`<strong>${data.username}</strong>: ${data.text}`;
    if(currentUser.uid===data.userId || currentUser.uid===uid){
      const del=document.createElement("button");
      del.textContent="Delete";
      del.onclick=async ()=>{await deleteDoc(doc(db,"users",uid,"wallComments",docSnap.id)); loadWall(uid);};
      div.appendChild(del);
    }
    wallContainer.appendChild(div);
  });
}

postWallBtn?.addEventListener("click",async ()=>{
  if(!wallInput.value.trim()) return;
  const userSnap = await getDoc(doc(db,"users",currentUser.uid));
  const username = userSnap.data()?.username || "User";
  await addDoc(collection(db, "users", viewedUserId,"wallComments"),{text:wallInput.value.trim(),userId:currentUser.uid,username,createdAt:serverTimestamp()});
  wallInput.value="";
  loadWall(viewedUserId);
});

// Themes
themeSelect?.addEventListener("change",async e=>{
  const theme=e.target.value;
  applyTheme(theme);
  await updateDoc(doc(db,"users",currentUser.uid),{theme});
});
function applyTheme(theme){document.body.className="";document.body.classList.add(`theme-${theme}`);}

// Top 10 Friends
async function loadTop10(){
  top10List.innerHTML="";
  const snap = await getDocs(collection(db,"users"));
  const users = snap.docs.map(d=>d.data()).slice(0,10); // Simple top 10 demo
  users.forEach(u=>{
    const li=document.createElement("li");
    li.innerHTML=`<img src="${u.profilePicture||'default-avatar.png'}" class="top10-pfp"><a href="profile.html?uid=${u.uid}">${u.username||'User'}</a>`;
    top10List.appendChild(li);
  });
}

// Music
addMusicBtn?.addEventListener("click",async ()=>{
  if(!musicInput.value.trim()) return;
  playlist.push(musicInput.value.trim());
  await updateDoc(doc(db,"users",currentUser.uid),{musicPlaylist:playlist});
  loadPlaylist();
  musicInput.value="";
});
async function loadPlaylist(){
  const snap = await getDoc(doc(db,"users",viewedUserId));
  playlist = snap.data()?.musicPlaylist||[];
  playlistContainer.innerHTML="";
  playlist.forEach((url,i)=>{
    const li=document.createElement("li");
    li.textContent=url;
    li.style.cursor="pointer";
    li.onclick=()=>loadPlayer(url);
    playlistContainer.appendChild(li);
  });
}
function loadPlayer(url){
  playerContainer.innerHTML="";
  let embedUrl="";
  if(url.includes("youtube.com")||url.includes("youtu.be")){
    const videoId = url.split("v=")[1]||url.split("/").pop();
    embedUrl=`https://www.youtube.com/embed/${videoId}?autoplay=1`;
  } else if(url.includes("spotify.com")){
    embedUrl=url.replace("open","embed");
  }
  playerContainer.innerHTML=`<iframe src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
}
