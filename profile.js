import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

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

// Elements
const profilePhotoInput = document.getElementById("profilePhotoInput");
const profilePhoto = document.getElementById("profilePhoto");
const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");
const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const musicPlayer = document.getElementById("musicPlayer");
const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");
const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");
const customHTMLInput = document.getElementById("customHTMLInput");
const saveCustomHTMLBtn = document.getElementById("saveCustomHTMLBtn");
const friendsList = document.getElementById("friendsList");

// Load profile
async function loadProfile() {
  const userDoc = doc(db, "users", auth.currentUser.uid);
  const snap = await getDoc(userDoc);
  if (snap.exists()) {
    const data = snap.data();
    usernameInput.value = data.username || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.musicURL || "";
    if (data.profilePhotoURL) profilePhoto.src = data.profilePhotoURL;
    if (data.theme) document.body.className = data.theme;
    if (data.customHTML) document.body.style = data.customHTML;
    // Load friends
    if (data.topFriends) {
      friendsList.innerHTML = "";
      data.topFriends.forEach(f => {
        const li = document.createElement("li");
        li.textContent = f;
        friendsList.appendChild(li);
      });
    }
    // Update music player
    musicPlayer.src = data.musicURL || "";
  }
}

// Save profile info
saveProfileInfoBtn.addEventListener("click", async () => {
  try {
    await setDoc(doc(db, "users", auth.currentUser.uid), {
      username: usernameInput.value,
      location: locationInput.value,
      bio: bioInput.value,
      musicURL: musicInput.value
    }, { merge: true });
    alert("Profile info saved!");
    musicPlayer.src = musicInput.value || "";
  } catch (err) {
    console.error(err);
    alert("Error saving profile info.");
  }
});

// Save profile photo
saveProfilePhotoBtn.addEventListener("click", async () => {
  const file = profilePhotoInput.files[0];
  if (!file) return alert("Select a file first.");
  const storageRef = ref(storage, `profileImages/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
  try {
    await uploadBytes(storageRef, file, { contentType: file.type });
    const url = await getDownloadURL(storageRef);
    profilePhoto.src = url;
    await setDoc(doc(db, "users", auth.currentUser.uid), { profilePhotoURL: url }, { merge: true });
    alert("Profile photo updated!");
  } catch (err) {
    console.error(err);
    alert("Upload failed.");
  }
});

// Save theme
saveThemeBtn.addEventListener("click", async () => {
  const theme = themeSelect.value;
  document.body.className = theme;
  try {
    await setDoc(doc(db, "users", auth.currentUser.uid), { theme }, { merge: true });
    alert("Theme saved!");
  } catch(err) { console.error(err); alert("Error saving theme."); }
});

// Save custom HTML / background
saveCustomHTMLBtn.addEventListener("click", async () => {
  const customHTML = customHTMLInput.value;
  document.body.style = customHTML;
  try {
    await setDoc(doc(db, "users", auth.currentUser.uid), { customHTML }, { merge: true });
    alert("Custom background saved!");
  } catch(err) { console.error(err); alert("Error saving custom background."); }
});

// Initial load
auth.onAuthStateChanged(user => {
  if (user) loadProfile();
});
