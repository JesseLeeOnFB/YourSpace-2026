// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

// Initialize
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// DOM
const profilePfp = document.getElementById("profilePfp");
const profilePfpInput = document.getElementById("profilePfpInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const savePfpBtn = document.getElementById("savePfpBtn");

const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");

const topFriendInput = document.getElementById("topFriendInput");
const addTopFriendBtn = document.getElementById("addTopFriendBtn");
const topFriendsContainer = document.getElementById("topFriendsContainer");

const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const commentContainer = document.getElementById("commentContainer");

const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicPlayerContainer = document.getElementById("musicPlayerContainer");

const searchFriendInput = document.getElementById("topFriendInput");
const friendPreviewContainer = document.createElement("div");
friendPreviewContainer.id = "friendPreviewContainer";
document.querySelector(".top-friends-section").appendChild(friendPreviewContainer);

const friendRequestsContainer = document.createElement("div");
friendRequestsContainer.id = "friendRequestsContainer";
friendRequestsContainer.innerHTML = "<h3>Friend Requests</h3>";
document.querySelector(".top-friends-section").appendChild(friendRequestsContainer);

let currentUser;

// AUTH
auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  await loadProfile();
  await loadFriendRequests();
});

// LOAD PROFILE
async function loadProfile() {
  const refDoc = doc(db, "users", currentUser.uid);
  const snap = await getDoc(refDoc);

  if (!snap.exists()) {
    await setDoc(refDoc, {
      username: "",
      bio: "",
      location: "",
      pfpURL: "",
      topFriends: [],
      wallComments: [],
      musicURL: "",
      friendRequests: []
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
  await updateDoc(doc(db, "users", currentUser.uid), {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  alert("Profile info saved");
};

// SAVE PROFILE PICTURE
savePfpBtn.onclick = async () => {
  const file = profilePfpInput.files[0];
  if(!file) return alert("Select an image");

  const storageRef = ref(storage, `profileImages/${currentUser.uid}/${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await updateDoc(doc(db, "users", currentUser.uid), { pfpURL: url });
  profilePfp.src = url;
};

// TOP FRIENDS RENDER
function renderTopFriends(friends) {
  topFriendsContainer.innerHTML = "";

  friends.forEach((f, index) => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `
      <span class="friend-rank">${index + 1}</span>
      <img src="${f.pfpURL || 'default-avatar.png'}" class="friend-pfp-small">
      <strong class="friend-name">${f.username}</strong>
      <button data-index="${index}">Remove</button>
    `;

    div.querySelector(".friend-name").onclick = () => {
      window.location.href = `/profile.html?user=${encodeURIComponent(f.username)}`;
    };

    div.querySelector("button").onclick = async () => {
      friends.splice(index, 1);
      await updateDoc(doc(db, "users", currentUser.uid), { topFriends: friends });
      renderTopFriends(friends);
    };

    topFriendsContainer.appendChild(div);
  });
}

// WALL COMMENTS
postWallCommentBtn.onclick = async () => {
  const text = wallCommentInput.value.trim();
  if(!text) return;

  const refDoc = doc(db, "users", currentUser.uid);
  const snap = await getDoc(refDoc);
  const comments = snap.data().wallComments || [];

  comments.push({
    uid: currentUser.uid,
    user: usernameInput.value || currentUser.email.split("@")[0],
    text
  });

  await updateDoc(refDoc, { wallComments: comments });
  renderWallComments(comments);
  wallCommentInput.value = "";
};

function renderWallComments(comments) {
  commentContainer.innerHTML = "";

  comments.forEach((c, i) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <strong>${c.user}:</strong> ${c.text}
      <button>Delete</button>
    `;

    div.querySelector("button").onclick = async () => {
      comments.splice(i,1);
      await updateDoc(doc(db,"users",currentUser.uid), { wallComments: comments });
      renderWallComments(comments);
    };

    commentContainer.appendChild(div);
  });
}

// MUSIC PLAYER
saveMusicBtn.onclick = async () => {
  const url = musicInput.value.trim();
  if(!url) return;

  await updateDoc(doc(db, "users", currentUser.uid), { musicURL: url });
  renderMusic(url);
};

function renderMusic(url) {
  if(url.includes("youtube")) {
    const id = url.split("v=")[1]?.split("&")[0];
    musicPlayerContainer.innerHTML = `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
  } else {
    musicPlayerContainer.innerHTML = `<audio controls src="${url}"></audio>`;
  }
}

// FRIEND REQUESTS HANDLING
async function loadFriendRequests() {
  const userSnap = await getDoc(doc(db,"users",currentUser.uid));
  const requests = userSnap.data().friendRequests || [];
  friendRequestsContainer.innerHTML = "<h3>Friend Requests</h3>";

  requests.forEach((req,idx)=>{
    const div = document.createElement("div");
    div.className = "friend-request";
    div.innerHTML = `
      <img src="${req.pfpURL||'default-avatar.png'}" class="friend-pfp-small">
      <strong>${req.username}</strong>
      <button class="accept-btn">Accept</button>
      <button class="deny-btn">Deny</button>
    `;

    div.querySelector(".accept-btn").onclick = async ()=>{
      const topFriendsSnap = await getDoc(doc(db,"users",currentUser.uid));
      const topFriends = topFriendsSnap.data().topFriends || [];
      if(topFriends.length<10) topFriends.push({uid:req.uid,username:req.username,pfpURL:req.pfpURL||''});

      const newRequests = requests.filter((r,i)=>i!==idx);
      await updateDoc(doc(db,"users",currentUser.uid),{topFriends,friendRequests:newRequests});
      renderTopFriends(topFriends);
      loadFriendRequests();
    };

    div.querySelector(".deny-btn").onclick = async ()=>{
      const newRequests = requests.filter((r,i)=>i!==idx);
      await updateDoc(doc(db,"users",currentUser.uid),{friendRequests:newRequests});
      loadFriendRequests();
    };

    friendRequestsContainer.appendChild(div);
  });
}

// SEARCH FRIEND PREVIEW & SEND REQUEST
searchFriendInput.addEventListener("input",async ()=>{
  const queryText = searchFriendInput.value.trim();
  friendPreviewContainer.innerHTML = "";
  if(!queryText) return;

  const q = query(collection(db,"users"),where("username","==",queryText));
  const snapshot = await getDocs(q);

  snapshot.forEach(docSnap=>{
    const userData = docSnap.data();
    const userId = docSnap.id;
    if(userId===currentUser.uid) return;

    const div = document.createElement("div");
    div.className = "friend-preview";
    div.innerHTML=`
      <img src="${userData.pfpURL||'default-avatar.png'}" class="friend-pfp-small">
      <strong>${userData.username}</strong>
      <button class="add-friend-btn">Add Friend</button>
      <span class="request-status"></span>
    `;

    const addBtn = div.querySelector(".add-friend-btn");
    const statusSpan = div.querySelector(".request-status");

    addBtn.onclick=async ()=>{
      try{
        const otherRef = doc(db,"users",userId);
        const otherSnap = await getDoc(otherRef);
        const existing = otherSnap.data().friendRequests || [];

        if(existing.some(r=>r.uid===currentUser.uid)){
          statusSpan.textContent = "Pending";
          return;
        }

        existing.push({uid:currentUser.uid,username:usernameInput.value,pfpURL:profilePfp.src,status:"pending"});
        await updateDoc(otherRef,{friendRequests:existing});
        statusSpan.textContent = "Pending";
      }catch(err){
        console.error(err);
        alert("Failed to send friend request");
      }
    };

    friendPreviewContainer.appendChild(div);
  });
});
