console.log("🔥 profile.js loaded");

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
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
const logoutBtn = document.getElementById("logoutBtn");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const uploadPhotoBtn = document.getElementById("uploadPhotoBtn");

const usernameInput = document.getElementById("username");
const bioInput = document.getElementById("bio");
const profilePicInput = document.getElementById("profilePicInput");
const profilePicDisplay = document.getElementById("profilePicDisplay");

// Logout
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  alert("Logged out!");
  window.location.href = "index.html"; // redirect to login page
});

// Load profile
async function loadProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const docSnap = await getDoc(doc(db, "users", user.uid));
  if (docSnap.exists()) {
    const data = docSnap.data();
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    if (data.photoURL) profilePicDisplay.src = data.photoURL;
  }
}

// Save username & bio
async function saveProfile() {
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in!");

  await setDoc(doc(db, "users", user.uid), {
    username: usernameInput.value,
    bio: bioInput.value,
    updatedAt: new Date()
  }, { merge: true });

  alert("Profile saved!");
}

// Upload photo
async function uploadProfilePhoto() {
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in!");
  const file = profilePicInput.files[0];
  if (!file) return alert("Please select a file!");

  const storageRef = ref(storage, `users/${user.uid}/profilePic.jpg`);
  await uploadBytes(storageRef, file);
  const photoURL = await getDownloadURL(storageRef);

  await setDoc(doc(db, "users", user.uid), { photoURL }, { merge: true });
  profilePicDisplay.src = photoURL;
  alert("Profile photo uploaded!");
}

// Event listeners
saveProfileBtn.addEventListener("click", saveProfile);
uploadPhotoBtn.addEventListener("click", uploadProfilePhoto);

// Load profile on auth state change
auth.onAuthStateChanged(user => {
  if (user) loadProfile();
  else window.location.href = "index.html"; // redirect if not logged in
});
