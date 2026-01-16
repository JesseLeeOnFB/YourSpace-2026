import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

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
});

// NAV BUTTONS
feedNavBtn.onclick = () => { window.location.href = "feed.html"; };
logoutBtn.onclick = () => { auth.signOut().then(() => window.location.href="login.html"); };

// LOAD PROFILE
async function loadProfile() {
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
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

  const storageRef = ref(storage, `pfp/${currentUser.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await updateDoc(doc(db, "users", currentUser.uid), { pfpURL: url });
  profilePfp.src = url;
};

// TOP FRIENDS
addTopFriendBtn.onclick = async () => {
  const usernameToAdd = topFriendInput.value.trim();
  if (!usernameToAdd) return;

  // Search for user by username
  const q = query(collection(db, "users"), where("username", "==", usernameToAdd));
  const querySnap = await getDocs(q);
  if (querySnap.empty) return alert("User not found");

  const userData = querySnap.docs[0].data();
  const uidToAdd = querySnap.docs[0].id;

  // Load current top friends
  const userRef = doc(db, "users", currentUser.uid);
  const userSnap = await getDoc(userRef);
  const currentFriends = userSnap.data().topFriends || [];

  if (currentFriends.length >= 10) return alert("Max 10 friends reached");
  currentFriends.push({ username: usernameToAdd, uid: uidToAdd });
  await updateDoc(userRef, { topFriends: currentFriends });
  renderTopFriends(currentFriends);
  topFriendInput.value = "";
};

function renderTopFriends(friends) {
  topFriendsContainer.innerHTML = "";
  friends.forEach((f, i) => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `
      <span class="friend-rank">${i + 1}.</span>
      <strong class="friend-name">${f.username}</strong>
      <button data-index="${i}">Remove</button>
    `;

    div.querySelector(".friend-name").onclick = () => {
      if (f.uid) window.location.href = `/profile.html?user=${f.uid}`;
    };
    div.querySelector("button").onclick = async () => {
      friends.splice(i, 1);
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

  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);
  const comments = snap.data().wallComments || [];
  comments.push({ uid: currentUser.uid, user: usernameInput.value || "Anonymous", text });

  await updateDoc(userRef, { wallComments: comments });
  renderWallComments(comments);
  wallCommentInput.value = "";
};

function renderWallComments(comments) {
  commentContainer.innerHTML = "";
  comments.forEach((c, i) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <strong>${c.user}:</strong> ${c.text} <button>Delete</button>
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
  if (!url) return alert("Enter a valid URL");

  await updateDoc(doc(db, "users", currentUser.uid), { musicURL: url });
  renderMusic(url);
};

function renderMusic(url) {
  if (url.includes("youtube")) {
    const id = url.split("v=")[1]?.split("&")[0];
    musicPlayerContainer.innerHTML = `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
  } else if (url.includes("soundcloud.com")) {
    musicPlayerContainer.innerHTML = `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}"></iframe>`;
  } else {
    musicPlayerContainer.innerHTML = `<audio controls src="${url}"></audio>`;
  }
}
