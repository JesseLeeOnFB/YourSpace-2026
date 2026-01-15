import { auth, db, storage } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

console.log("✅ profile.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  console.log("🟢 Profile DOM ready");

  const profilePhoto = document.getElementById("profilePhoto");
  const profilePhotoInput = document.getElementById("profilePhotoInput");

  const usernameInput = document.getElementById("usernameInput");
  const locationInput = document.getElementById("locationInput");
  const bioInput = document.getElementById("bioInput");
  const musicInput = document.getElementById("musicInput");

  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const savePhotoBtn = document.getElementById("savePhotoBtn");
  const saveThemeBtn = document.getElementById("saveThemeBtn");

  const themeSelect = document.getElementById("themeSelect");

  const homeBtn = document.getElementById("homeBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data();

      usernameInput.value = data.username || "";
      locationInput.value = data.location || "";
      bioInput.value = data.bio || "";
      musicInput.value = data.music || "";
      themeSelect.value = data.theme || "default";

      if (data.profilePic) {
        profilePhoto.src = data.profilePic;
      }

      document.body.className = data.theme || "default";
    }
  });

  saveProfileBtn.addEventListener("click", async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await setDoc(
        doc(db, "users", user.uid),
        {
          username: usernameInput.value.trim(),
          location: locationInput.value.trim(),
          bio: bioInput.value.trim(),
          music: musicInput.value.trim(),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      alert("Profile saved");
    } catch (err) {
      console.error(err);
      alert("Failed to save profile");
    }
  });

  savePhotoBtn.addEventListener("click", async () => {
    try {
      const user = auth.currentUser;
      if (!user || !profilePhotoInput.files[0]) return;

      const file = profilePhotoInput.files[0];
      const photoRef = ref(storage, `profileImages/${user.uid}/profile.jpg`);

      await uploadBytes(photoRef, file, { contentType: file.type });
      const url = await getDownloadURL(photoRef);

      await updateDoc(doc(db, "users", user.uid), {
        profilePic: url
      });

      profilePhoto.src = url;
      alert("Profile photo updated");
    } catch (err) {
      console.error(err);
      alert("Photo upload failed");
    }
  });

  saveThemeBtn.addEventListener("click", async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const theme = themeSelect.value;
      document.body.className = theme;

      await updateDoc(doc(db, "users", user.uid), { theme });
      alert("Theme saved");
    } catch (err) {
      console.error(err);
      alert("Failed to save theme");
    }
  });

  homeBtn.addEventListener("click", () => {
    window.location.href = "feed.html";
  });

  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
});
