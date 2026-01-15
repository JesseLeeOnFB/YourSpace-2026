import { auth, db, storage } from "./firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const uid = auth.currentUser.uid;

  // HTML elements
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

  const searchUserInput = document.getElementById("searchUserInput");
  const searchUserBtn = document.getElementById("searchUserBtn");
  const searchResults = document.getElementById("searchResults");

  const musicPlayer = document.getElementById("musicPlayer");
  const saveMusicBtn = document.getElementById("saveMusicBtn");

  // NAV BUTTONS
  document.getElementById("homeBtn").addEventListener("click", () => window.location.href = "feed.html");
  document.getElementById("profileBtn").addEventListener("click", () => window.location.href = "profile.html");
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "index.html";
  });

  // LOAD PROFILE DATA
  const userDocRef = doc(db, "users", uid);
  const userSnap = await getDoc(userDocRef);
  if (userSnap.exists()) {
    const data = userSnap.data();

    usernameInput.value = data.username || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    themeSelect.value = data.theme || "";
    musicInput.value = data.music || "";

    if (data.profilePic) profilePhoto.src = data.profilePic;

    // Populate top friends
    topFriendsList.innerHTML = "";
    if (Array.isArray(data.topFriends)) {
      data.topFriends.forEach(friend => {
        const li = document.createElement("li");
        li.textContent = friend;
        topFriendsList.appendChild(li);
      });
    }

    // Load music player
    if (data.music) musicPlayer.src = data.music;
  }

  // SAVE PROFILE INFO
  saveProfileInfoBtn.addEventListener("click", async () => {
    try {
      await updateDoc(userDocRef, {
        username: usernameInput.value,
        location: locationInput.value,
        bio: bioInput.value,
        music: musicInput.value,
        updatedAt: serverTimestamp()
      });
      alert("Profile info saved!");
    } catch (err) {
      console.error(err);
      alert("Failed to save profile info.");
    }
  });

  // SAVE PROFILE PHOTO
  saveProfilePhotoBtn.addEventListener("click", async () => {
    const file = profilePhotoInput.files[0];
    if (!file) return alert("Select a photo first.");
    const storageRef = ref(storage, `profileImages/${uid}/${file.name}`);
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      await updateDoc(userDocRef, { profilePic: downloadURL });
      profilePhoto.src = downloadURL;
      alert("Profile photo updated!");
    } catch (err) {
      console.error(err);
      alert("Failed to update profile photo.");
    }
  });

  // SAVE THEME
  saveThemeBtn.addEventListener("click", async () => {
    try {
      await updateDoc(userDocRef, { theme: themeSelect.value });
      document.body.className = themeSelect.value || "default";
      alert("Theme updated!");
    } catch (err) {
      console.error(err);
      alert("Failed to save theme.");
    }
  });

  // ADD TOP FRIEND
  addTopFriendBtn.addEventListener("click", async () => {
    const friend = addTopFriendInput.value.trim();
    if (!friend) return;

    const userSnap = await getDoc(userDocRef);
    const currentTop = Array.isArray(userSnap.data().topFriends) ? userSnap.data().topFriends : [];
    if (!currentTop.includes(friend)) {
      currentTop.push(friend);
      await updateDoc(userDocRef, { topFriends: currentTop });
      const li = document.createElement("li");
      li.textContent = friend;
      topFriendsList.appendChild(li);
    }
    addTopFriendInput.value = "";
  });

  // SAVE MUSIC LINK
  saveMusicBtn.addEventListener("click", () => {
    if (!musicInput.value) return alert("Enter music link first.");
    musicPlayer.src = musicInput.value;
    updateDoc(userDocRef, { music: musicInput.value });
  });

  // SEARCH USER
  searchUserBtn.addEventListener("click", async () => {
    const searchName = searchUserInput.value.trim();
    if (!searchName) return alert("Enter username to search.");
    searchResults.innerHTML = "";

    // Query Firestore for exact match
    const docRef = doc(db, "users", searchName);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const userData = docSnap.data();
      const div = document.createElement("div");
      div.textContent = `Found: ${userData.username} - ${userData.location}`;
      searchResults.appendChild(div);
    } else {
      searchResults.textContent = "User not found";
    }
  });

});
