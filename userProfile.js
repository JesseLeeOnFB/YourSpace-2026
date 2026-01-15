import { auth, db, storage } from './script.js'; // ensure this points to your initialized Firebase
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

document.addEventListener("DOMContentLoaded", async () => {
  if (!auth.currentUser) return;

  const userId = auth.currentUser.uid;
  const profilePicDisplay = document.getElementById("profilePicDisplay");
  const profilePicInput = document.getElementById("profilePicInput");
  const saveProfilePicBtn = document.getElementById("saveProfilePicBtn");
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
  const friendSearchInput = document.getElementById("friendSearchInput");
  const friendSearchBtn = document.getElementById("friendSearchBtn");
  const friendSearchResults = document.getElementById("friendSearchResults");

  const userDocRef = doc(db, "users", userId);
  const userDocSnap = await getDoc(userDocRef);
  if (!userDocSnap.exists()) return;

  const userData = userDocSnap.data();

  // Load existing profile info
  profilePicDisplay.src = userData.profilePic || "";
  usernameInput.value = userData.username || "";
  locationInput.value = userData.location || "";
  bioInput.value = userData.bio || "";
  musicInput.value = userData.music || "";
  themeSelect.value = userData.theme || "";
  topFriendsList.innerHTML = (userData.topFriends || []).map(u => `<div>${u}</div>`).join("");

  // Save Profile Info
  saveProfileInfoBtn.addEventListener("click", async () => {
    try {
      await updateDoc(userDocRef, {
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

  // Save Profile Picture
  saveProfilePicBtn.addEventListener("click", async () => {
    const file = profilePicInput.files[0];
    if (!file) return alert("Select a file first");
    const storageRef = ref(storage, `profileImages/${userId}/${Date.now()}_${file.name}`);
    try {
      await uploadBytes(storageRef, file, { contentType: file.type });
      const downloadURL = await getDownloadURL(storageRef);
      await updateDoc(userDocRef, { profilePic: downloadURL });
      profilePicDisplay.src = downloadURL;
      alert("Profile picture updated!");
    } catch (err) {
      console.error(err);
      alert("Failed to upload profile picture.");
    }
  });

  // Save Theme
  saveThemeBtn.addEventListener("click", async () => {
    try {
      await updateDoc(userDocRef, { theme: themeSelect.value });
      document.body.className = themeSelect.value || "default";
      alert("Theme saved!");
    } catch (err) {
      console.error(err);
      alert("Failed to save theme.");
    }
  });

  // Add Top Friend
  addTopFriendBtn.addEventListener("click", async () => {
    const friendUsername = addTopFriendInput.value.trim();
    if (!friendUsername) return;
    try {
      await updateDoc(userDocRef, { topFriends: arrayUnion(friendUsername) });
      topFriendsList.innerHTML += `<div>${friendUsername}</div>`;
      addTopFriendInput.value = "";
      alert("Added to top friends!");
    } catch (err) {
      console.error(err);
      alert("Failed to add top friend.");
    }
  });

  // Friend Search
  friendSearchBtn.addEventListener("click", async () => {
    const searchUsername = friendSearchInput.value.trim();
    if (!searchUsername) return;

    const results = [];
    const usersSnapshot = await getDoc(userDocRef); // placeholder, replace with actual collection query if needed
    // Show basic dummy search for now
    results.push(searchUsername);
    friendSearchResults.innerHTML = results.map(u => `<div>${u} <button onclick="sendFriendRequest('${u}')">Add Friend</button></div>`).join("");
  });
});

// Placeholder global function for sending friend requests
window.sendFriendRequest = async (username) => {
  alert(`Friend request sent to ${username} (placeholder function)`);
};
