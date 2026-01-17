import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, updateDoc, getDoc, deleteDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// ---------------- Firebase ----------------
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// ---------------- DOM ----------------
const profilePicInput = document.getElementById("profilePicInput");
const saveProfilePicBtn = document.getElementById("saveProfilePicBtn");
const profilePic = document.getElementById("profilePic");
const bioText = document.getElementById("bioText");
const saveBioBtn = document.getElementById("saveBioBtn");
const top10FriendsList = document.getElementById("top10FriendsList");
const wallCommentsList = document.getElementById("wallCommentsList");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const musicInput = document.getElementById("musicInput");
const addMusicBtn = document.getElementById("addMusicBtn");
const playlistDiv = document.getElementById("playlist");
const musicPlayerDiv = document.getElementById("musicPlayer");
const customHTMLInput = document.getElementById("customHTMLInput");
const applyCustomHTMLBtn = document.getElementById("applyCustomHTMLBtn");
const resetCustomHTMLBtn = document.getElementById("resetCustomHTMLBtn");
const themeBtns = document.querySelectorAll(".themeBtn");

// Navigation
document.getElementById("feedNavBtn").addEventListener("click",()=>window.location.href="feed.html");
document.getElementById("profileNavBtn").addEventListener("click",()=>window.location.href="profile.html");
document.getElementById("logoutBtn").addEventListener("click",async()=>{await signOut(auth);window.location.href="login.html";});

// ---------------- Helpers ----------------
async function getUsername(uid){
  const snap = await getDoc(doc(db,"users",uid));
  return snap.exists()&&snap.data().username?snap.data().username:"Anonymous";
}

// ---------------- Load Profile ----------------
async function loadProfile(uid){
  const userSnap = await getDoc(doc(db,"users",uid));
  if(!userSnap.exists()) return;
  const data = userSnap.data();
  profilePic.src = data.profilePicture || "default-avatar.png";
  bioText.value = data.bio || "";
  loadTop10Friends(data.top10Friends||[]);
  loadWallComments(uid);
  loadMusicPlaylist(data.musicPlaylist||[]);
}

// ---------------- Top 10 Friends ----------------
function loadTop10Friends(friends){
  top10FriendsList.innerHTML="";
  friends.forEach(f=>{
    const div=document.createElement("div");
    div.className="topFriend";
    div.innerHTML=`<img src="${f.pfpURL||'default-avatar.png'}">${f.username||'Unknown'}`;
    div.addEventListener("click",()=>window.location.href=`profile.html?uid=${f.uid}`);
    top10FriendsList.appendChild(div);
  });
}

// ---------------- Wall Comments ----------------
async function loadWallComments(uid){
  wallCommentsList.innerHTML="";
  const snap = await getDocs(query(collection(db,"users",uid,"wallComments"),orderBy("createdAt","asc")));
  snap.forEach(async cSnap=>{
    const data=cSnap.data();
    const username = await getUsername(data.userId);
    const div = document.createElement("div");
    div.className="wallComment";
    div.innerHTML = `<strong>${username}:</strong> ${data.text}`;
    wallCommentsList.appendChild(div);
  });
}

// Post wall comment
postWallCommentBtn.addEventListener("click",async()=>{
  const text = wallCommentInput.value.trim();
  if(!text) return;
  const urlParams = new URLSearchParams(window.location.search);
  const uid = urlParams.get("uid") || auth.currentUser.uid;
  await addDoc(collection(db,"users",uid,"wallComments"),{
    userId: auth.currentUser.uid,
    text,
    createdAt: new Date()
  });
  wallCommentInput.value="";
  loadWallComments(uid);
});

// ---------------- Profile Picture ----------------
saveProfilePicBtn.addEventListener("click",async()=>{
  const file = profilePicInput.files[0];
  if(!file) return alert("Select a file");
  const storageRef = ref(storage, `profilePictures/${auth.currentUser.uid}`);
  await uploadBytes(storageRef,file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db,"users",auth.currentUser.uid),{profilePicture:url});
  profilePic.src=url;
});

// ---------------- Bio ----------------
saveBioBtn.addEventListener("click",async()=>{
  await updateDoc(doc(db,"users",auth.currentUser.uid),{bio:bioText.value});
});

// ---------------- Music ----------------
addMusicBtn.addEventListener("click",async()=>{
  const url = musicInput.value.trim();
  if(!url) return;
  const userRef = doc(db,"users",auth.currentUser.uid);
  const userSnap = await getDoc(userRef);
  const playlist = userSnap.exists()&&userSnap.data().musicPlaylist?userSnap.data().musicPlaylist:[] ;
  playlist.push({url});
  await updateDoc(userRef,{musicPlaylist:playlist});
  musicInput.value="";
  loadMusicPlaylist(playlist);
});

function loadMusicPlaylist(playlist){
  playlistDiv.innerHTML="";
  musicPlayerDiv.innerHTML="";
  playlist.forEach((song,i)=>{
    const div=document.createElement("div");
    div.className="playlistSong";
    div.textContent = song.url;
    div.addEventListener("click",()=>{
      let embed="";
      if(song.url.includes("youtube.com")||song.url.includes("youtu.be")){
        const id = song.url.split("v=")[1]||song.url.split("/")[3];
        embed=`<iframe width="300" height="150" src="https://www.youtube.com/embed/${id}?autoplay=1" frameborder="0" allowfullscreen></iframe>`;
      } else {
        embed=`<a href="${song.url}" target="_blank">${song.url}</a>`;
      }
      musicPlayerDiv.innerHTML=embed;
    });
    playlistDiv.appendChild(div);
  });
}

// ---------------- Custom HTML / Themes ----------------
applyCustomHTMLBtn.addEventListener("click",()=>{
  const code = customHTMLInput.value;
  const div = document.createElement("div");
  div.innerHTML = code;
  document.body.appendChild(div);
});
resetCustomHTMLBtn.addEventListener("click",()=> location.reload());
themeBtns.forEach(btn=>btn.addEventListener("click",()=>{document.body.className=btn.dataset.theme;}));

// ---------------- Auth ----------------
onAuthStateChanged(auth,user=>{
  if(!user) window.location.href="login.html";
  else{
    const urlParams = new URLSearchParams(window.location.search);
    const uid = urlParams.get("uid") || user.uid;
    loadProfile(uid);
  }
});
