import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// -----------------------------
// Firebase Config
// -----------------------------
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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// -----------------------------
// DOM Elements
// -----------------------------
const profilePhotoInput = document.getElementById("profilePhotoInput");
const profilePhotoDisplay = document.getElementById("profilePhotoDisplay");
const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");

const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");

const musicPlayerSection = document.querySelector(".musicPlayerSection");

const topFriendsList = document.getElementById("topFriendsList");
const addFriendInput = document.getElementById("addFriendInput");
const addFriendBtn = document.getElementById("addFriendBtn");

const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");

// -----------------------------
// Helpers
// -----------------------------
let currentUserUid = null;
let userDocRef = null;

// Render YouTube Player
function renderMusic(url) {
  if (!url) {
    musicPlayerSection.innerHTML = "";
    return;
  }

  // extract video id
  let videoId = url.split("v=")[1] || url.split("/").pop();
  if (!videoId) return;

  musicPlayerSection.innerHTML = `<iframe width="300" height="80" src="https://www.youtube.com/embed/${videoId}?autoplay=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
}

// Render Top Friends
function renderTopFriends(friends) {
  topFriendsList.innerHTML = "";
  if (!friends) return;
  friends.slice(0, 10).forEach(friend => {
    const li = document.createElement("li");
    li.textContent = friend;
    topFriendsList.appendChild(li);
  });
}

// -----------------------------
// Auth check & load profile
// -----------------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUserUid = user.uid;
  userDocRef = doc(db, "users", currentUserUid);

  const docSnap = await getDoc(userDocRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    usernameInput.value = data.username || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.music || "";
    profilePhotoDisplay.src = data.profilePhotoURL || "";

    if (data.theme) document.body.className = data.theme;
    renderMusic(data.music);
    renderTopFriends(data.topFriends);
  } else {
    // create doc if missing
    await setDoc(userDocRef, { username:"", location:"", bio:"", music:"", topFriends:[], theme:"default", profilePhotoURL:"" });
  }
});

// -----------------------------
// Save Profile Info
// -----------------------------
saveProfileInfoBtn.addEventListener("click", async () => {
  if (!userDocRef) return;
  await updateDoc(userDocRef, {
    username: usernameInput.value,
    location: locationInput.value,
    bio: bioInput.value,
    music: musicInput.value
  });
  renderMusic(musicInput.value);
  alert("Profile info saved!");
});

// -----------------------------
// Save Profile Photo
// -----------------------------
saveProfilePhotoBtn.addEventListener("click", async () => {
  if (!profilePhotoInput.files[0] || !currentUserUid) return;

  const file = profilePhotoInput.files[0];
  let contentType = file.type || "image/jpeg";

  const storageRef = ref(storage, `profileImages/${currentUserUid}/${Date.now()}_${file.name}`);
  try {
    const snapshot = await uploadBytes(storageRef, file, { contentType });
    const downloadURL = await getDownloadURL(snapshot.ref);

    await updateDoc(userDocRef, { profilePhotoURL: downloadURL });
    profilePhotoDisplay.src = downloadURL;
    alert("Profile photo updated!");
  } catch (err) {
    console.error("Profile photo upload failed:", err);
    alert("Upload failed. Check console.");
  }
});

// -----------------------------
// Add Friend
// -----------------------------
addFriendBtn.addEventListener("click", async () => {
  const friendName = addFriendInput.value.trim();
  if (!friendName) return;

  await updateDoc(userDocRef, {
    topFriends: arrayUnion(friendName)
  });

  renderTopFriends([...topFriendsList.children].map(li => li.textContent).concat(friendName));
  addFriendInput.value = "";
});

// -----------------------------
// Theme Selection
// -----------------------------
saveThemeBtn.addEventListener("click", async () => {
  const selectedTheme = themeSelect.value;
  document.body.className = selectedTheme;
  await updateDoc(userDocRef, { theme: selectedTheme });
});
