import { auth, db, storage } from "./script.js"; // Assuming script.js exports these
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc, getDoc } from "firebase/firestore";

// Elements
const profilePhotoInput = document.getElementById("profilePhotoInput");
const profilePhotoImg = document.querySelector(".profilePhoto");

const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const musicInput = document.getElementById("musicInput");

const savePhotoBtn = document.getElementById("savePhotoBtn");
const saveInfoBtn = document.getElementById("saveInfoBtn");

const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");

// Load user data
async function loadProfile() {
  const docRef = doc(db, "users", auth.currentUser.uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    profilePhotoImg.src = data.profilePhoto || "";
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    musicInput.value = data.music || "";
    document.body.className = data.theme || "default";
    updateMusicPlayer();
  }
}

// Music Player
function updateMusicPlayer() {
  let url = musicInput.value.trim();
  if (!url) {
    document.querySelector(".musicPlayer").src = "";
    return;
  }

  if (url.includes("youtu.be")) {
    const videoId = url.split("/").pop().split("?")[0];
    url = `https://www.youtube.com/embed/${videoId}`;
  } else if (url.includes("youtube.com/watch")) {
    const params = new URLSearchParams(url.split("?")[1]);
    const videoId = params.get("v");
    url = `https://www.youtube.com/embed/${videoId}`;
  }
  document.querySelector(".musicPlayer").src = url;
}

// Save Profile Photo
async function saveProfilePhoto() {
  const file = profilePhotoInput.files[0];
  if (!file) return;

  let contentType = file.type;
  if (!contentType) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
  }

  const storageRef = ref(storage, `profileImages/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
  try {
    const snapshot = await uploadBytes(storageRef, file, { contentType });
    const downloadURL = await getDownloadURL(snapshot.ref);
    await setDoc(doc(db, "users", auth.currentUser.uid), { profilePhoto: downloadURL }, { merge: true });
    profilePhotoImg.src = downloadURL;
    alert("Profile photo updated!");
  } catch(err) {
    console.error("Profile photo upload failed:", err);
    alert("Profile photo upload failed. Check console.");
  }
}

// Save Info (username, bio, location, music)
async function saveProfileInfo() {
  const data = {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value,
    music: musicInput.value
  };
  await setDoc(doc(db, "users", auth.currentUser.uid), data, { merge: true });
  updateMusicPlayer();
  alert("Profile info saved!");
}

// Save Theme
async function saveTheme() {
  const theme = themeSelect.value;
  document.body.className = theme;
  await setDoc(doc(db, "users", auth.currentUser.uid), { theme }, { merge: true });
  alert("Theme updated!");
}

// Event Listeners
savePhotoBtn.addEventListener("click", saveProfilePhoto);
saveInfoBtn.addEventListener("click", saveProfileInfo);
saveThemeBtn.addEventListener("click", saveTheme);

// Load profile when page loads
auth.onAuthStateChanged(user => {
  if (user) loadProfile();
});
