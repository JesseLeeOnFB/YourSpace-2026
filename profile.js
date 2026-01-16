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

// DOM Elements
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
let currentUserData;

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
  const refUser = doc(db, "users", currentUser.uid);
  const snap = await getDoc(refUser);

  if (!snap.exists()) {
    await setDoc(refUser, {
      username: "",
      bio: "",
      location: "",
      pfpURL: "",
      topFriends: [],
      friends: [],
      pendingRequests: [],
      wallComments: [],
      musicURL: ""
    });
    return loadProfile();
  }

  currentUserData = snap.data();

  usernameInput.value = currentUserData.username || "";
  bioInput.value = currentUserData.bio || "";
  locationInput.value = currentUserData.location || "";
  profilePfp.src = currentUserData.pfpURL || "default-avatar.png";

  renderTopFriends(currentUserData.topFriends || []);
  renderWallComments(currentUserData.wallComments || []);
  if (currentUserData.musicURL) renderMusic(currentUserData.musicURL);
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
  alert("Profile picture saved!");
};

// FRIEND SEARCH & REQUEST
addTopFriendBtn.onclick = async () => {
  const usernameToAdd = topFriendInput.value.trim();
  if (!usernameToAdd) return alert("Enter a username");

  // Search for user
  const q = query(collection(db, "users"), where("username", "==", usernameToAdd));
  const results = await getDocs(q);

  if (results.empty) return alert("User not found");

  const userDoc = results.docs[0];
  const userData = userDoc.data();
  const userId = userDoc.id;

  // Check if already friends
  if ((currentUserData.friends || []).includes(userId)) return alert("Already friends");

  // Add to pending requests of that user
  await updateDoc(doc(db, "users", userId), {
    pendingRequests: arrayUnion(currentUser.uid)
  });

  alert(`Friend request sent to ${usernameToAdd}`);
  topFriendInput.value = "";
};

// LOAD FRIEND REQUESTS
async function loadFriendRequests() {
  friendRequestsContainer.innerHTML = "";
  const pending = currentUserData.pendingRequests || [];
  if (!pending.length) return;

  for (let requesterId of pending) {
    const snap = await getDoc(doc(db, "users", requesterId));
    if (!snap.exists()) continue;
    const data = snap.data();

    const div = document.createElement("div");
    div.className = "friend-request";
    div.innerHTML = `
      <img src="${data.pfpURL || 'default-avatar.png'}" class="friend-request-pfp">
      <span>${data.username}</span>
      <button class="accept-btn">Accept</button>
      <button class="deny-btn">Deny</button>
    `;

    // ACCEPT FRIEND REQUEST
    div.querySelector(".accept-btn").onclick = async () => {
      // Add each other to friends
      await updateDoc(doc(db, "users", currentUser.uid), {
        friends: arrayUnion(requesterId),
        pendingRequests: arrayRemove(requesterId)
      });
      await updateDoc(doc(db, "users", requesterId), {
        friends: arrayUnion(currentUser.uid)
      });
      alert(`Friend request from ${data.username} accepted!`);
      await loadProfile();
      await loadFriendRequests();
    };

    // DENY FRIEND REQUEST
    div.querySelector(".deny-btn").onclick = async () => {
      await updateDoc(doc(db, "users", currentUser.uid), {
        pendingRequests: arrayRemove(requesterId)
      });
      alert(`Friend request from ${data.username} denied.`);
      await loadFriendRequests();
    };

    friendRequestsContainer.appendChild(div);
  }
}

// TOP FRIENDS DISPLAY
function renderTopFriends(friends) {
  topFriendsContainer.innerHTML = "";

  friends.forEach((f, index) => {
    const div = document.createElement("div");
    div.className = "top-friend";

    div.innerHTML = `
      <strong class="friend-name">${f.username}</strong>
      <button data-index="${index}">Remove</button>
    `;

    div.querySelector(".friend-name").onclick = () => {
      window.location.href = `/profile.html?user=${f.username}`;
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
  if (!text) return;

  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);
  const comments = snap.data().wallComments || [];

  comments.push({
    uid: currentUser.uid,
    user: currentUserData.username || currentUser.email.split("@")[0],
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
  if (!url) return alert("Enter a music URL");

  await updateDoc(doc(db, "users", currentUser.uid), { musicURL: url });
  renderMusic(url);
};

function renderMusic(url) {
  if (url.includes("youtube")) {
    const id = url.split("v=")[1]?.split("&")[0];
    musicPlayerContainer.innerHTML = `
      <iframe width="100%" height="200"
      src="https://www.youtube.com/embed/${id}"
      allowfullscreen></iframe>`;
  } else {
    musicPlayerContainer.innerHTML = `
      <audio controls src="${url}"></audio>`;
  }
}
