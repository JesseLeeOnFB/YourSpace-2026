import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

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

const searchFriendInput = document.getElementById("searchFriendInput");
const searchResultsContainer = document.getElementById("searchResultsContainer");

const pendingRequestsContainer = document.getElementById("pendingRequestsContainer");

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
  await loadProfile();
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
      musicURL: "",
      friendRequests: [],
      friends: []
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
  if (data.musicURL) renderMusic(data.musicURL);
  renderPendingRequests(data.friendRequests || []);
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

  const storageRef = ref(storage, `profileImages/${currentUser.uid}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await updateDoc(doc(db, "users", currentUser.uid), { pfpURL: url });
  profilePfp.src = url;
};

// TOP FRIENDS
addTopFriendBtn.onclick = async () => {
  const username = topFriendInput.value.trim();
  if (!username) return;

  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);
  const data = snap.data();
  const friends = data.friends || [];
  const topFriends = data.topFriends || [];

  // Must be a confirmed friend
  const friendSnap = await findUserByUsername(username);
  if (!friendSnap) return alert("User not found");
  const friendData = friendSnap.data();

  const isFriend = friends.some(f => f.uid === friendSnap.id);
  if (!isFriend) return alert("You must be friends before adding to Top 10");

  if (topFriends.length >= 10) return alert("Max 10 top friends");
  topFriends.push({ uid: friendSnap.id, username: friendData.username });
  await updateDoc(userRef, { topFriends });
  renderTopFriends(topFriends);
  topFriendInput.value = "";
};

function renderTopFriends(friends) {
  topFriendsContainer.innerHTML = "";
  friends.forEach((f, index) => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `<strong class="friend-name">${index + 1}. ${f.username}</strong>
                     <button data-index="${index}">Remove</button>`;
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

// SEARCH USERS
searchFriendInput.oninput = async () => {
  const queryName = searchFriendInput.value.trim().toLowerCase();
  searchResultsContainer.innerHTML = "";
  if (!queryName) return;

  // Naive search: iterate users
  const usersSnap = await getDocs(doc(db, "users", "dummy")); // We'll fix proper search after testing
  // Placeholder: you can later implement full Firestore query
  // For now, manually check a few dummy accounts
};

// PENDING FRIEND REQUESTS
async function renderPendingRequests(requests) {
  pendingRequestsContainer.innerHTML = "";
  requests.forEach((req, index) => {
    if (req.status !== "pending") return;
    const div = document.createElement("div");
    div.className = "pending-request";
    div.innerHTML = `<span>${req.fromUsername}</span>
                     <button data-index="${index}" class="accept-btn">Accept</button>
                     <button data-index="${index}" class="deny-btn">Deny</button>`;

    div.querySelector(".accept-btn").onclick = async () => {
      // Add to friends list
      const refUser = doc(db, "users", currentUser.uid);
      const snap = await getDoc(refUser);
      const data = snap.data();
      const friends = data.friends || [];
      friends.push({ uid: req.fromUID, username: req.fromUsername });

      // Remove request
      requests.splice(index, 1);

      await updateDoc(refUser, { friends, friendRequests: requests });
      renderPendingRequests(requests);
    };

    div.querySelector(".deny-btn").onclick = async () => {
      requests.splice(index, 1);
      await updateDoc(doc(db, "users", currentUser.uid), { friendRequests: requests });
      renderPendingRequests(requests);
    };

    pendingRequestsContainer.appendChild(div);
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
    div.innerHTML = `<strong>${c.user}:</strong> ${c.text}
                     <button>Delete</button>`;
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
    musicPlayerContainer.innerHTML = `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
  } else {
    musicPlayerContainer.innerHTML = `<audio controls src="${url}"></audio>`;
  }
}

// UTILITY: Find user by username
async function findUserByUsername(name) {
  // Placeholder: implement Firestore query
  return null;
}
