import { auth, db, storage } from "./firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {

  // ===== NAVIGATION BUTTONS =====
  const homeBtn = document.getElementById("homeBtn");
  const profileBtn = document.getElementById("profileBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  homeBtn?.addEventListener("click", () => window.location.href = "feed.html");
  profileBtn?.addEventListener("click", () => window.location.href = "profile.html");
  logoutBtn?.addEventListener("click", async () => {
    try {
      await auth.signOut();
      window.location.href = "index.html";
    } catch (err) { console.error(err); alert("Logout failed."); }
  });

  // ===== DOM ELEMENTS =====
  const profilePhoto = document.getElementById("profilePhoto");
  const profilePhotoInput = document.getElementById("profilePhotoInput");
  const savePhotoBtn = document.getElementById("savePhotoBtn");

  const usernameInput = document.getElementById("usernameInput");
  const locationInput = document.getElementById("locationInput");
  const bioInput = document.getElementById("bioInput");
  const musicInput = document.getElementById("musicInput");
  const saveProfileBtn = document.getElementById("saveProfileBtn");

  const themeSelect = document.getElementById("themeSelect");
  const saveThemeBtn = document.getElementById("saveThemeBtn");

  // ===== LOAD USER DATA =====
  const uid = auth.currentUser.uid;
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    usernameInput.value = data.username || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.music || "";
    themeSelect.value = data.theme || "default";

    if (data.profilePic) profilePhoto.src = data.profilePic;
  }

  // ===== SAVE PROFILE INFO =====
  saveProfileBtn.addEventListener("click", async () => {
    try {
      await updateDoc(userRef, {
        username: usernameInput.value,
        location: locationInput.value,
        bio: bioInput.value,
        music: musicInput.value
      });
      alert("Profile info saved!");
    } catch (err) {
      console.error(err);
      alert("Failed to save profile info.");
    }
  });

  // ===== SAVE PROFILE PHOTO =====
  savePhotoBtn.addEventListener("click", async () => {
    if (!profilePhotoInput.files[0]) { alert("Select a photo first."); return; }
    const file = profilePhotoInput.files[0];
    const storageRef = ref(storage, `profileImages/${uid}/${Date.now()}_${file.name}`);

    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      await updateDoc(userRef, { profilePic: downloadURL });
      profilePhoto.src = downloadURL;
      alert("Profile photo saved!");
    } catch (err) { console.error(err); alert("Failed to save photo."); }
  });

  // ===== SAVE THEME =====
  saveThemeBtn.addEventListener("click", async () => {
    try {
      await updateDoc(userRef, { theme: themeSelect.value });
      document.body.className = themeSelect.value;
      alert("Theme saved!");
    } catch (err) { console.error(err); alert("Failed to save theme."); }
  });

});
