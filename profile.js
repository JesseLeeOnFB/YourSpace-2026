import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, query
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
const searchPreviewContainer = document.getElementById("searchPreviewContainer");
const topFriendsContainer = document.getElementById("topFriendsContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const commentContainer = document.getElementById("commentContainer");
const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicPlayerContainer = document.getElementById("musicPlayerContainer");
const pendingRequestsContainer = document.getElementById("pendingRequestsContainer");

let currentUser;

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

// ---------------------- LOAD PROFILE ----------------------
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
      musicURL: "",
      pendingRequests: []
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

// ---------------------- SAVE PROFILE INFO ----------------------
saveProfileBtn.onclick = async () => {
  await updateDoc(doc(db, "users", currentUser.uid), {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  alert("Profile info saved");
};

// ---------------------- SAVE PROFILE PICTURE ----------------------
savePfpBtn.onclick = async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert("Select an image");

  const storageRef = ref(storage, `profileImages/${currentUser.uid}/${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await updateDoc(doc(db, "users", currentUser.uid), { pfpURL: url });
  profilePfp.src = url;
};

// ---------------------- TOP 10 FRIENDS ----------------------
function renderTopFriends(friends) {
  topFriendsContainer.innerHTML = "";
  friends.forEach((f, index) => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `
      <strong class="friend-name">${f.username}</strong>
      <span>Rank: ${index + 1}</span>
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

// ---------------------- WALL COMMENTS ----------------------
postWallCommentBtn.onclick = async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;
  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);
  const comments = snap.data().wallComments || [];
  comments.push({ uid: currentUser.uid, user: usernameInput.value || currentUser.email.split("@")[0], text });
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

// ---------------------- MUSIC ----------------------
saveMusicBtn.onclick = async () => {
  const url = musicInput.value.trim();
  if (!url) return alert("Enter a URL first");
  await updateDoc(doc(db, "users", currentUser.uid), { musicURL: url });
  renderMusic(url);
};

function renderMusic(url) {
  if (!url) return;
  let embedURL = "";
  if (url.includes("youtube")) {
    let id;
    if (url.includes("youtu.be/")) id = url.split("youtu.be/")[1].split("?")[0];
    else id = url.split("v=")[1]?.split("&")[0];
    embedURL = `https://www.youtube.com/embed/${id}`;
    musicPlayerContainer.innerHTML = `<iframe width="100%" height="200" src="${embedURL}" allowfullscreen></iframe>`;
  } else {
    musicPlayerContainer.innerHTML = `<audio controls src="${url}"></audio>`;
  }
}

// ---------------------- FRIEND REQUESTS ----------------------
addTopFriendBtn.onclick = async () => {
  const searchName = topFriendInput.value.trim();
  if (!searchName) return;

  // Search users
  const usersRef = collection(db, "users");
  const snap = await getDocs(usersRef);
  let foundUser = null;
  snap.forEach(docSnap => {
    if (docSnap.data().username === searchName) {
      foundUser = { uid: docSnap.id, username: docSnap.data().username };
    }
  });

  if (!foundUser) return alert("User not found");

  // Add to recipient pending requests
  const recipientRef = doc(db, "users", foundUser.uid);
  const recipientSnap = await getDoc(recipientRef);
  const pending = recipientSnap.data().pendingRequests || [];
  pending.push({
    fromUID: currentUser.uid,
    username: usernameInput.value || currentUser.email.split("@")[0],
    status: "pending"
  });
  await updateDoc(recipientRef, { pendingRequests: pending });

  alert("Friend request sent!");
  topFriendInput.value = "";
  searchPreviewContainer.innerHTML = `Pending request sent to ${foundUser.username}`;
};

// Load received pending requests
async function loadPendingRequests() {
  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);
  const pending = snap.data().pendingRequests || [];
  pendingRequestsContainer.innerHTML = "";

  pending.forEach((req, i) => {
    if (req.status !== "pending") return;
    const div = document.createElement("div");
    div.innerHTML = `
      <span>${req.username}</span>
      <button class="accept-btn">Accept</button>
      <button class="deny-btn">Deny</button>
    `;

    div.querySelector(".accept-btn").onclick = async () => {
      // Add to top 10 friends (or all friends collection)
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      const topFriends = userSnap.data().topFriends || [];
      if (topFriends.length < 10) topFriends.push({ username: req.username, uid: req.fromUID });
      // Remove request
      pending.splice(i, 1);
      await updateDoc(userRef, { topFriends, pendingRequests: pending });
      loadPendingRequests();
      renderTopFriends(topFriends);
    };

    div.querySelector(".deny-btn").onclick = async () => {
      pending.splice(i, 1);
      await updateDoc(doc(db, "users", currentUser.uid), { pendingRequests: pending });
      loadPendingRequests();
    };

    pendingRequestsContainer.appendChild(div);
  });
}
