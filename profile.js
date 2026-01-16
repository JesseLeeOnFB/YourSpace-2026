// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, where
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
const topFriendInput = document.getElementById("topFriendInput");
const addTopFriendBtn = document.getElementById("addTopFriendBtn");
const topFriendsContainer = document.getElementById("topFriendsContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const commentContainer = document.getElementById("commentContainer");
const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicPlayerContainer = document.getElementById("musicPlayerContainer");

const searchUserInput = document.getElementById("searchUserInput");
const searchResultsContainer = document.getElementById("searchResultsContainer");
const pendingRequestsContainer = document.getElementById("pendingRequestsContainer");

let currentUser;

// AUTH
auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  await loadProfile();
  await loadTopFriends();
  await loadPendingRequests();
});

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

  renderWallComments(data.wallComments || []);
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

  const storageRef = ref(storage, `profileImages/${currentUser.uid}/${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await updateDoc(doc(db, "users", currentUser.uid), { pfpURL: url });
  profilePfp.src = url;
  alert("Profile picture updated");
};

// WALL COMMENTS
postWallCommentBtn.onclick = async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;

  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);
  const comments = snap.data().wallComments || [];

  comments.push({
    uid: currentUser.uid,
    user: usernameInput.value || currentUser.email.split("@")[0],
    text
  });

  await updateDoc(ref, { wallComments: comments });
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
      comments.splice(i, 1);
      await updateDoc(doc(db, "users", currentUser.uid), { wallComments: comments });
      renderWallComments(comments);
    };

    commentContainer.appendChild(div);
  });
}

// MUSIC PLAYER
saveMusicBtn.onclick = async () => {
  const url = musicInput.value.trim();
  if (!url) return;
  await updateDoc(doc(db, "users", currentUser.uid), { musicURL: url });
  renderMusic(url);
};

function renderMusic(url) {
  if (url.includes("youtube")) {
    const id = url.split("v=")[1]?.split("&")[0];
    if (!id) return alert("Invalid YouTube URL");
    musicPlayerContainer.innerHTML = `
      <iframe width="100%" height="200"
      src="https://www.youtube.com/embed/${id}"
      allowfullscreen></iframe>`;
  } else {
    musicPlayerContainer.innerHTML = `<audio controls src="${url}"></audio>`;
  }
}

// --- FRIEND REQUESTS & TOP FRIENDS ---

// SEARCH USERS
searchUserInput.oninput = async () => {
  const queryText = searchUserInput.value.trim();
  if (!queryText) {
    searchResultsContainer.innerHTML = "";
    return;
  }

  const q = query(collection(db, "users"), where("username", "==", queryText));
  const snap = await getDocs(q);

  searchResultsContainer.innerHTML = "";
  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (docSnap.id === currentUser.uid) return; // Skip self

    const div = document.createElement("div");
    div.className = "search-result";
    div.innerHTML = `
      <img src="${data.pfpURL || "default-avatar.png"}" class="search-pfp">
      <span>${data.username}</span>
      <button>Add Friend</button>
    `;

    div.querySelector("button").onclick = () => sendFriendRequest(docSnap.id);
    searchResultsContainer.appendChild(div);
  });
};

// SEND FRIEND REQUEST
async function sendFriendRequest(targetUid) {
  try {
    const requestRef = doc(collection(db, "users", targetUid, "friendRequests"));
    await setDoc(requestRef, {
      from: currentUser.uid,
      status: "pending",
      timestamp: new Date()
    });
    alert("Friend request sent!");
  } catch (err) {
    console.error(err);
    alert("Failed to send friend request");
  }
}

// LOAD PENDING REQUESTS
async function loadPendingRequests() {
  const requestsSnap = await getDocs(collection(db, "users", currentUser.uid, "friendRequests"));
  pendingRequestsContainer.innerHTML = "";

  requestsSnap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "pending-request";
    div.innerHTML = `
      <span>${data.from}</span>
      <button class="accept-btn">Accept</button>
      <button class="deny-btn">Deny</button>
    `;

    div.querySelector(".accept-btn").onclick = () => acceptFriendRequest(docSnap.id, data.from);
    div.querySelector(".deny-btn").onclick = () => denyFriendRequest(docSnap.id);

    pendingRequestsContainer.appendChild(div);
  });
}

// ACCEPT FRIEND REQUEST
async function acceptFriendRequest(requestId, fromUid) {
  const meRef = doc(db, "users", currentUser.uid);
  const fromRef = doc(db, "users", fromUid);

  const meSnap = await getDoc(meRef);
  const fromSnap = await getDoc(fromRef);

  const myFriends = meSnap.data().friends || [];
  const theirFriends = fromSnap.data().friends || [];

  myFriends.push({ uid: fromUid, username: fromSnap.data().username });
  theirFriends.push({ uid: currentUser.uid, username: meSnap.data().username });

  await updateDoc(meRef, { friends: myFriends });
  await updateDoc(fromRef, { friends: theirFriends });

  // Remove friend request
  await updateDoc(doc(db, "users", currentUser.uid, "friendRequests", requestId), { status: "accepted" });

  loadPendingRequests();
  loadTopFriends();
}

// DENY FRIEND REQUEST
async function denyFriendRequest(requestId) {
  await updateDoc(doc(db, "users", currentUser.uid, "friendRequests", requestId), { status: "denied" });
  loadPendingRequests();
}

// LOAD TOP FRIENDS
async function loadTopFriends() {
  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const friends = userSnap.data().friends || [];
  topFriendsContainer.innerHTML = "";

  friends.forEach(f => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `
      <img src="${f.pfpURL || "default-avatar.png"}" class="top-friend-pfp">
      <strong class="friend-name">${f.username}</strong>
    `;
    div.querySelector(".friend-name").onclick = () => {
      window.location.href = `/profile.html?user=${f.username}`;
    };
    topFriendsContainer.appendChild(div);
  });
}
