// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

/* -------------------- Firebase Init -------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/* -------------------- DOM -------------------- */
const profilePic = document.getElementById("profilePic");
const profilePicInput = document.getElementById("profilePicInput");
const updatePicBtn = document.getElementById("updatePicBtn");
const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");
const locationInput = document.getElementById("location");
const musicURLInput = document.getElementById("musicURL");
const updateProfileBtn = document.getElementById("updateProfileBtn");

const homeBtn = document.getElementById("homeBtn");
const feedBtn = document.getElementById("feedBtn");
const logoutBtn = document.getElementById("logoutBtn");

/* -------------------- Auth -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Navigation buttons
  homeBtn.onclick = () => window.location.href = "index.html";
  feedBtn.onclick = () => window.location.href = "feed.html";
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  // Load profile data
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    profilePic.src = data.photoURL || "default-avatar.png";
    displayNameInput.value = data.displayName || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    musicURLInput.value = data.musicURL || "";
  }

  /* -------------------- UPDATE PROFILE PICTURE -------------------- */
  updatePicBtn.onclick = async () => {
    const file = profilePicInput.files[0];
    if (!file) return alert("Select an image first.");

    updatePicBtn.disabled = true;

    try {
      const safeName = encodeURIComponent(file.name);
      const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${safeName}`);
      const snapshot = await uploadBytes(storageRef, file, { contentType: file.type || "image/jpeg" });
      const photoURL = await getDownloadURL(snapshot.ref);

      // Update Firestore
      await updateDoc(userRef, { photoURL });
      profilePic.src = photoURL;
      profilePicInput.value = "";
      alert("Profile picture updated!");
    } catch (err) {
      console.error("Failed to update picture:", err);
      alert("Failed to update picture.");
    } finally {
      updatePicBtn.disabled = false;
    }
  };

  /* -------------------- UPDATE PROFILE INFO -------------------- */
  updateProfileBtn.onclick = async () => {
    const updates = {
      displayName: displayNameInput.value.trim(),
      bio: bioInput.value.trim(),
      location: locationInput.value.trim(),
      musicURL: musicURLInput.value.trim()
    };

    try {
      await updateDoc(userRef, updates);
      alert("Profile updated!");
    } catch (err) {
      console.error("Failed to update profile:", err);
      alert("Failed to update profile.");
    }
  };
});
