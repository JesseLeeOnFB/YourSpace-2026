import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { 
  getFirestore, doc, getDoc, updateDoc, arrayUnion, collection, addDoc, getDocs, deleteDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

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

// DOM Elements
const profilePicture = document.getElementById("profilePicture");
const pfpInput = document.getElementById("pfpInput");
const savePfpBtn = document.getElementById("savePfpBtn");
const bioText = document.getElementById("bioText");
const saveBioBtn = document.getElementById("saveBioBtn");
const top10Container = document.getElementById("top10Container");
const wallCommentsContainer = document.getElementById("wallCommentsContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const musicUrlInput = document.getElementById("musicUrlInput");
const addMusicBtn = document.getElementById("addMusicBtn");
const playlistContainer = document.getElementById("playlistContainer");
const musicPlayer = document.getElementById("musicPlayer");

const navFeedBtn = document.getElementById("feedNavBtn");
const navProfileBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

navFeedBtn?.addEventListener("click", () => window.location.href = "feed.html");
navProfileBtn?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => { await signOut(auth); window.location.href="login.html"; });

// Get username helper
async function getUsername(uid){
  try{
    const snap = await getDoc(doc(db,"users",uid));
    return snap.exists() ? snap.data().username || "Anonymous" : "Anonymous";
  } catch {
    return "Anonymous";
  }
}

// Load profile info
async function loadProfile(uid){
  const userSnap = await getDoc(doc(db,"users",uid));
  if(!userSnap.exists()) return;
  const userData = userSnap.data();
  profilePicture.src = userData.profilePicture || "default-avatar.png";
  bioText.value = userData.bio || "This is the bio lol";
  loadTop10Friends(userData.top10Friends||[]);
  loadWallComments(uid);
  loadMusicPlaylist(userData.musicPlaylist||[]);
}

// Save PFP
savePfpBtn?.addEventListener("click", async ()=>{
  const file = pfpInput.files[0];
  if(!file) return alert("Select a file first");
  const storageRef = ref(storage, `profilePictures/${auth.currentUser.uid}`);
  await uploadBytes(storageRef,file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db,"users",auth.currentUser.uid), {profilePicture:url});
  profilePicture.src = url;
  alert("Profile picture updated!");
});

// Save Bio
saveBioBtn?.addEventListener("click", async ()=>{
  await updateDoc(doc(db,"users",auth.currentUser.uid), {bio:bioText.value});
  alert("Bio updated!");
});

// Top 10 friends
function loadTop10Friends(friends){
  top10Container.innerHTML="";
  friends.forEach(f=>{
    const div = document.createElement("div");
    div.className="top-friend";
    div.innerHTML=`<img src="${f.pfpURL||'default-avatar.png'}"> <a href="profile.html?uid=${f.uid}">${f.username||'Unknown'}</a>`;
    top10Container.appendChild(div);
  });
}

// Wall Comments
async function loadWallComments(profileUid){
  wallCommentsContainer.innerHTML="";
  const commentsSnap = await getDocs(collection(db,"users",profileUid,"wallComments"));
  commentsSnap.forEach(async cSnap=>{
    const data=cSnap.data();
    const username = await getUsername(data.userId);
    const div = document.createElement("div");
    div.className="wall-comment";
    div.innerHTML=`<p><a href="profile.html?uid=${data.userId}">${username}</a>: ${data.text}</p>`;
    // Delete button if owner
    if(data.userId===auth.currentUser.uid || profileUid===auth.currentUser.uid){
      const delBtn=document.createElement("button");
      delBtn.textContent="Delete";
      delBtn.addEventListener("click",async()=>{
        await deleteDoc(doc(db,"users",profileUid,"wallComments",cSnap.id));
        loadWallComments(profileUid);
      });
      div.appendChild(delBtn);
    }
    wallCommentsContainer.appendChild(div);
  });
}

// Post wall comment
postWallCommentBtn?.addEventListener("click", async ()=>{
  const text = wallCommentInput.value.trim();
  if(!text) return;
  const urlParams = new URLSearchParams(window.location.search);
  const profileUid = urlParams.get("uid") || auth.currentUser.uid;
  await addDoc(collection(db,"users",profileUid,"wallComments"),{userId:auth.currentUser.uid,text,createdAt:new Date()});
  wallCommentInput.value="";
  loadWallComments(profileUid);
});

// Music Player
function loadMusicPlaylist(playlist){
  playlistContainer.innerHTML="";
  playlist.forEach((track,index)=>{
    const div = document.createElement("div");
    div.className="playlist-track";
    div.textContent = track.title || track.url;
    div.addEventListener("click",()=>{
      musicPlayer.src=track.url;
    });
    playlistContainer.appendChild(div);
  });
}

addMusicBtn?.addEventListener("click", async ()=>{
  const url = musicUrlInput.value.trim();
  if(!url) return;
  const title = url; // optional: extract title from URL or user input
  const profileUid = auth.currentUser.uid;
  await updateDoc(doc(db,"users",profileUid),{musicPlaylist: arrayUnion({url,title})});
  musicUrlInput.value="";
  loadProfile(profileUid);
});

// Auth
onAuthStateChanged(auth,user=>{
  if(!user){window.location.href="login.html";}
  else{
    const urlParams = new URLSearchParams(window.location.search);
    const profileUid = urlParams.get("uid") || user.uid;
    loadProfile(profileUid);
  }
});
