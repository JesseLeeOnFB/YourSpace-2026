// profile.js
import { auth, db, storage } from "./firebase.js";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

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
const topFriendInput = document.getElementById("topFriendInput");
const addTopFriendBtn = document.getElementById("addTopFriendBtn");

const searchUserInput = document.getElementById("searchUserInput");
const searchUserBtn = document.getElementById("searchUserBtn");
const searchResults = document.getElementById("searchResults");

let currentUserId;

// Ensure user is logged in
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    alert("Please log in.");
    window.location.href = "index.html";
    return;
  }
  currentUserId = user.uid;
  await loadProfile();
});

// Load profile data
async function loadProfile() {
  try {
    const docRef = doc(db, "users", currentUserId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      console.warn("No profile found, creating default...");
      await setDoc(docRef, {
        username: auth.currentUser.displayName || "Anonymous",
        bio: "",
        location: "",
        music: "",
        photoURL: "",
        theme: "",
        topFriends: [],
        friendRequests: [],
        friends: []
      });
    }
    const data = (await getDoc(docRef)).data();

    // Populate inputs
    usernameInput.value = data.username || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.music || "";
    profilePicDisplay.src = data.photoURL || "default-avatar.png";
    themeSelect.value = data.theme || "";

    // Top Friends
    topFriendsList.innerHTML = "";
    if (data.topFriends) {
      data.topFriends.forEach(friend => {
        const li = document.createElement("li");
        li.textContent = friend;
        topFriendsList.appendChild(li);
      });
    }
  } catch (err) {
    console.error("Failed to load profile:", err);
  }
}

// Save Profile Info (username, bio, location, music)
saveProfileInfoBtn.addEventListener("click", async () => {
  try {
    const docRef = doc(db, "users", currentUserId);
    await updateDoc(docRef, {
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value,
      music: musicInput.value
    });
    alert("Profile info saved!");
  } catch (err) {
    console.error(err);
    alert("Failed to save profile info");
  }
});

// Save Profile Picture
saveProfilePicBtn.addEventListener("click", async () => {
  const file = profilePicInput.files[0];
  if (!file) return alert("Please select a picture.");

  const ext = file.name.split(".").pop();
  const storageRef = ref(storage, `profileImages/${currentUserId}/${Date.now()}.${ext}`);

  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Update Firestore
    const docRef = doc(db, "users", currentUserId);
    await updateDoc(docRef, { photoURL: downloadURL });

    profilePicDisplay.src = downloadURL;
    alert("Profile picture updated!");
  } catch (err) {
    console.error(err);
    alert("Failed to upload profile picture");
  }
});

// Save Theme
saveThemeBtn.addEventListener("click", async () => {
  try {
    const docRef = doc(db, "users", currentUserId);
    await updateDoc(docRef, { theme: themeSelect.value });
    document.body.className = themeSelect.value || "default";
    alert("Theme saved!");
  } catch (err) {
    console.error(err);
    alert("Failed to save theme");
  }
});

// Add Top Friend
addTopFriendBtn.addEventListener("click", async () => {
  const newFriend = topFriendInput.value.trim();
  if (!newFriend) return alert("Enter a friend's username.");

  const docRef = doc(db, "users", currentUserId);
  await updateDoc(docRef, { topFriends: arrayUnion(newFriend) });
  topFriendsList.innerHTML += `<li>${newFriend}</li>`;
  topFriendInput.value = "";
});

// Search Users
searchUserBtn.addEventListener("click", async () => {
  const query = searchUserInput.value.trim();
  if (!query) return alert("Enter a username to search.");

  // Simple Firestore search by username
  const usersRef = doc(db, "users");
  try {
    const userDoc = await getDoc(doc(db, "users", query)); // use username as document ID if set that way
    if (!userDoc.exists()) {
      searchResults.innerHTML = "User not found";
      return;
    }
    const data = userDoc.data();
    searchResults.innerHTML = `
      <div class="userResult">
        <img src="${data.photoURL || 'default-avatar.png'}" class="profilePhoto" style="width:50px;height:50px;">
        <span>${data.username}</span>
        <button onclick="alert('Add Friend request sent!')">Add Friend</button>
      </div>
    `;
  } catch (err) {
    console.error(err);
    searchResults.innerHTML = "Search failed";
  }
});
