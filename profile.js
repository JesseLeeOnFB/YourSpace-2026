// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// Elements
const profilePhotoInput = document.getElementById("profilePhotoInput");
const savePhotoBtn = document.getElementById("savePhotoBtn");
const profilePhotoPreview = document.getElementById("profilePhotoPreview");

const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const musicInput = document.getElementById("musicInput");
const saveInfoBtn = document.getElementById("saveInfoBtn");

const themeSelect = document.getElementById("themeSelect");
const topFriendsList = document.getElementById("topFriendsList");
const addFriendInput = document.getElementById("addFriendInput");
const addFriendBtn = document.getElementById("addFriendBtn");
const musicPlayer = document.getElementById("musicPlayer");

const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

// Helper to load user profile
async function loadProfile() {
  if (!auth.currentUser) return;

  const userDocRef = doc(db, "users", auth.currentUser.uid);
  const userSnap = await getDoc(userDocRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    musicInput.value = data.music || "";
    themeSelect.value = data.theme || "default";
    if (data.profilePhotoURL) profilePhotoPreview.src = data.profilePhotoURL;

    // Load Top 10 friends
    topFriendsList.innerHTML = "";
    if (data.topFriends) {
      data.topFriends.forEach(friend => {
        const li = document.createElement("li");
        li.textContent = friend;
        topFriendsList.appendChild(li);
      });
    }

    // Load music player
    if (data.music) {
      musicPlayer.src = data.music;
    }

    // Apply theme
    document.body.className = data.theme || "default";
  }
}

// Save profile photo
savePhotoBtn.addEventListener("click", async () => {
  if (!profilePhotoInput.files[0]) return alert("Select a photo first.");
  const file = profilePhotoInput.files[0];
  const ext = file.name.split(".").pop().toLowerCase();
  let contentType = file.type;
  if (!contentType) contentType = ["jpg","jpeg","png","gif"].includes(ext) ? "image/jpeg" : "";

  if (!contentType.startsWith("image")) return alert("Invalid image file.");

  const storageRef = ref(storage, `profileImages/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
  try {
    const snapshot = await uploadBytes(storageRef, file, { contentType });
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Update Firestore
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    await updateDoc(userDocRef, { profilePhotoURL: downloadURL });
    profilePhotoPreview.src = downloadURL;
    alert("Profile photo updated!");
  } catch (err) {
    console.error(err);
    alert("Failed to upload profile photo. Check console.");
  }
});

// Save profile info (username, bio, location, music, theme)
saveInfoBtn.addEventListener("click", async () => {
  const userDocRef = doc(db, "users", auth.currentUser.uid);
  try {
    await setDoc(userDocRef, {
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value,
      music: musicInput.value,
      theme: themeSelect.value
    }, { merge: true });

    // Update music player and theme live
    musicPlayer.src = musicInput.value;
    document.body.className = themeSelect.value;

    alert("Profile info saved!");
  } catch (err) {
    console.error(err);
    alert("Failed to save profile info.");
  }
});

// Add friend to Top 10
addFriendBtn.addEventListener("click", async () => {
  const friendName = addFriendInput.value.trim();
  if (!friendName) return alert("Enter a username.");
  const userDocRef = doc(db, "users", auth.currentUser.uid);
  try {
    await updateDoc(userDocRef, { topFriends: arrayUnion(friendName) });
    const li = document.createElement("li");
    li.textContent = friendName;
    topFriendsList.appendChild(li);
    addFriendInput.value = "";
  } catch (err) {
    console.error(err);
    alert("Failed to add friend.");
  }
});

// Navigation
homeBtn.addEventListener("click", () => { window.location.href = "feed.html"; });
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// Load profile on page load
auth.onAuthStateChanged(user => {
  if (user) loadProfile();
  else window.location.href = "index.html";
});
