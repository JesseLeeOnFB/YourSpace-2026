import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

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
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// HTML elements
const profilePhotoDisplay = document.getElementById("profilePhotoDisplay");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");
const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");
const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");
const topFriendsList = document.getElementById("topFriendsList");
const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

let currentUserId;

// Redirect if not logged in
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    currentUserId = user.uid;
    await loadProfile();
  }
});

// Load user profile
async function loadProfile() {
  const userDoc = doc(db, "users", currentUserId);
  const userSnap = await getDoc(userDoc);
  if (userSnap.exists()) {
    const data = userSnap.data();
    usernameInput.value = data.username || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.music || "";
    profilePhotoDisplay.src = data.profilePhoto || "default.jpg";
    themeSelect.value = data.theme || "default";
    document.body.className = data.theme || "default";

    // Load top 10 friends
    if (data.topFriends) {
      topFriendsList.innerHTML = "";
      data.topFriends.forEach(friend => {
        const li = document.createElement("li");
        li.textContent = friend;
        topFriendsList.appendChild(li);
      });
    }
  } else {
    console.log("User document not found. Creating new doc.");
    await setDoc(userDoc, { username: "", location: "", bio: "", music: "", theme: "default", topFriends: [] });
  }
}

// Save profile info
saveProfileInfoBtn.addEventListener("click", async () => {
  const userDoc = doc(db, "users", currentUserId);
  await updateDoc(userDoc, {
    username: usernameInput.value,
    location: locationInput.value,
    bio: bioInput.value,
    music: musicInput.value
  });
  alert("Profile info saved!");
});

// Save profile photo
saveProfilePhotoBtn.addEventListener("click", async () => {
  const file = profilePhotoInput.files[0];
  if (!file) {
    alert("Select a photo first!");
    return;
  }
  let contentType = file.type || "image/jpeg";
  const storageRef = ref(storage, `profileImages/${currentUserId}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file, { contentType });
  const downloadURL = await getDownloadURL(snapshot.ref);
  await updateDoc(doc(db, "users", currentUserId), { profilePhoto: downloadURL });
  profilePhotoDisplay.src = downloadURL;
  alert("Profile photo saved!");
});

// Save theme
saveThemeBtn.addEventListener("click", async () => {
  const selectedTheme = themeSelect.value;
  document.body.className = selectedTheme;
  await updateDoc(doc(db, "users", currentUserId), { theme: selectedTheme });
  alert("Theme saved!");
});

// Navigation buttons
homeBtn.addEventListener("click", () => {
  window.location.href = "feed.html";
});
logoutBtn.addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "index.html";
});
