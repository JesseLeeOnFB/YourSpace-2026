// profile.js
import { auth, db, storage } from "./firebase.js";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-storage.js";

document.addEventListener("DOMContentLoaded", async () => {
  if (!auth.currentUser) return alert("Not logged in!");

  const userId = auth.currentUser.uid;

  // NAVIGATION BUTTONS
  const homeBtn = document.getElementById("homeBtn");
  const profileBtn = document.getElementById("profileBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (homeBtn) homeBtn.addEventListener("click", () => window.location.href = "feed.html");
  if (profileBtn) profileBtn.addEventListener("click", () => window.location.href = "profile.html");
  if (logoutBtn) logoutBtn.addEventListener("click", async () => {
    try {
      await auth.signOut();
      window.location.href = "index.html";
    } catch (err) { console.error(err); alert("Logout failed"); }
  });

  // ELEMENT REFERENCES
  const profilePhoto = document.getElementById("profilePhoto");
  const profilePhotoInput = document.getElementById("profilePhotoInput");
  const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");

  const usernameInput = document.getElementById("usernameInput");
  const locationInput = document.getElementById("locationInput");
  const bioInput = document.getElementById("bioInput");
  const musicInput = document.getElementById("musicInput");
  const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");

  const themeSelect = document.getElementById("themeSelect");
  const saveThemeBtn = document.getElementById("saveThemeBtn");

  const topFriendsList = document.getElementById("topFriendsList");
  const addTopFriendInput = document.getElementById("addTopFriendInput");
  const addTopFriendBtn = document.getElementById("addTopFriendBtn");

  // FETCH PROFILE DATA
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();

    if (data.photoURL) profilePhoto.src = data.photoURL;
    if (data.username) usernameInput.value = data.username;
    if (data.location) locationInput.value = data.location;
    if (data.bio) bioInput.value = data.bio;
    if (data.music) musicInput.value = data.music;
    if (data.theme) document.body.className = data.theme;

    if (data.topFriends && Array.isArray(data.topFriends)) {
      topFriendsList.innerHTML = "";
      data.topFriends.forEach(friend => {
        const li = document.createElement("li");
        li.textContent = friend;
        topFriendsList.appendChild(li);
      });
    }
  }

  // SAVE PROFILE PHOTO
  saveProfilePhotoBtn.addEventListener("click", async () => {
    const file = profilePhotoInput.files[0];
    if (!file) return alert("Select a photo first");

    const storageRef = ref(storage, `profileImages/${userId}/${Date.now()}_${file.name}`);
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      await updateDoc(userRef, { photoURL: downloadURL });
      profilePhoto.src = downloadURL;
      alert("Profile photo saved!");
    } catch (err) {
      console.error(err);
      alert("Failed to upload photo");
    }
  });

  // SAVE PROFILE INFO
  saveProfileInfoBtn.addEventListener("click", async () => {
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
      alert("Failed to save profile info");
    }
  });

  // SAVE THEME
  saveThemeBtn.addEventListener("click", async () => {
    const theme = themeSelect.value;
    document.body.className = theme;
    try {
      await updateDoc(userRef, { theme });
      alert("Theme saved!");
    } catch (err) {
      console.error(err);
      alert("Failed to save theme");
    }
  });

  // ADD TOP FRIEND
  addTopFriendBtn.addEventListener("click", async () => {
    const friendUsername = addTopFriendInput.value.trim();
    if (!friendUsername) return alert("Enter a username");

    try {
      // Search by username in users collection
      const usersCol = doc(db, "users", friendUsername); // we’ll use username as docId if available
      const friendSnap = await getDoc(usersCol);
      if (!friendSnap.exists()) return alert("User not found");

      await updateDoc(userRef, { topFriends: arrayUnion(friendUsername) });

      const li = document.createElement("li");
      li.textContent = friendUsername;
      topFriendsList.appendChild(li);
      addTopFriendInput.value = "";
    } catch (err) {
      console.error(err);
      alert("Failed to add friend");
    }
  });
});
