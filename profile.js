console.log("🔥 profile.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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
const photoFile = document.getElementById("photoFile");
const musicInput = document.getElementById("musicURL");
const themeInput = document.getElementById("theme");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const homeBtn = document.getElementById("homeBtn");

// Auth listener
onAuthStateChanged(auth, async user => {
  if (!user) return window.location.href = "index.html";
  const userDoc = await getDoc(doc(db, "users", user.uid));
  const data = userDoc.exists() ? userDoc.data() : {};
  displayNameInput.value = data.displayName || "";
  bioInput.value = data.bio || "";
  locationInput.value = data.location || "";
  musicInput.value = data.musicURL || "";
  themeInput.value = data.theme || "";
});

// Save profile
saveProfileBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Not logged in");

  let photoURL = "";
  if (photoFile.files[0]) {
    const storageRef = ref(storage, `profilePhotos/${user.uid}`);
    await uploadBytes(storageRef, photoFile.files[0]);
    photoURL = await getDownloadURL(storageRef);
  }

  await setDoc(doc(db, "users", user.uid), {
    displayName: displayNameInput.value,
    bio: bioInput.value,
    location: locationInput.value,
    musicURL: musicInput.value,
    theme: themeInput.value,
    photoURL
  }, { merge: true });

  await updateProfile(user, { displayName: displayNameInput.value, photoURL });
  alert("Profile Updated!");
});

// Navigation
logoutBtn.addEventListener("click", async () => { await auth.signOut(); window.location.href = "index.html"; });
homeBtn.addEventListener("click", () => window.location.href = "feed.html");
