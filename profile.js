console.log("🔥 profile.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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

// DOM
const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");
const locationInput = document.getElementById("location");
const photoInput = document.getElementById("photo");
const themeInput = document.getElementById("theme");
const musicInput = document.getElementById("music");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const homeBtn = document.getElementById("homeBtn");

// Load profile data
onAuthStateChanged(auth, async user => {
  if (!user) return window.location.href = "index.html";
  const docSnap = await getDoc(doc(db, "users", user.uid));
  if (docSnap.exists()) {
    const data = docSnap.data();
    displayNameInput.value = data.displayName || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    themeInput.value = data.theme || "";
    musicInput.value = data.music || "";
  }
});

// Save profile
saveProfileBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Not logged in");

  let photoURL = "";
  if (photoInput.files.length > 0) {
    const file = photoInput.files[0];
    const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
    await uploadBytes(storageRef, file);
    photoURL = await getDownloadURL(storageRef);
  }

  await setDoc(doc(db, "users", user.uid), {
    displayName: displayNameInput.value,
    bio: bioInput.value,
    location: locationInput.value,
    theme: themeInput.value,
    music: musicInput.value,
    photoURL: photoURL || ""
  }, { merge: true });

  await updateProfile(user, { displayName: displayNameInput.value, photoURL: photoURL || user.photoURL });
  alert("Profile saved!");
});

// Logout & Home
logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href="index.html"));
homeBtn.addEventListener("click", () => window.location.href="feed.html"));
