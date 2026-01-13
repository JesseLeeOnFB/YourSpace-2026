console.log("🔥 profile.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Firebase config (use your current keys)
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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM elements
const profilePhotoInput = document.getElementById("profilePhotoInput");
const profilePhotoPreview = document.getElementById("profilePhotoPreview");
const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");
const musicInput = document.getElementById("musicURL");
const themeInput = document.getElementById("themeHTML");
const saveBtn = document.getElementById("saveProfileBtn");

const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

// Navigation
homeBtn.addEventListener("click", () => { window.location.href = "feed.html"; });
logoutBtn.addEventListener("click", async () => { await auth.signOut(); window.location.href = "index.html"; });

// Load current profile
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const docRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    displayNameInput.value = data.displayName || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.musicURL || "";
    themeInput.value = data.themeHTML || "";

    if (data.photoURL) profilePhotoPreview.src = data.photoURL;
  }
});

// Save profile function
saveBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Not logged in");

  let photoURL = profilePhotoPreview.src;

  // Upload photo if selected
  if (profilePhotoInput.files.length > 0) {
    const file = profilePhotoInput.files[0];
    const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
    await uploadBytes(storageRef, file);
    photoURL = await getDownloadURL(storageRef);
  }

  // Update Firestore
  await setDoc(doc(db, "users", user.uid), {
    displayName: displayNameInput.value || user.email,
    bio: bioInput.value,
    musicURL: musicInput.value,
    themeHTML: themeInput.value,
    photoURL: photoURL
  }, { merge: true });

  alert("Profile updated!");
});
