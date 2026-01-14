// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
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

const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");
const profilePic = document.getElementById("profilePic");
const profilePicInput = document.getElementById("profilePicInput");
const saveProfilePicBtn = document.getElementById("saveProfilePicBtn");

const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");
const locationInput = document.getElementById("location");
const top10FriendsList = document.getElementById("top10FriendsList");
const addFriendInput = document.getElementById("addFriendInput");
const addFriendBtn = document.getElementById("addFriendBtn");

const notifyEmail = document.getElementById("notifyEmail");
const notifyBrowser = document.getElementById("notifyBrowser");

const saveProfileBtn = document.getElementById("saveProfileBtn");

/* -------------------- Auth & Nav -------------------- */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Navigation
  homeBtn.onclick = () => (window.location.href = "feed.html");
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  const userDocRef = doc(db, "users", user.uid);

  // Load existing user data
  const userSnap = await getDoc(userDocRef);
  let userData = userSnap.exists() ? userSnap.data() : {};

  displayNameInput.value = userData.displayName || "";
  bioInput.value = userData.bio || "";
  locationInput.value = userData.location || "";
  notifyEmail.checked = userData.notifyEmail || false;
  notifyBrowser.checked = userData.notifyBrowser || false;

  // Load top 10 friends
  const friends = userData.top10Friends || [];
  top10FriendsList.innerHTML = "";
  friends.forEach(friend => {
    const li = document.createElement("li");
    li.textContent = friend;
    top10FriendsList.appendChild(li);
  });

  // Load profile picture from storage
  try {
    const picRef = ref(storage, `profileImages/${user.uid}/profilePic.jpeg`);
    const url = await getDownloadURL(picRef);
    profilePic.src = url;
  } catch (err) {
    console.log("No profile pic found, using default.", err);
  }

  /* -------------------- Save Profile Picture -------------------- */
  saveProfilePicBtn.onclick = async () => {
    const file = profilePicInput.files[0];
    if (!file) return alert("Select a picture first.");
    
    const ext = file.name.split('.').pop().toLowerCase();
    let contentType = file.type;
    if (!contentType) {
      if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
    }

    const storageRef = ref(storage, `profileImages/${user.uid}/profilePic.jpeg`);
    try {
      await uploadBytes(storageRef, file, { contentType });
      const url = await getDownloadURL(storageRef);
      profilePic.src = url;
      alert("Profile picture updated!");
    } catch (err) {
      console.error("Profile pic upload failed:", err);
      alert("Failed to upload picture.");
    }
  };

  /* -------------------- Save Profile Info -------------------- */
  saveProfileBtn.onclick = async () => {
    try {
      await setDoc(userDocRef, {
        displayName: displayNameInput.value.trim(),
        bio: bioInput.value.trim(),
        location: locationInput.value.trim(),
        notifyEmail: notifyEmail.checked,
        notifyBrowser: notifyBrowser.checked,
        top10Friends: userData.top10Friends || []
      }, { merge: true });
      alert("Profile saved!");
    } catch (err) {
      console.error("Profile save failed:", err);
      alert("Failed to save profile.");
    }
  };

  /* -------------------- Add Friend -------------------- */
  addFriendBtn.onclick = async () => {
    const friendName = addFriendInput.value.trim();
    if (!friendName) return;

    try {
      const updatedFriends = userData.top10Friends || [];
      if (!updatedFriends.includes(friendName)) {
        updatedFriends.push(friendName);
        if (updatedFriends.length > 10) updatedFriends.shift(); // Keep top 10
        await updateDoc(userDocRef, { top10Friends: updatedFriends });
        const li = document.createElement("li");
        li.textContent = friendName;
        top10FriendsList.appendChild(li);
        addFriendInput.value = "";
        userData.top10Friends = updatedFriends;
      }
    } catch (err) {
      console.error("Add friend failed:", err);
      alert("Failed to add friend.");
    }
  };
});
