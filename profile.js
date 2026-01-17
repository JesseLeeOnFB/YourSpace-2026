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

const top10Container = document.getElementById("top10FriendsContainer");

const musicList = document.getElementById("musicList");
const musicPlayer = document.getElementById("musicPlayer");

const sendMessageBtn = document.getElementById("sendMessageBtn");

// Navigation buttons
document.getElementById("feedNavBtn").addEventListener("click", ()=> window.location.href="feed.html");
document.getElementById("profileNavBtn").addEventListener("click", ()=> window.location.href="profile.html");
document.getElementById("logoutBtn").addEventListener("click", async ()=>{
  await auth.signOut();
  window.location.href="login.html";
});

// --------------------
// State
// --------------------
let currentUser = null;
let viewedUserId = null;

// --------------------
// Auth Handling
// --------------------
onAuthStateChanged(auth, async (user)=>{
  if(!user){ window.location.href="login.html"; return; }
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
  sendMessageBtn.style.display = !isOwnProfile ? "block" : "none";

  if(!isOwnProfile){
    sendMessageBtn.onclick = ()=> openPrivateMessage(viewedUserId);
  }
});

// --------------------
// Profile Loading
// --------------------
async function loadProfile(uid){
  const userRef = doc(db,"users",uid);
  const snap = await getDoc(userRef);

  if(!snap.exists()){
    await setDoc(userRef,{bio:"",profilePicture:"",theme:"dark",createdAt:serverTimestamp()});
  }

  const data = (await getDoc(userRef)).data();

  profileName.textContent = data.username || "YourSpace User";
  profileBio.textContent = data.bio || "This is the bio lol";

  if(data.profilePicture) profilePic.src=data.profilePicture;
  else profilePic.src="default-avatar.png";

  applyTheme(data.theme || "dark");
}

// --------------------
// Save Bio
// --------------------
saveBioBtn?.addEventListener("click", async ()=>{
  if(!bioInput.value.trim()) return;
  await updateDoc(doc(db,"users",currentUser.uid),{bio: bioInput.value.trim()});
  profileBio.textContent = bioInput.value.trim();
  bioInput.value="";
});

// --------------------
// Save Profile Picture
// --------------------
savePfpBtn?.addEventListener("click", async ()=>{
  const file = pfpInput.files[0];
  if(!file){ alert("Select an image first"); return; }
  const pfpRef = ref(storage, `profilePictures/${currentUser.uid}`);
  await uploadBytes(pfpRef,file);
  const url = await getDownloadURL(pfpRef);
  await updateDoc(doc(db,"users",currentUser.uid),{profilePicture:url});
  profilePic.src=url;
  pfpInput.value="";
});

// --------------------
// Wall Comments
// --------------------
async function loadWall(uid){
  wallContainer.innerHTML="";
  const q = query(collection(db,"users",uid,"wallComments"),orderBy("createdAt","desc"));
  const snap = await getDocs(q);

  snap.forEach((docSnap)=>{
    const data = docSnap.data();
    const div=document.createElement("div");
    div.className="wall-post";
    div.innerHTML=`<strong>${data.username}</strong>: ${data.text}`;

    if(currentUser.uid===data.userId || currentUser.uid===uid){
      const del = document.createElement("button");
      del.textContent="Delete";
      del.onclick=async()=>{
        await deleteDoc(doc(db,"users",uid,"wallComments",docSnap.id));
        loadWall(uid);
      };
      div.appendChild(del);
    }

    // Clickable username in wall
    div.querySelector("strong").style.cursor="pointer";
    div.querySelector("strong").onclick=()=> window.location.href=`profile.html?uid=${data.userId}`;

    wallContainer.appendChild(div);
  });
}

postWallBtn?.addEventListener("click", async ()=>{
  if(!wallInput.value.trim()) return;
  const userSnap = await getDoc(doc(db,"users",currentUser.uid));
  const username = userSnap.data()?.username || "User";
  await addDoc(collection(db,"users",viewedUserId,"wallComments"),{
    text: wallInput.value.trim(),
    userId: currentUser.uid,
    username,
    createdAt: serverTimestamp()
  });
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
  const snap = await getDoc(doc(db,"users",uid));
  const friends = snap.data()?.top10Friends||[];

  friends.forEach(f=>{
    const div=document.createElement("div");
    div.className="top-friend";
    div.innerHTML=`<img src="${f.pfpURL||'default-avatar.png'}" width="40" height="40" style="border-radius:50%;">
                   <span class="topFriendName" style="cursor:pointer;">${f.username||'Unknown'}</span>`;
    div.querySelector(".topFriendName").onclick=()=> window.location.href=`profile.html?uid=${f.uid}`;
    top10Container.appendChild(div);
  });
}

// --------------------
// Music Player
// --------------------
async function loadMusic(uid){
  musicList.innerHTML="";
  const snap = await getDoc(doc(db,"users",uid));
  const songs = snap.data()?.musicPlaylist||[];

  songs.forEach((s,i)=>{
    const div=document.createElement("div");
    div.className="music-item";
    div.textContent=s.title||s.url||`Song ${i+1}`;
    div.style.cursor="pointer";
    div.onclick=()=>{
      musicPlayer.src=s.url;
      musicPlayer.play();
    };
    musicList.appendChild(div);
  });
}

// --------------------
// Private Messages
// --------------------
function openPrivateMessage(otherUid){
  // This would redirect to a privateMessages.html page with conversationId
  // conversationId can be deterministic: sort uids alphabetically and join
  const conversationId = [currentUser.uid,otherUid].sort().join("_");
  window.location.href=`privateMessages.html?cid=${conversationId}&other=${otherUid}`;
}
