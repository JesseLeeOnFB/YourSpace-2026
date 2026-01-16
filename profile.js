import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, arrayUnion
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

const friendSearchInput = document.getElementById("friendSearchInput");
const friendSearchResults = document.getElementById("friendSearchResults");
const topFriendsContainer = document.getElementById("topFriendsContainer");

const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const commentContainer = document.getElementById("commentContainer");

const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicPlayerContainer = document.getElementById("musicPlayerContainer");

let currentUser;

// Auth state
auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  await loadProfile();
});

// Load profile
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
}

// Save profile info
saveProfileBtn.onclick = async () => {
  await updateDoc(doc(db, "users", currentUser.uid), {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  alert("Profile info saved");
};

// Save profile picture
savePfpBtn.onclick = async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert("Select an image");

  const storageRef = ref(storage, `profileImages/${currentUser.uid}/${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await updateDoc(doc(db, "users", currentUser.uid), { pfpURL: url });
  profilePfp.src = url;
};

// Friend search
friendSearchInput.addEventListener("input", async () => {
  const queryText = friendSearchInput.value.trim();
  friendSearchResults.innerHTML = "";
  if (!queryText) return;

  const q = query(collection(db, "users"), where("username", "==", queryText));
  const snap = await getDocs(q);
  snap.forEach(docSnap => {
    const u = docSnap.data();
    const div = document.createElement("div");
    div.className = "friend-result";
    div.innerHTML = `
      <img src="${u.pfpURL || 'default-avatar.png'}" alt="pfp">
      <span>${u.username}</span>
      <button>Add Friend</button>
    `;
    const btn = div.querySelector("button");
    btn.onclick = async () => {
      const otherRef = doc(db, "users", docSnap.id);
      await updateDoc(otherRef, { friendRequests: arrayUnion({uid: currentUser.uid, username: usernameInput.value, status: 'pending'}) });
      btn.textContent = "Pending";
      btn.disabled = true;
    };
    friendSearchResults.appendChild(div);
  });
});

// Top friends
function renderTopFriends(friends) {
  topFriendsContainer.innerHTML = "";
  friends.forEach((f, i) => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `<span class="friend-name">${i + 1}. ${f.username}</span>`;
    div.querySelector(".friend-name").onclick = () => {
      if (f.uid) window.location.href = `/profile.html?user=${f.username}`;
    };
    topFriendsContainer.appendChild(div);
  });
}

// Wall comments
postWallCommentBtn.onclick = async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;
  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);
  const comments = snap.data().wallComments || [];
  comments.push({uid: currentUser.uid, user: usernameInput.value, text});
  await updateDoc(ref, { wallComments: comments });
  renderWallComments(comments);
  wallCommentInput.value = "";
};

function renderWallComments(comments) {
  commentContainer.innerHTML = "";
  comments.forEach((c, i) => {
    const div = document.createElement("div");
    div.innerHTML = `<strong>${c.user}:</strong> ${c.text}`;
    commentContainer.appendChild(div);
  });
}

// Music
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
