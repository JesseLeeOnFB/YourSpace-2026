import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Firebase config
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

// DOM elements
const profileImage = document.getElementById("profileImage");
const profileImageInput = document.getElementById("profileImageInput");
const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");
const locationInput = document.getElementById("location");
const saveBtn = document.getElementById("saveBtn");
const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

let currentUser;

// Show image preview
profileImageInput.addEventListener("change", () => {
  const file = profileImageInput.files[0];
  if (!file) return;
  profileImage.src = URL.createObjectURL(file);
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;

  homeBtn.onclick = () => window.location.href = "feed.html";
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  // Load profile data
  const userDoc = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDoc);

  if (userSnap.exists()) {
    const data = userSnap.data();
    displayNameInput.value = data.displayName || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    if (data.photoURL) profileImage.src = data.photoURL;
  }

  // Save profile
  saveBtn.onclick = async () => {
    saveBtn.disabled = true;

    let photoURL = "";
    try {
      const file = profileImageInput.files[0];
      if (file) {
        const safeName = encodeURIComponent(file.name);
        const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${safeName}`);
        const snapshot = await uploadBytes(storageRef, file, { contentType: file.type || "image/jpeg" });
        photoURL = await getDownloadURL(snapshot.ref);
      }

      await updateDoc(userDoc, {
        displayName: displayNameInput.value.trim(),
        bio: bioInput.value.trim(),
        location: locationInput.value.trim(),
        photoURL: photoURL || profileImage.src,
        updatedAt: serverTimestamp()
      });

      alert("Profile updated!");
    } catch (err) {
      console.error("Profile update failed:", err);
      alert("Profile update failed. Check console.");
    } finally {
      saveBtn.disabled = false;
    }
  };
});
