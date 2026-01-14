// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

const profilePhotoInput = document.getElementById("profilePhotoInput");
const profilePhotoPreview = document.getElementById("profilePhotoPreview");
const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const topFriendsList = document.getElementById("topFriendsList");
const editFriendsBtn = document.getElementById("editFriendsBtn");

let currentUser = null;

// Auth listener
onAuthStateChanged(auth, async user => {
  if (user) {
    currentUser = user;
    await loadProfile();
  } else {
    window.location.href = "index.html";
  }
});

// Load profile from Firestore
async function loadProfile() {
  const userDoc = doc(db, "users", currentUser.uid);
  const snapshot = await getDoc(userDoc);
  
  if (snapshot.exists()) {
    const data = snapshot.data();
    usernameInput.value = data.username || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.music || "";
    if (data.profilePhotoURL) profilePhotoPreview.src = data.profilePhotoURL;

    if (Array.isArray(data.topFriends)) {
      topFriendsList.innerHTML = "";
      data.topFriends.forEach(friend => {
        const li = document.createElement("li");
        li.textContent = friend;
        topFriendsList.appendChild(li);
      });
    }
  }
}

// Profile photo preview
profilePhotoInput.addEventListener("change", () => {
  const file = profilePhotoInput.files[0];
  if (file) {
    profilePhotoPreview.src = URL.createObjectURL(file);
  }
});

// Save profile button
saveProfileBtn.addEventListener("click", async () => {
  saveProfileBtn.disabled = true;
  let profilePhotoURL = profilePhotoPreview.src;

  try {
    // Upload profile photo if a new file is selected
    const file = profilePhotoInput.files[0];
    if (file) {
      let contentType = file.type;
      if (!contentType) {
        const ext = file.name.split(".").pop().toLowerCase();
        if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
      }
      const storageRef = ref(storage, `profileImages/${currentUser.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file, { contentType });
      profilePhotoURL = await getDownloadURL(snapshot.ref);
    }

    // Save all profile data to Firestore
    const userDoc = doc(db, "users", currentUser.uid);
    await setDoc(userDoc, {
      username: usernameInput.value,
      location: locationInput.value,
      bio: bioInput.value,
      music: musicInput.value,
      profilePhotoURL,
      topFriends: Array.from(topFriendsList.querySelectorAll("li")).map(li => li.textContent)
    }, { merge: true });

    alert("Profile saved successfully!");
  } catch (error) {
    console.error("Error saving profile:", error);
    alert("Failed to save profile. Check console.");
  } finally {
    saveProfileBtn.disabled = false;
  }
});

// Edit top friends
editFriendsBtn.addEventListener("click", () => {
  const friendNames = prompt("Enter Top 10 friends, comma-separated:", 
    Array.from(topFriendsList.querySelectorAll("li")).map(li => li.textContent).join(", "));
  if (friendNames !== null) {
    topFriendsList.innerHTML = "";
    friendNames.split(",").slice(0,10).forEach(name => {
      const li = document.createElement("li");
      li.textContent = name.trim();
      topFriendsList.appendChild(li);
    });
  }
});
