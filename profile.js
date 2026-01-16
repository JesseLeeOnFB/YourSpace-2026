import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
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
const friendPreview = document.getElementById("friendPreview");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const commentContainer = document.getElementById("commentContainer");
const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicPlayerContainer = document.getElementById("musicPlayerContainer");

document.getElementById("feedBtn").onclick = () => location.href = "feed.html";
document.getElementById("logoutBtn").onclick = () => signOut(auth).then(() => location.href = "login.html");

let currentUser;

// AUTH
auth.onAuthStateChanged(async user => {
  if (!user) return location.href = "login.html";
  currentUser = user;
  loadProfile();
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
      musicURL: ""
    });
    return loadProfile();
  }

  const d = snap.data();
  usernameInput.value = d.username;
  bioInput.value = d.bio;
  locationInput.value = d.location;
  profilePfp.src = d.pfpURL ? `${d.pfpURL}?v=${Date.now()}` : "default-avatar.png";
  renderTopFriends(d.topFriends);
  renderWallComments(d.wallComments);
  if (d.musicURL) renderMusic(d.musicURL);
}

// SAVE PROFILE INFO
saveProfileBtn.onclick = async () => {
  await updateDoc(doc(db, "users", currentUser.uid), {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  alert("Profile saved");
};

// SAVE PROFILE PICTURE
savePfpBtn.onclick = async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert("Select an image");

  const storageRef = ref(storage, `pfp/${currentUser.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await updateDoc(doc(db, "users", currentUser.uid), { pfpURL: url });
  profilePfp.src = `${url}?v=${Date.now()}`;
};

// TOP FRIENDS PREVIEW
addTopFriendBtn.onclick = async () => {
  const username = topFriendInput.value.trim();
  if (!username) return;

  const userRef = doc(db, "users", username);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return alert("User not found");

  const d = snap.data();
  friendPreview.innerHTML = `
    <img src="${d.pfpURL || 'default-avatar.png'}">
    <strong>${d.username}</strong>
    <button id="confirmAdd">Add</button>
  `;
  friendPreview.style.display = "flex";

  document.getElementById("confirmAdd").onclick = async () => {
    const refDoc = doc(db, "users", currentUser.uid);
    const me = await getDoc(refDoc);
    const list = me.data().topFriends || [];
    if (list.length >= 10) return alert("Max 10");

    list.push({ username: d.username, uid: username });
    await updateDoc(refDoc, { topFriends: list });
    renderTopFriends(list);
    friendPreview.style.display = "none";
    topFriendInput.value = "";
  };
};

// RENDER TOP FRIENDS
function renderTopFriends(list = []) {
  topFriendsContainer.innerHTML = "";
  list.forEach((f, i) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <strong class="friend">${f.username}</strong>
      <button>Remove</button>
    `;
    div.querySelector(".friend").onclick = () => location.href = `profile.html?user=${f.uid}`;
    div.querySelector("button").onclick = async () => {
      list.splice(i, 1);
      await updateDoc(doc(db, "users", currentUser.uid), { topFriends: list });
      renderTopFriends(list);
    };
    topFriendsContainer.appendChild(div);
  });
}

// WALL
postWallCommentBtn.onclick = async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;

  const refDoc = doc(db, "users", currentUser.uid);
  const snap = await getDoc(refDoc);
  const comments = snap.data().wallComments || [];

  comments.push({ user: currentUser.email.split("@")[0], text });
  await updateDoc(refDoc, { wallComments: comments });
  renderWallComments(comments);
  wallCommentInput.value = "";
};

function renderWallComments(list = []) {
  commentContainer.innerHTML = "";
  list.forEach((c, i) => {
    const div = document.createElement("div");
    div.innerHTML = `<strong>${c.user}:</strong> ${c.text} <button>Delete</button>`;
    div.querySelector("button").onclick = async () => {
      list.splice(i, 1);
      await updateDoc(doc(db, "users", currentUser.uid), { wallComments: list });
      renderWallComments(list);
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
    musicPlayerContainer.innerHTML = `
      <iframe width="100%" height="200" src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
  }
}
