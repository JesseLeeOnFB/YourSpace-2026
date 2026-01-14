import { initializeApp } from "https://www.gstatic.com/firebasejs/9.29.0/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/9.29.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.29.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.29.0/firebase-storage.js";

// Firebase Config (same as before)
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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Elements
const profilePhotoInput = document.getElementById("profilePhotoInput");
const profilePhotoPreview = document.getElementById("profilePhotoPreview");
const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");

const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");

const themeSelect = document.getElementById("themeSelect");

const top10FriendsList = document.getElementById("top10FriendsList");
const addFriendInput = document.getElementById("addFriendInput");
const addFriendBtn = document.getElementById("addFriendBtn");

// NAVIGATION
document.getElementById("homeBtn").addEventListener("click", () => window.location.href = "feed.html");
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "index.html";
});

// Load user data
onAuthStateChanged(auth, async user => {
  if (!user) return window.location.href = "index.html";

  const userDoc = doc(db, "users", user.uid);
  const docSnap = await getDoc(userDoc);
  if (docSnap.exists()) {
    const data = docSnap.data();
    usernameInput.value = data.username || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.music || "";
    profilePhotoPreview.src = data.profilePhotoURL || "";

    // Apply saved theme
    if(data.theme) document.body.className = data.theme;

    // Load top 10 friends
    top10FriendsList.innerHTML = "";
    (data.top10Friends || []).forEach(friend => {
      const li = document.createElement("li");
      li.textContent = friend;
      top10FriendsList.appendChild(li);
    });
  }
});

// Save profile photo
saveProfilePhotoBtn.addEventListener("click", async () => {
  const file = profilePhotoInput.files[0];
  if (!file) return alert("Select a photo first.");

  let contentType = file.type;
  if(!contentType) contentType = "image/jpeg";

  const storageRef = ref(storage, `profileImages/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file, { contentType });
  const downloadURL = await getDownloadURL(snapshot.ref);

  // Update Firestore and auth profile
  const userDoc = doc(db, "users", auth.currentUser.uid);
  await updateDoc(userDoc, { profilePhotoURL: downloadURL });
  await updateProfile(auth.currentUser, { photoURL: downloadURL });

  profilePhotoPreview.src = downloadURL;
  alert("Profile photo updated!");
});

// Save profile info (username, bio, location, music)
saveProfileInfoBtn.addEventListener("click", async () => {
  const userDoc = doc(db, "users", auth.currentUser.uid);
  await updateDoc(userDoc, {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value,
    music: musicInput.value,
    theme: themeSelect.value
  });

  // Update auth displayName
  await updateProfile(auth.currentUser, { displayName: usernameInput.value });
  alert("Profile info updated!");
});

// Add friend
addFriendBtn.addEventListener("click", async () => {
  const friendName = addFriendInput.value.trim();
  if (!friendName) return;

  const userDoc = doc(db, "users", auth.currentUser.uid);
  const docSnap = await getDoc(userDoc);
  const topFriends = docSnap.data().top10Friends || [];

  if(topFriends.includes(friendName)) {
    alert("Friend already added.");
    return;
  }
  topFriends.push(friendName);
  if(topFriends.length > 10) topFriends.shift(); // keep max 10

  await updateDoc(userDoc, { top10Friends: topFriends });
  const li = document.createElement("li");
  li.textContent = friendName;
  top10FriendsList.appendChild(li);
  addFriendInput.value = "";
});
