import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, arrayUnion
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
const searchUserInput = document.getElementById("searchUserInput");
const searchUserBtn = document.getElementById("searchUserBtn");
const searchResultsContainer = document.getElementById("searchResultsContainer");
const topFriendsContainer = document.getElementById("topFriendsContainer");
const incomingRequestsContainer = document.getElementById("incomingRequestsContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const commentContainer = document.getElementById("commentContainer");
const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicPlayerContainer = document.getElementById("musicPlayerContainer");
const feedNavBtn = document.getElementById("feedNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

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

// NAVIGATION
feedNavBtn?.addEventListener("click", () => window.location.href = "feed.html");
logoutBtn?.addEventListener("click", () => auth.signOut().then(() => window.location.href = "login.html"));

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
      friends: [],
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
  alert("Profile picture saved");
};

// FRIEND REQUEST SEARCH
searchUserBtn.onclick = async () => {
  const searchTerm = searchUserInput.value.trim();
  searchResultsContainer.innerHTML = "";
  if (!searchTerm) return;

  const q = query(collection(db, "users"), where("username", "==", searchTerm));
  const results = await getDocs(q);

  results.forEach(docSnap => {
    const user = docSnap.data();
    if (docSnap.id === currentUser.uid) return; // skip self
    const div = document.createElement("div");
    div.className = "search-result";
    div.innerHTML = `
      <img src="${user.pfpURL || 'default-avatar.png'}" alt="PFP" class="small-pfp">
      <span class="username">${user.username}</span>
      <button>Add Friend</button>
    `;
    div.querySelector(".username").onclick = () => window.location.href = `/profile.html?user=${user.username}`;
    div.querySelector("button").onclick = async () => {
      await updateDoc(doc(db, "users", docSnap.id), { friendRequests: arrayUnion(currentUser.uid) });
      div.querySelector("button").textContent = "Pending";
      div.querySelector("button").disabled = true;
    };
    searchResultsContainer.appendChild(div);
  });
};

// LOAD FRIEND REQUESTS
async function loadFriendRequests() {
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const requests = snap.data().friendRequests || [];
  incomingRequestsContainer.innerHTML = "";

  for (const requesterUid of requests) {
    const userSnap = await getDoc(doc(db, "users", requesterUid));
    if (!userSnap.exists()) continue;
    const user = userSnap.data();

    const div = document.createElement("div");
    div.className = "friend-request";
    div.innerHTML = `
      <img src="${user.pfpURL || 'default-avatar.png'}" alt="PFP" class="small-pfp">
      <span>${user.username}</span>
      <button class="accept">Accept</button>
      <button class="deny">Deny</button>
    `;

    div.querySelector(".accept").onclick = async () => {
      await updateDoc(doc(db, "users", currentUser.uid), {
        friends: arrayUnion(requesterUid),
        friendRequests: requests.filter(id => id !== requesterUid)
      });
      await updateDoc(doc(db, "users", requesterUid), { friends: arrayUnion(currentUser.uid) });
      div.remove();
      loadProfile();
    };

    div.querySelector(".deny").onclick = async () => {
      await updateDoc(doc(db, "users", currentUser.uid), {
        friendRequests: requests.filter(id => id !== requesterUid)
      });
      div.remove();
    };

    incomingRequestsContainer.appendChild(div);
  }
}

// TOP FRIENDS
function renderTopFriends(friends) {
  topFriendsContainer.innerHTML = "";
  friends.forEach((f, index) => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `
      <span>${index + 1}. </span>
      <img src="${f.pfpURL || 'default-avatar.png'}" class="small-pfp">
      <strong class="friend-name">${f.username}</strong>
      <button>Remove</button>
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

  comments.push({ uid: currentUser.uid, user: usernameInput.value, text });
  await updateDoc(ref, { wallComments: comments });
  renderWallComments(comments);
  wallCommentInput.value = "";
};

function renderWallComments(comments) {
  commentContainer.innerHTML = "";
  comments.forEach((c, i) => {
    const div = document.createElement("div");
    div.innerHTML = `<strong>${c.user}:</strong> ${c.text} <button>Delete</button>`;
    div.querySelector("button").onclick = async () => {
      comments.splice(i, 1);
      await updateDoc(doc(db, "users", currentUser.uid), { wallComments: comments });
      renderWallComments(comments);
    };
    commentContainer.appendChild(div);
  });
}

// MUSIC
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
