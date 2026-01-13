// profile.js
console.log("🔥 profile.js loaded");

import { auth, db } from "./script.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const saveProfileBtn = document.getElementById("saveProfileBtn");
const usernameInput = document.getElementById("profileUsername");
const bioInput = document.getElementById("profileBio");
const locationInput = document.getElementById("profileLocation");
const musicInput = document.getElementById("profileMusic");
const themeInput = document.getElementById("profileTheme");
const photoInput = document.getElementById("profilePhoto");

const storage = getStorage();

async function loadProfile() {
  const docSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  if (docSnap.exists()) {
    const data = docSnap.data();
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    musicInput.value = data.music || "";
    themeInput.value = data.theme || "";
  }
}

if (saveProfileBtn) {
  saveProfileBtn.addEventListener("click", async () => {
    let photoURL = "";
    if (photoInput.files[0]) {
      const storageRef = ref(storage, `profilePictures/${auth.currentUser.uid}`);
      await uploadBytes(storageRef, photoInput.files[0]);
      photoURL = await getDownloadURL(storageRef);
    }

    await setDoc(doc(db, "users", auth.currentUser.uid), {
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value,
      music: musicInput.value,
      theme: themeInput.value,
      photoURL: photoURL || null
    }, { merge: true });

    alert("Profile updated!");
  });
}

window.onload = loadProfile;
