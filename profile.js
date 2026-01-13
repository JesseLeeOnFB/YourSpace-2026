console.log("🔥 profile.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
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

const welcomeMsg = document.getElementById("welcomeMsg");
const usernameInput = document.getElementById("username");
const bioInput = document.getElementById("bio");
const musicInput = document.getElementById("music");
const photoInput = document.getElementById("photo");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const logoutBtn = document.getElementById("logoutBtn");

onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = "index.html";
  welcomeMsg.textContent = `Welcome ${user.email}`;

  // Load user profile
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    usernameInput.value = data.username;
    bioInput.value = data.bio;
    musicInput.value = data.music;
  }

  // Save profile
  saveProfileBtn.addEventListener("click", async () => {
    let photoURL = "";
    if (photoInput.files[0]) {
      const storageRef = ref(storage, `profilePhotos/${user.uid}`);
      await uploadBytes(storageRef, photoInput.files[0]);
      photoURL = await getDownloadURL(storageRef);
    }

    await setDoc(doc(db, "users", user.uid), {
      username: usernameInput.value,
      bio: bioInput.value,
      music: musicInput.value,
      photoURL
    }, { merge: true });

    alert("Profile updated!");
  });

  // Logout
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
});
