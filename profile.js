// ✅ PROFILE.JS — SELF CONTAINED (NO firebase.js REQUIRED)

// 🔥 PROOF THIS FILE LOADS
console.log("profile.js loaded");

// ----------------------------------
// 🔹 FIREBASE SETUP (SAME AS FEED)
// ----------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// 🔐 YOUR FIREBASE CONFIG (UNCHANGED)
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

// INIT
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ----------------------------------
// 🔹 DOM ELEMENTS
// ----------------------------------
const saveProfileBtn = document.getElementById("saveProfileBtn");
const saveThemeBtn = document.getElementById("saveThemeBtn");
const profilePicInput = document.getElementById("profilePicInput");
const profilePicImg = document.getElementById("profilePic");

const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const musicInput = document.getElementById("musicInput");
const themeSelect = document.getElementById("themeSelect");

// ----------------------------------
// 🔹 AUTH + LOAD PROFILE
// ----------------------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      username: "Anonymous",
      bio: "",
      location: "",
      music: "",
      photoURL: "",
      theme: "default",
      createdAt: serverTimestamp()
    });
  }

  const data = (await getDoc(userRef)).data();

  usernameInput.value = data.username || "";
  bioInput.value = data.bio || "";
  locationInput.value = data.location || "";
  musicInput.value = data.music || "";
  themeSelect.value = data.theme || "default";

  if (data.photoURL) {
    profilePicImg.src = data.photoURL;
  }

  document.body.className = data.theme || "default";
});

// ----------------------------------
// 💾 SAVE PROFILE INFO
// ----------------------------------
saveProfileBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) return alert("Not logged in");

  try {
    await updateDoc(doc(db, "users", user.uid), {
      username: usernameInput.value.trim(),
      bio: bioInput.value.trim(),
      location: locationInput.value.trim(),
      music: musicInput.value.trim()
    });
    alert("Profile saved ✅");
  } catch (err) {
    console.error(err);
    alert("Failed to save profile");
  }
};

// ----------------------------------
// 🎨 SAVE THEME
// ----------------------------------
saveThemeBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const theme = themeSelect.value;
  document.body.className = theme;

  try {
    await updateDoc(doc(db, "users", user.uid), { theme });
    alert("Theme saved ✅");
  } catch (err) {
    console.error(err);
    alert("Failed to save theme");
  }
};

// ----------------------------------
// 🖼️ UPLOAD PROFILE PICTURE
// ----------------------------------
profilePicInput.onchange = async (e) => {
  const file = e.target.files[0];
  const user = auth.currentUser;
  if (!file || !user) return;

  const imgRef = ref(storage, `profileImages/${user.uid}/profile.jpg`);

  try {
    await uploadBytes(imgRef, file, { contentType: file.type });
    const url = await getDownloadURL(imgRef);

    await updateDoc(doc(db, "users", user.uid), {
      photoURL: url
    });

    profilePicImg.src = url;
    alert("Profile photo updated ✅");
  } catch (err) {
    console.error(err);
    alert("Failed to upload photo");
  }
};
