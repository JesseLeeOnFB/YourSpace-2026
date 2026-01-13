console.log("🔥 script.js loaded");

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// 🔑 Firebase config
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

// DOM Elements
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const photoInput = document.getElementById("photoInput");
const cssInput = document.getElementById("cssInput");
const musicInput = document.getElementById("musicInput");

const saveProfileBtn = document.getElementById("saveProfileBtn");
const logoutBtn = document.getElementById("logoutBtn");

const previewPhoto = document.getElementById("previewPhoto");
const previewUsername = document.getElementById("previewUsername");
const previewBio = document.getElementById("previewBio");
const previewMusic = document.getElementById("previewMusic");

// ----------------------
// Load current user profile
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      usernameInput.value = data.username || "";
      bioInput.value = data.bio || "";
      cssInput.value = data.css || "";
      musicInput.value = data.musicUrl || "";

      if (data.photoURL) previewPhoto.src = data.photoURL;
      previewUsername.textContent = data.username || "";
      previewBio.textContent = data.bio || "";
      previewMusic.src = data.musicUrl || "";
    }
  } else {
    console.log("No user signed in");
  }
});

// ----------------------
// Save profile handler
saveProfileBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Not logged in!");

  const username = usernameInput.value;
  const bio = bioInput.value;
  const css = cssInput.value;
  const musicUrl = musicInput.value;
  const file = photoInput.files[0];

  let photoURL = "";

  if (file) {
    const storageRef = ref(storage, `profilePictures/${user.uid}`);
    await uploadBytes(storageRef, file);
    photoURL = await getDownloadURL(storageRef);
  }

  await setDoc(doc(db, "users", user.uid), {
    username,
    bio,
    css,
    musicUrl,
    photoURL
  }, { merge: true });

  // Update preview
  previewPhoto.src = photoURL || previewPhoto.src;
  previewUsername.textContent = username;
  previewBio.textContent = bio;
  previewMusic.src = musicUrl;

  alert("Profile saved!");
});

// ----------------------
// Logout
logoutBtn.addEventListener("click", () => {
  signOut(auth);
  alert("Logged out!");
  window.location.href = "index.html";
});
