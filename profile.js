console.log("🔥 profile.js loaded");

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM elements
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const musicInput = document.getElementById("musicInput");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const profilePhotoPreview = document.getElementById("profilePhotoPreview");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const logoutBtn = document.getElementById("logoutBtn");

let currentUser;

// Monitor auth state
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Not logged in. Redirecting to homepage.");
    window.location.href = "index.html";
    return;
  }
  currentUser = user;

  // Load existing profile data
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    musicInput.value = data.music || "";
    if (data.photoURL) profilePhotoPreview.src = data.photoURL;
  }
});

// Save profile
saveProfileBtn.addEventListener("click", async () => {
  if (!currentUser) return alert("Not logged in");

  try {
    const dataToSave = {
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value,
      music: musicInput.value
    };

    await setDoc(doc(db, "users", currentUser.uid), dataToSave, { merge: true });

    alert("Profile updated!");
  } catch (error) {
    console.error("Error saving profile:", error);
    alert("Failed to save profile. Check console.");
  }
});

// Upload profile photo
profilePhotoInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!currentUser) return alert("Not logged in");

  try {
    const storageRef = ref(storage, `profilePhotos/${currentUser.uid}/${file.name}`);
    await uploadBytes(storageRef, file);
    const photoURL = await getDownloadURL(storageRef);

    // Save URL to Firestore
    await setDoc(doc(db, "users", currentUser.uid), { photoURL }, { merge: true });

    // Preview
    profilePhotoPreview.src = photoURL;

    alert("Profile photo uploaded!");
  } catch (error) {
    console.error("Photo upload error:", error);
    alert("Failed to upload photo.");
  }
});

// Logout
logoutBtn.addEventListener("click", () => signOut(auth));
