import { auth, db, storage } from './firebase.js';
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Elements
const profilePhotoInput = document.getElementById("profilePhotoInput");
const profilePhotoPreview = document.getElementById("profilePhotoPreview");
const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");
const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const bgImageInput = document.getElementById("bgImageInput");
const bgColorInput = document.getElementById("bgColorInput");
const themeSelect = document.getElementById("themeSelect");
const saveCustomizationBtn = document.getElementById("saveCustomizationBtn");

const musicPlayer = document.getElementById("musicPlayer");

// Load user data
onAuthStateChanged(auth, async user => {
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userRef);
  if (!docSnap.exists()) return;

  const data = docSnap.data();
  // Profile
  usernameInput.value = data.username || "";
  locationInput.value = data.location || "";
  bioInput.value = data.bio || "";
  musicInput.value = data.music || "";
  if (data.profilePhoto) profilePhotoPreview.src = data.profilePhoto;

  // Customization
  bgImageInput.value = data.bgImage || "";
  bgColorInput.value = data.bgColor || "#ffffff";
  themeSelect.value = data.theme || "default";

  if (data.bgImage) document.body.style.backgroundImage = `url(${data.bgImage})`;
  if (data.bgColor) document.body.style.backgroundColor = data.bgColor;
  if (data.theme) document.body.className = data.theme;

  // Music
  if (data.music) musicPlayer.src = data.music;
});

// Save profile photo
saveProfilePhotoBtn.addEventListener("click", async () => {
  if (!auth.currentUser) return alert("Not signed in");
  const file = profilePhotoInput.files[0];
  if (!file) return alert("Select a photo");

  const contentType = file.type || "image/jpeg";
  const storageRef = ref(storage, `profileImages/${auth.currentUser.uid}/${Date.now()}_${file.name}`);

  try {
    const snapshot = await uploadBytes(storageRef, file, { contentType });
    const downloadURL = await getDownloadURL(snapshot.ref);
    await updateDoc(doc(db, "users", auth.currentUser.uid), { profilePhoto: downloadURL });
    profilePhotoPreview.src = downloadURL;
    alert("Profile photo updated!");
  } catch(err) {
    console.error(err);
    alert("Upload failed. Check console.");
  }
});

// Save profile info (username, bio, location, music)
saveProfileBtn.addEventListener("click", async () => {
  if (!auth.currentUser) return alert("Not signed in");

  const updates = {
    username: usernameInput.value.trim(),
    location: locationInput.value.trim(),
    bio: bioInput.value.trim(),
    music: musicInput.value.trim()
  };

  await updateDoc(doc(db, "users", auth.currentUser.uid), updates);
  if (updates.music) musicPlayer.src = updates.music;
  alert("Profile info saved!");
});

// Save customization
saveCustomizationBtn.addEventListener("click", async () => {
  if (!auth.currentUser) return alert("Not signed in");

  const updates = {
    bgImage: bgImageInput.value.trim(),
    bgColor: bgColorInput.value,
    theme: themeSelect.value
  };

  await updateDoc(doc(db, "users", auth.currentUser.uid), updates);

  document.body.style.backgroundImage = updates.bgImage ? `url(${updates.bgImage})` : "";
  document.body.style.backgroundColor = updates.bgColor;
  document.body.className = updates.theme;

  alert("Customization saved!");
});
