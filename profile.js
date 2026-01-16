import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// DOM
const profilePfp = document.getElementById("profilePfp");
const profilePfpInput = document.getElementById("profilePfpInput");
const savePfpBtn = document.getElementById("savePfpBtn");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const topFriendsContainer = document.getElementById("topFriendsContainer");
const friendSearchInput = document.getElementById("friendSearchInput");
const friendSearchResults = document.getElementById("friendSearchResults");
const pendingRequestsContainer = document.getElementById("pendingRequestsContainer");

const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const commentContainer = document.getElementById("commentContainer");

const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicPlayerContainer = document.getElementById("musicPlayerContainer");

let currentUser;

// NAV
document.getElementById("feedNavBtn").onclick = () => window.location.href="feed.html";
document.getElementById("profileNavBtn").onclick = () => window.location.href="profile.html";
document.getElementById("logoutBtn").onclick = async () => {
  await auth.signOut();
  window.location.href="login.html";
};

// AUTH
auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  loadProfile();
  loadPendingRequests();
});

// LOAD PROFILE
async function loadProfile() {
  const refUser = doc(db, "users", currentUser.uid);
  const snap = await getDoc(refUser);
  if (!snap.exists()) {
    await setDoc(refUser, {
      username: "",
      bio: "",
      location: "",
      pfpURL: "",
      topFriends: [],
      wallComments: [],
      pendingRequests: [],
      friends: [],
      musicURL: ""
    });
    return loadProfile();
  }

  const data = snap.data();
  usernameInput.value = data.username || "";
  bioInput.value = data.bio || "";
  locationInput.value = data.location || "";
  profilePfp.src = data.pfpURL || "default-avatar.png";

  renderTopFriends(data.topFriends || []);
  renderWallComments(data.wallComments || []);
  if(data.musicURL) renderMusic(data.musicURL);
}

// SAVE PROFILE INFO
saveProfileBtn.onclick = async () => {
  await updateDoc(doc(db,"users",currentUser.uid),{
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  alert("Profile info saved");
};

// SAVE PROFILE PICTURE
savePfpBtn.onclick = async () => {
  const file = profilePfpInput.files[0];
  if(!file) return alert("Select image");
  const storageRef = ref(storage, `profileImages/${currentUser.uid}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db,"users",currentUser.uid),{pfpURL: url});
  profilePfp.src = url;
};

// FRIEND SEARCH
friendSearchInput.oninput = async () => {
  const searchTerm = friendSearchInput.value.trim();
  friendSearchResults.innerHTML="";
  if(!searchTerm) return;
  const usersQuery = query(collection(db,"users"), where("username","==",searchTerm));
  const resultsSnap = await getDocs(usersQuery);
  resultsSnap.forEach(docSnap=>{
    const user = docSnap.data();
    const div = document.createElement("div");
    div.className = "friend-result";
    div.innerHTML = `<img src="${user.pfpURL||'default-avatar.png'}"><span>${user.username}</span> <button>Add Friend</button>`;
    const btn = div.querySelector("button");
    btn.onclick = async ()=>{
      const targetUid = docSnap.id;
      await updateDoc(doc(db,"users",targetUid),{
        pendingRequests: arrayUnion({uid: currentUser.uid, username: usernameInput.value})
      });
      alert("Friend request sent!");
    };
    friendSearchResults.appendChild(div);
  });
};

// PENDING REQUESTS
async function loadPendingRequests() {
  const snap = await getDoc(doc(db,"users",currentUser.uid));
  const data = snap.data();
  pendingRequestsContainer.innerHTML="";
  (data.pendingRequests||[]).forEach((req,index)=>{
    const div=document.createElement("div");
    div.className="pending-request";
    div.innerHTML=`<img src="default-avatar.png"><span>${req.username}</span>
      <button>Accept</button> <button>Deny</button>`;
    const [acceptBtn,denyBtn] = div.querySelectorAll("button");
    acceptBtn.onclick = async ()=>{
      // Add to friends
      await updateDoc(doc(db,"users",currentUser.uid),{
        friends: arrayUnion({uid:req.uid, username:req.username}),
        pendingRequests: arrayRemove(req)
      });
      renderTopFriends((await getDoc(doc(db,"users",currentUser.uid))).data().topFriends||[]);
      loadPendingRequests();
    };
    denyBtn.onclick = async ()=>{
      await updateDoc(doc(db,"users",currentUser.uid),{
        pendingRequests: arrayRemove(req)
      });
      loadPendingRequests();
    };
    pendingRequestsContainer.appendChild(div);
  });
}

// TOP FRIENDS
function renderTopFriends(friends){
  topFriendsContainer.innerHTML="";
  friends.forEach((f,index)=>{
    const div=document.createElement("div");
    div.className="top-friend";
    div.innerHTML=`<img src="default-avatar.png"><strong>${f.username}</strong>`;
    topFriendsContainer.appendChild(div);
  });
}

// WALL COMMENTS
postWallCommentBtn.onclick = async ()=>{
  const text=wallCommentInput.value.trim();
  if(!text) return;
  const refUser = doc(db,"users",currentUser.uid);
  const snap = await getDoc(refUser);
  const comments = snap.data().wallComments || [];
  comments.push({uid:currentUser.uid,user:usernameInput.value,text});
  await updateDoc(refUser,{wallComments:comments});
  renderWallComments(comments);
  wallCommentInput.value="";
};
function renderWallComments(comments){
  commentContainer.innerHTML="";
  comments.forEach(c=>{
    const div=document.createElement("div");
    div.innerHTML=`<strong>${c.user}:</strong> ${c.text}`;
    commentContainer.appendChild(div);
  });
}

// MUSIC PLAYER
saveMusicBtn.onclick = async ()=>{
  const url = musicInput.value.trim();
  if(!url) return alert("Enter a URL");
  await updateDoc(doc(db,"users",currentUser.uid),{musicURL:url});
  renderMusic(url);
};
function renderMusic(url){
  if(url.includes("youtube")){
    const id = url.split("v=")[1]?.split("&")[0];
    musicPlayerContainer.innerHTML=`<iframe width="100%" height="200" src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
  }else{
    musicPlayerContainer.innerHTML=`<audio controls src="${url}"></audio>`;
  }
}
