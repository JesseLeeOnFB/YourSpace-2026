// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

/* -------------------- Firebase Init -------------------- */
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

/* -------------------- DOM Elements -------------------- */
const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const profilePicInput = document.getElementById("profilePicInput");
const profilePicPreview = document.getElementById("profilePicPreview");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

/* -------------------- Auth & Nav -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  homeBtn.onclick = () => (window.location.href = "feed.html");
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  const userDocRef = doc(db, "users", user.uid);

  // Load existing profile data
  const userSnap = await getDoc(userDocRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    usernameInput.value = data.displayName || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.music || "";
    if (data.photoURL) {
      profilePicPreview.src = data.photoURL;
      profilePicPreview.style.display = "block";
      profilePicPreview.style.maxWidth = "200px";
      profilePicPreview.style.maxHeight = "200px";
    }
  }

  /* -------------------- Profile Picture Preview -------------------- */
  profilePicInput.addEventListener("change", () => {
    const file = profilePicInput.files[0];
    if (!file) {
      profilePicPreview.style.display = "none";
      return;
    }
    const url = URL.createObjectURL(file);
    profilePicPreview.src = url;
    profilePicPreview.style.display = "block";
    profilePicPreview.style.maxWidth = "200px";
    profilePicPreview.style.maxHeight = "200px";
  });

  /* -------------------- Save Profile -------------------- */
  saveProfileBtn.onclick = async () => {
    saveProfileBtn.disabled = true;
    try {
      let photoURL = profilePicPreview.src;

      // Upload photo if new file selected
      const file = profilePicInput.files[0];
      if (file) {
        let contentType = file.type;
        if (!contentType) contentType = "image/jpeg"; // fallback

        const safeName = encodeURIComponent(file.name);
        const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${safeName}`);
        const snapshot = await uploadBytes(storageRef, file, { contentType });
        photoURL = await getDownloadURL(snapshot.ref);
      }

      await setDoc(userDocRef, {
        displayName: usernameInput.value || "Anonymous",
        location: locationInput.value || "",
        bio: bioInput.value || "",
        music: musicInput.value || "",
        photoURL: photoURL || "",
        updatedAt: serverTimestamp()
      }, { merge: true });

      alert("Profile saved!");
    } catch (err) {
      console.error(err);
      alert("Failed to save profile. Check console.");
    } finally {
      saveProfileBtn.disabled = false;
    }
  };
});
