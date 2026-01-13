console.log("🔥 profile.js loaded");

import { getAuth, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// DOM Elements
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const musicInput = document.getElementById("musicInput");
const themeInput = document.getElementById("themeInput");
const profilePicInput = document.getElementById("profilePicInput");
const profilePicPreview = document.getElementById("profilePicPreview");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const profilePostsContainer = document.getElementById("profilePostsContainer");
const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

// Navigate
homeBtn.addEventListener("click", () => window.location.href = "feed.html");
logoutBtn.addEventListener("click", async () => await auth.signOut());

// Current user
let currentUser;
onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = "index.html";
  currentUser = user;
  loadProfile();
});

// Load profile
async function loadProfile() {
  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  if (!userDoc.exists()) return console.error("User doc not found!");
  const data = userDoc.data();

  usernameInput.value = data.username || "";
  bioInput.value = data.bio || "";
  locationInput.value = data.location || "";
  musicInput.value = data.music || "";
  themeInput.value = data.theme || "";
  profilePicPreview.src = data.photoUrl || "https://via.placeholder.com/150";

  // Load user's posts
  loadUserPosts();
}

// Save profile
saveProfileBtn.addEventListener("click", async () => {
  let photoUrl = profilePicPreview.src;

  // Upload new photo if selected
  if (profilePicInput.files[0]) {
    const file = profilePicInput.files[0];
    const storageRef = ref(storage, `profilePics/${currentUser.uid}`);
    await uploadBytes(storageRef, file);
    photoUrl = await getDownloadURL(storageRef);
  }

  const updatedData = {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value,
    music: musicInput.value,
    theme: themeInput.value,
    photoUrl
  };

  // Update Firestore
  await setDoc(doc(db, "users", currentUser.uid), updatedData, { merge: true });

  // Update auth displayName
  await updateProfile(currentUser, { displayName: usernameInput.value });

  alert("Profile updated!");
});

// Load user's posts
async function loadUserPosts() {
  profilePostsContainer.innerHTML = "";

  const querySnapshot = await getDoc(doc(db, "users", currentUser.uid));
  // Optional: Add a proper query for posts by user if using separate "posts" collection
  // We'll assume posts are in global "posts" collection with userId field
  const postsRef = doc(db, "posts");
  // We'll implement feed.js to properly fetch user posts too
}
