import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// --- Firebase config ---
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

// DOM Elements
const profilePhoto = document.getElementById("profilePhoto");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const savePhotoBtn = document.getElementById("savePhotoBtn");

const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const topFriendsList = document.getElementById("topFriendsList");
const friendSearchInput = document.getElementById("friendSearchInput");
const addFriendBtn = document.getElementById("addFriendBtn");
const musicPlayer = document.getElementById("musicPlayer");

// --- Auth check ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    loadProfile(user.uid);
  } else {
    window.location.href = "index.html";
  }
});

// --- Load profile ---
async function loadProfile(uid) {
  const userDocRef = doc(db, "users", uid);
  const docSnap = await getDoc(userDocRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    usernameInput.value = data.username || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.music || "";
    profilePhoto.src = data.profilePhoto || "default-profile.png";

    // Top friends
    topFriendsList.innerHTML = "";
    if (data.topFriends) {
      data.topFriends.forEach(friend => {
        const li = document.createElement("li");
        li.textContent = friend;
        topFriendsList.appendChild(li);
      });
    }

    // Music
    if (data.music) musicPlayer.src = data.music;
  }
}

// --- Save profile info ---
saveProfileBtn.addEventListener("click", async () => {
  const uid = auth.currentUser.uid;
  const userDocRef = doc(db, "users", uid);

  await setDoc(userDocRef, {
    username: usernameInput.value,
    location: locationInput.value,
    bio: bioInput.value,
    music: musicInput.value
  }, { merge: true });

  alert("Profile info saved!");
});

// --- Upload profile photo ---
savePhotoBtn.addEventListener("click", async () => {
  const file = profilePhotoInput.files[0];
  if (!file) return alert("Please select a photo first.");

  const uid = auth.currentUser.uid;
  const storageRef = ref(storage, `profileImages/${uid}/${Date.now()}_${file.name}`);
  
  try {
    await uploadBytes(storageRef, file, { contentType: file.type });
    const downloadURL = await getDownloadURL(storageRef);

    // Save URL to Firestore
    const userDocRef = doc(db, "users", uid);
    await updateDoc(userDocRef, { profilePhoto: downloadURL });

    profilePhoto.src = downloadURL;
    alert("Profile photo updated!");
  } catch (err) {
    console.error(err);
    alert("Failed to upload photo.");
  }
});

// --- Add friend ---
addFriendBtn.addEventListener("click", async () => {
  const friendName = friendSearchInput.value.trim();
  if (!friendName) return;

  const uid = auth.currentUser.uid;
  const userDocRef = doc(db, "users", uid);

  const docSnap = await getDoc(userDocRef);
  let topFriends = docSnap.data().topFriends || [];

  if (topFriends.length >= 10) {
    alert("Top 10 friends full!");
    return;
  }

  topFriends.push(friendName);
  await updateDoc(userDocRef, { topFriends });
  const li = document.createElement("li");
  li.textContent = friendName;
  topFriendsList.appendChild(li);
  friendSearchInput.value = "";
});

// --- Navigation ---
document.getElementById("homeBtn").addEventListener("click", () => window.location.href = "feed.html");
document.getElementById("profileBtn").addEventListener("click", () => window.location.href = "profile.html");
document.getElementById("logoutBtn").addEventListener("click", () => auth.signOut().then(() => window.location.href = "index.html"));
