import { auth, db, storage } from "./firebaseConfig.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

document.addEventListener("DOMContentLoaded", async () => {

  // NAV BUTTONS
  homeBtn.onclick = () => location.href = "feed.html";
  profileBtn.onclick = () => location.href = "profile.html";
  logoutBtn.onclick = async () => {
    await auth.signOut();
    location.href = "index.html";
  };

  auth.onAuthStateChanged(async user => {
    if (!user) {
      location.href = "index.html";
      return;
    }

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await setDoc(userRef, {
        bio: "",
        location: "",
        profilePic: ""
      });
    }

    const data = snap.data();

    // LOAD PROFILE DATA
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";

    if (data.profilePic) {
      profilePicDisplay.src = data.profilePic;
      profilePicDisplay.style.display = "block";
    }

    // SAVE PROFILE INFO
    saveProfileBtn.onclick = async () => {
      await updateDoc(userRef, {
        bio: bioInput.value,
        location: locationInput.value
      });
      alert("Profile saved");
    };

    // PROFILE PHOTO UPLOAD
    saveProfilePicBtn.onclick = async () => {
      const file = profilePicInput.files[0];
      if (!file) return alert("Select a photo");

      const imgRef = ref(storage, `profileImages/${user.uid}/profile.jpg`);
      await uploadBytes(imgRef, file);
      const url = await getDownloadURL(imgRef);

      await updateDoc(userRef, { profilePic: url });
      profilePicDisplay.src = url;
      profilePicDisplay.style.display = "block";
      alert("Profile photo updated");
    };
  });

  // BACKGROUND LOAD
  const bgImg = localStorage.getItem("profileBgImage");
  const bgColor = localStorage.getItem("profileBgColor");

  if (bgImg) {
    document.body.style.backgroundImage = `url(${bgImg})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundAttachment = "fixed";
    bgImageInput.value = bgImg;
  }

  if (bgColor) {
    document.body.style.backgroundColor = bgColor;
    bgColorInput.value = bgColor;
  }

  // SAVE BACKGROUND
  saveBackgroundBtn.onclick = () => {
    const img = bgImageInput.value.trim();
    const color = bgColorInput.value;

    if (img) {
      localStorage.setItem("profileBgImage", img);
      document.body.style.backgroundImage = `url(${img})`;
      document.body.style.backgroundSize = "cover";
    } else {
      localStorage.removeItem("profileBgImage");
      document.body.style.backgroundImage = "none";
    }

    localStorage.setItem("profileBgColor", color);
    document.body.style.backgroundColor = color;

    alert("Background saved");
  };
});
