import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// DOM elements
const profilePhoto = document.getElementById("profilePhoto");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const musicInput = document.getElementById("musicInput");
const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");
const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");

const friendRequestsContainer = document.getElementById("friendRequestsContainer");
const friendsContainer = document.getElementById("friendsContainer");
const topFriendsContainer = document.getElementById("topFriendsContainer");
const addTopFriendInput = document.getElementById("addTopFriendInput");
const addTopFriendBtn = document.getElementById("addTopFriendBtn");

// Load profile
let currentUserUID = null;

onAuthStateChanged(auth, async user => {
  if (!user) return;
  currentUserUID = user.uid;
  await loadProfile(currentUserUID);
});

// Load user profile function
async function loadProfile(uid) {
  const userDoc = doc(db, "users", uid);
  const docSnap = await getDoc(userDoc);
  if (!docSnap.exists()) return;

  const data = docSnap.data();

  profilePhoto.src = data.profilePic || "";
  usernameInput.value = data.username || "";
  bioInput.value = data.bio || "";
  locationInput.value = data.location || "";
  musicInput.value = data.music || "";
  document.body.className = data.theme || "default";

  renderFriendRequests(data.friendRequests || "");
  renderFriends(data.friends || "");
  renderTopFriends(data.topFriends || "");
}

// Save profile info
saveProfileInfoBtn.addEventListener("click", async () => {
  await updateDoc(doc(db, "users", currentUserUID), {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value,
    music: musicInput.value
  });
  alert("Profile info saved!");
});

// Save theme
saveThemeBtn.addEventListener("click", async () => {
  const theme = themeSelect.value;
  await updateDoc(doc(db, "users", currentUserUID), { theme });
  document.body.className = theme;
  alert("Theme saved!");
});

// Save profile photo
saveProfilePhotoBtn.addEventListener("click", async () => {
  const file = profilePhotoInput.files[0];
  if (!file) return alert("Select a photo first");
  const storageRef = ref(storage, `profileImages/${currentUserUID}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  await updateDoc(doc(db, "users", currentUserUID), { profilePic: downloadURL });
  profilePhoto.src = downloadURL;
  alert("Profile photo saved!");
});

// Top friends
addTopFriendBtn.addEventListener("click", async () => {
  const topFriend = addTopFriendInput.value.trim();
  if (!topFriend) return;

  const userDoc = doc(db, "users", currentUserUID);
  const docSnap = await getDoc(userDoc);
  const topFriends = (docSnap.data().topFriends || "").split(",").filter(f => f);
  if (!topFriends.includes(topFriend)) {
    topFriends.push(topFriend);
    await updateDoc(userDoc, { topFriends: topFriends.join(",") });
    renderTopFriends(topFriends.join(","));
    addTopFriendInput.value = "";
  }
});

function renderTopFriends(data) {
  const topFriends = data.split(",").filter(f => f);
  topFriendsContainer.innerHTML = "";
  topFriends.forEach(f => {
    const div = document.createElement("div");
    div.textContent = f;
    topFriendsContainer.appendChild(div);
  });
}

function renderFriendRequests(data) {
  const requests = data.split(",").filter(f => f);
  friendRequestsContainer.innerHTML = "";
  requests.forEach(f => {
    const div = document.createElement("div");
    div.textContent = f;
    friendRequestsContainer.appendChild(div);
  });
}

function renderFriends(data) {
  const friends = data.split(",").filter(f => f);
  friendsContainer.innerHTML = "";
  friends.forEach(f => {
    const div = document.createElement("div");
    div.textContent = f;
    friendsContainer.appendChild(div);
  });
}
