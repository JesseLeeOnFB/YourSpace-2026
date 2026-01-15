// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM Elements
const profilePhoto = document.getElementById("profilePhoto");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");

const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");

const friendsList = document.getElementById("friendsList");
const addFriendInput = document.getElementById("addFriendInput");
const addFriendBtn = document.getElementById("addFriendBtn");

const themeSelect = document.getElementById("themeSelect");
const customHTML = document.getElementById("customHTML");
const saveThemeBtn = document.getElementById("saveThemeBtn");

const musicPlayerContainer = document.getElementById("musicPlayerContainer");

let currentUserId;

// Check auth state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUserId = user.uid;
    await loadProfile();
  } else {
    // Redirect to login
    window.location.href = "index.html";
  }
});

// Load profile info
async function loadProfile() {
  const userDoc = doc(db, "users", currentUserId);
  const userSnap = await getDoc(userDoc);

  if (userSnap.exists()) {
    const data = userSnap.data();

    // Profile Info
    usernameInput.value = data.username || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.music || "";
    profilePhoto.src = data.profilePhoto || "";

    // Top 10 Friends
    friendsList.innerHTML = "";
    if (Array.isArray(data.friends)) {
      data.friends.forEach(friend => {
        const li = document.createElement("li");
        li.textContent = friend;
        friendsList.appendChild(li);
      });
    }

    // Theme
    document.body.className = data.theme || "default";
    customHTML.value = data.customHTML || "";

    // Music player
    if (data.music) {
      musicPlayerContainer.innerHTML = `<iframe width="300" height="80" src="${data.music}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    }
  }
}

// Save Profile Photo
saveProfilePhotoBtn.addEventListener("click", async () => {
  const file = profilePhotoInput.files[0];
  if (!file) return alert("Select a photo first.");

  const ext = file.name.split('.').pop().toLowerCase();
  let contentType = file.type;
  if (!contentType) {
    contentType = ["jpg","jpeg","png","gif"].includes(ext) ? "image/jpeg" : "image/png";
  }

  const storageRef = ref(storage, `profileImages/${currentUserId}/${Date.now()}_${file.name}`);
  try {
    const snapshot = await uploadBytes(storageRef, file, { contentType });
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Update Firestore
    await updateDoc(doc(db, "users", currentUserId), { profilePhoto: downloadURL });
    profilePhoto.src = downloadURL;
    alert("Profile photo updated!");
  } catch(err) {
    console.error("Profile photo upload failed:", err);
    alert("Upload failed. Check console.");
  }
});

// Save Profile Info
saveProfileInfoBtn.addEventListener("click", async () => {
  await setDoc(doc(db, "users", currentUserId), {
    username: usernameInput.value,
    location: locationInput.value,
    bio: bioInput.value,
    music: musicInput.value
  }, { merge: true });

  // Update music player
  if (musicInput.value) {
    musicPlayerContainer.innerHTML = `<iframe width="300" height="80" src="${musicInput.value}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  }
  alert("Profile info saved!");
});

// Add Friend
addFriendBtn.addEventListener("click", async () => {
  const friendName = addFriendInput.value.trim();
  if (!friendName) return;

  await updateDoc(doc(db, "users", currentUserId), {
    friends: arrayUnion(friendName)
  });

  const li = document.createElement("li");
  li.textContent = friendName;
  friendsList.appendChild(li);
  addFriendInput.value = "";
});

// Save Theme
saveThemeBtn.addEventListener("click", async () => {
  const theme = themeSelect.value;
  document.body.className = theme;
  await updateDoc(doc(db, "users", currentUserId), {
    theme,
    customHTML: customHTML.value
  });
  alert("Theme saved!");
});

// NAVIGATION
document.getElementById("homeBtn").addEventListener("click", () => {
  window.location.href = "feed.html";
});
document.getElementById("profileBtn").addEventListener("click", () => {
  window.location.href = "profile.html";
});
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "index.html";
});
