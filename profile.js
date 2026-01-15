import { auth, db, storage } from './firestore.js';
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

document.addEventListener("DOMContentLoaded", async () => {
  // --- ELEMENTS ---
  const profilePhoto = document.getElementById("profilePhoto");
  const profilePhotoInput = document.getElementById("profilePhotoInput");
  const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");

  const usernameInput = document.getElementById("usernameInput");
  const bioInput = document.getElementById("bioInput");
  const locationInput = document.getElementById("locationInput");
  const musicInput = document.getElementById("musicInput");
  const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");

  const themeSelect = document.getElementById("themeSelect");
  const saveThemeBtn = document.getElementById("saveThemeBtn");

  const topFriendsContainer = document.getElementById("topFriendsContainer");
  const searchUserInput = document.getElementById("searchUserInput");
  const searchUserBtn = document.getElementById("searchUserBtn");
  const searchResults = document.getElementById("searchResults");

  // --- NAV BUTTONS ---
  document.getElementById("homeBtn").addEventListener("click", () => window.location.href = "feed.html");
  document.getElementById("profileBtn").addEventListener("click", () => window.location.href = "profile.html");
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "index.html";
  });

  // --- LOAD PROFILE DATA ---
  const uid = auth.currentUser.uid;
  const userDocRef = doc(db, "users", uid);
  const userSnap = await getDoc(userDocRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    musicInput.value = data.music || "";
    themeSelect.value = data.theme || "default";
    document.body.className = themeSelect.value;
    if (data.profilePic) profilePhoto.src = data.profilePic;
    if (data.topFriends) {
      topFriendsContainer.innerHTML = "";
      data.topFriends.split(",").forEach(f => {
        if (f) topFriendsContainer.innerHTML += `<div class="friendCard">${f}</div>`;
      });
    }
  }

  // --- SAVE PROFILE PHOTO ---
  saveProfilePhotoBtn.addEventListener("click", async () => {
    if (!profilePhotoInput.files[0]) return alert("Select a photo first!");
    const file = profilePhotoInput.files[0];
    const storageRef = ref(storage, `profileImages/${uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    await updateDoc(userDocRef, { profilePic: url });
    profilePhoto.src = url;
    alert("Profile photo saved!");
  });

  // --- SAVE PROFILE INFO ---
  saveProfileInfoBtn.addEventListener("click", async () => {
    await updateDoc(userDocRef, {
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value,
      music: musicInput.value
    });
    alert("Profile info saved!");
  });

  // --- SAVE THEME ---
  saveThemeBtn.addEventListener("click", async () => {
    const theme = themeSelect.value;
    await updateDoc(userDocRef, { theme });
    document.body.className = theme;
    alert("Theme saved!");
  });

  // --- SEARCH USERS ---
  searchUserBtn.addEventListener("click", async () => {
    const queryUsername = searchUserInput.value.trim();
    searchResults.innerHTML = "Searching...";
    const userDoc = await getDoc(doc(db, "users", queryUsername));
    if (userDoc.exists()) {
      const data = userDoc.data();
      searchResults.innerHTML = `<p>${data.username} <button onclick="alert('Send friend request flow')">Add Friend</button></p>`;
    } else {
      searchResults.innerHTML = "<p>User not found.</p>";
    }
  });

});
