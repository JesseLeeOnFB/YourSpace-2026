// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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
const profilePicInput = document.getElementById("profilePicInput");
const profilePicPreview = document.getElementById("profilePicPreview");
const displayNameInput = document.getElementById("displayNameInput");
const bioInput = document.getElementById("bioInput");
const saveBtn = document.getElementById("saveProfileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const homeBtn = document.getElementById("homeBtn");

/* -------------------- Image Preview -------------------- */
profilePicInput.addEventListener("change", () => {
  const file = profilePicInput.files[0];
  if (!file) {
    profilePicPreview.style.display = "none";
    return;
  }
  profilePicPreview.src = URL.createObjectURL(file);
  profilePicPreview.style.display = "block";
});

/* -------------------- Auth & Load Profile -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Navigation
  homeBtn.onclick = () => (window.location.href = "feed.html");
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  // Load profile data
  const userDocRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDocRef);
  const userData = userSnap.exists() ? userSnap.data() : {};

  displayNameInput.value = userData.displayName || "";
  bioInput.value = userData.bio || "";
  profilePicPreview.src = userData.photoURL || "default-avatar.png";
  profilePicPreview.style.display = "block";

  /* -------------------- Save Profile -------------------- */
  saveBtn.onclick = async () => {
    saveBtn.disabled = true;
    let photoURL = userData.photoURL || "";

    try {
      // Upload new profile pic if selected
      if (profilePicInput.files.length > 0) {
        const file = profilePicInput.files[0];
        const safeName = encodeURIComponent(file.name);
        const storageRef = ref(storage, `profilePictures/${user.uid}/${Date.now()}_${safeName}`);
        const snapshot = await uploadBytes(storageRef, file);
        photoURL = await getDownloadURL(snapshot.ref);
      }

      // Update Firestore
      await updateDoc(userDocRef, {
        displayName: displayNameInput.value.trim(),
        bio: bioInput.value.trim(),
        photoURL,
        updatedAt: serverTimestamp()
      });

      // Update Firebase Auth profile
      await updateProfile(user, { displayName: displayNameInput.value.trim(), photoURL });

      alert("Profile updated!");
    } catch (err) {
      console.error("Profile update failed:", err);
      alert("Failed to update profile. Check console.");
    } finally {
      saveBtn.disabled = false;
    }
  };
});
