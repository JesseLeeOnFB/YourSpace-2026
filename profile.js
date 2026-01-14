// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, updateDoc, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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

/* -------------------- DOM Elements -------------------- */
const profilePicInput = document.getElementById("profilePicInput");
const profilePicPreview = document.getElementById("profilePicPreview");
const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");
const locationInput = document.getElementById("location");
const musicInput = document.getElementById("musicURL");
const topFriendsInputs = Array.from(document.querySelectorAll(".topFriendInput"));
const notifyEmail = document.getElementById("notifyEmail");
const notifyBrowser = document.getElementById("notifyBrowser");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const homeBtn = document.getElementById("homeBtn");

/* -------------------- Auth -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Navigation
  homeBtn.onclick = () => window.location.href = "feed.html";
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  // Load profile data
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const data = userSnap.exists() ? userSnap.data() : {};

  displayNameInput.value = data.displayName || "";
  bioInput.value = data.bio || "";
  locationInput.value = data.location || "";
  musicInput.value = data.musicURL || "";
  profilePicPreview.src = data.photoURL || "default-avatar.png";

  if (data.topFriends && Array.isArray(data.topFriends)) {
    topFriendsInputs.forEach((input, i) => {
      input.value = data.topFriends[i] || "";
    });
  }

  notifyEmail.checked = !!data.notifyEmail;
  notifyBrowser.checked = !!data.notifyBrowser;

  /* -------------------- Profile Picture Upload -------------------- */
  profilePicInput.addEventListener("change", async () => {
    const file = profilePicInput.files[0];
    if (!file) return;
    profilePicPreview.src = URL.createObjectURL(file);
  });

  /* -------------------- Save Profile Button -------------------- */
  saveProfileBtn.onclick = async () => {
    saveProfileBtn.disabled = true;

    try {
      let photoURL = data.photoURL || "";
      const file = profilePicInput.files[0];
      if (file) {
        let contentType = file.type || "image/jpeg";
        const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${encodeURIComponent(file.name)}`);
        const snapshot = await uploadBytes(storageRef, file, { contentType });
        photoURL = await getDownloadURL(snapshot.ref);
      }

      const topFriends = topFriendsInputs.map(input => input.value.trim()).filter(Boolean);

      await updateDoc(userRef, {
        displayName: displayNameInput.value.trim() || "Anonymous",
        bio: bioInput.value.trim() || "",
        location: locationInput.value.trim() || "",
        musicURL: musicInput.value.trim() || "",
        photoURL,
        topFriends,
        notifyEmail: notifyEmail.checked,
        notifyBrowser: notifyBrowser.checked
      });

      alert("Profile saved successfully!");
    } catch (err) {
      console.error("Profile save failed:", err);
      alert("Failed to save profile. Check console.");
    } finally {
      saveProfileBtn.disabled = false;
    }
  };
});
