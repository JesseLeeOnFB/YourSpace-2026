import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
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
const topFriendInput = document.getElementById("topFriendInput");
const addTopFriendBtn = document.getElementById("addTopFriendBtn");
const topFriendsContainer = document.getElementById("topFriendsContainer");
const friendRequestsContainer = document.getElementById("friendRequestsContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const commentContainer = document.getElementById("commentContainer");
const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicPlayerContainer = document.getElementById("musicPlayerContainer");

let currentUser;

// AUTH
auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  loadProfile();
});

// NAV BUTTONS
document.getElementById("feedNavBtn").onclick = () => window.location.href = "feed.html";
document.getElementById("logoutBtn").onclick = () => auth.signOut().then(() => window.location.href="login.html");

// LOAD PROFILE
async function loadProfile() {
  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      username: "",
      bio: "",
      location: "",
      pfpURL: "",
      topFriends: [],
      friendRequests: [],
      wallComments: [],
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
  loadFriendRequests();
  renderWallComments(data.wallComments || []);
  if (data.musicURL) renderMusic(data.musicURL);
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
  if (!file) return alert("Select an image");

  const storageRef = ref(storage, `pfp/${currentUser.uid}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await updateDoc(doc(db, "users", currentUser.uid), { pfpURL: url });
  profilePfp.src = url;
};

// TOP 10 FRIENDS
function renderTopFriends(topFriends) {
  topFriendsContainer.innerHTML = "";
  topFriends.forEach((f, i) => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `
      <span class="friend-rank">#${i+1}</span>
      <img src="${f.pfpURL || 'default-avatar.png'}" class="friend-pfp">
      <strong class="friend-name">${f.username}</strong>
      <button data-index="${i}">Remove</button>
    `;

    div.querySelector(".friend-name").onclick = () => {
      window.location.href = `/profile.html?user=${f.uid}`;
    };
    div.querySelector("button").onclick = async () => {
      topFriends.splice(i,1);
      await updateDoc(doc(db, "users", currentUser.uid), { topFriends });
      renderTopFriends(topFriends);
    };
    topFriendsContainer.appendChild(div);
  });
}

// ADD FRIEND REQUEST
addTopFriendBtn.onclick = async () => {
  const usernameToAdd = topFriendInput.value.trim();
  if (!usernameToAdd) return;

  const usersSnap = await getDocs(collection(db, "users"));
  const foundUserDoc = usersSnap.docs.find(d => d.data().username === usernameToAdd);
  if (!foundUserDoc) return alert("User not found.");

  const targetUid = foundUserDoc.id;

  const targetRef = doc(db, "users", targetUid);
  const targetSnap = await getDoc(targetRef);
  const requests = targetSnap.data().friendRequests || [];

  if (requests.some(r => r.uid === currentUser.uid)) return alert("Request already sent.");

  requests.push({
    uid: currentUser.uid,
    username: auth.currentUser.displayName || auth.currentUser.email.split("@")[0],
    status: "pending"
  });

  await updateDoc(targetRef, { friendRequests: requests });
  topFriendInput.value = "";
  alert("Friend request sent!");
};

// LOAD FRIEND REQUESTS
async function loadFriendRequests() {
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);
  const requests = snap.data().friendRequests || [];

  friendRequestsContainer.innerHTML = "";
  requests.forEach((req,i)=>{
    if(req.status !== "pending") return;
    const div = document.createElement("div");
    div.className="friend-request";
    div.innerHTML = `
      <span>${req.username}</span>
      <button data-index="${i}" class="accept-btn">Accept</button>
      <button data-index="${i}" class="deny-btn">Deny</button>
    `;

    div.querySelector(".accept-btn").onclick = async ()=>{
      req.status="accepted";
      const topFriendsSnap = await getDoc(userRef);
      const topFriends = topFriendsSnap.data().topFriends || [];
      if(topFriends.length<10){
        topFriends.push({uid:req.uid, username:req.username, pfpURL:"default-avatar.png", rank:topFriends.length+1});
        await updateDoc(userRef,{topFriends});
      }
      await updateDoc(userRef,{friendRequests:requests});
      loadFriendRequests();
      renderTopFriends(topFriends);
    };

    div.querySelector(".deny-btn").onclick=async()=>{
      req.status="denied";
      await updateDoc(userRef,{friendRequests:requests});
      loadFriendRequests();
    };

    friendRequestsContainer.appendChild(div);
  });
}

// WALL COMMENTS
postWallCommentBtn.onclick = async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;

  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);
  const comments = snap.data().wallComments || [];

  comments.push({
    uid: currentUser.uid,
    user: auth.currentUser.displayName || auth.currentUser.email.split("@")[0],
    text
  });

  await updateDoc(ref, { wallComments: comments });
  renderWallComments(comments);
  wallCommentInput.value = "";
};

function renderWallComments(comments) {
  commentContainer.innerHTML = "";
  comments.forEach((c,i)=>{
    const div = document.createElement("div");
    div.innerHTML = `<strong>${c.user}:</strong> ${c.text}<button>Delete</button>`;
    div.querySelector("button").onclick=async()=>{
      comments.splice(i,1);
      await updateDoc(doc(db,"users",currentUser.uid),{wallComments:comments});
      renderWallComments(comments);
    };
    commentContainer.appendChild(div);
  });
}

// MUSIC PLAYER
saveMusicBtn.onclick = async () => {
  const url = musicInput.value.trim();
  if (!url) return alert("Enter a valid URL");

  await updateDoc(doc(db, "users", currentUser.uid), { musicURL: url });
  renderMusic(url);
};

function renderMusic(url){
  if(url.includes("youtube")){
    const id = url.split("v=")[1]?.split("&")[0];
    musicPlayerContainer.innerHTML=`<iframe width="100%" height="200" src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
  } else {
    musicPlayerContainer.innerHTML=`<audio controls src="${url}"></audio>`;
  }
}
