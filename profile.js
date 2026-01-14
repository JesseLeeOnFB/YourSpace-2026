// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.6.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.6.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.6.2/firebase-storage.js";

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

// DOM elements
const profilePhotoInput = document.getElementById("profilePhotoInput");
const profilePhotoPreview = document.getElementById("profilePhotoPreview");
const savePhotoBtn = document.getElementById("savePhotoBtn");

const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const saveInfoBtn = document.getElementById("saveInfoBtn");

const friendsContainer = document.getElementById("friendsContainer");

// -----------------------------
// Load current profile
// -----------------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userDocRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDocRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    usernameInput.value = data.displayName || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.music || "";
    profilePhotoPreview.src = data.photoURL || "";
    renderFriends(data.topFriends || []);
  } else {
    // Create new document if missing
    await setDoc(userDocRef, { displayName: "", location: "", bio: "", music: "", photoURL: "", topFriends: [] });
  }
});

// -----------------------------
// Save Profile Photo
// -----------------------------
savePhotoBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user || !profilePhotoInput.files[0]) return;

  const file = profilePhotoInput.files[0];
  let contentType = file.type;
  if (!contentType) {
    const ext = file.name.split(".").pop().toLowerCase();
    if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
  }

  const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
  try {
    const snapshot = await uploadBytes(storageRef, file, { contentType });
    const photoURL = await getDownloadURL(snapshot.ref);

    // Save photoURL to Firestore
    const userDocRef = doc(db, "users", user.uid);
    await updateDoc(userDocRef, { photoURL });

    profilePhotoPreview.src = photoURL;
    alert("Profile photo saved!");
  } catch (err) {
    console.error("Error uploading photo:", err);
    alert("Failed to save profile photo");
  }
});

// -----------------------------
// Save Profile Info
// -----------------------------
saveInfoBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = doc(db, "users", user.uid);
  try {
    await updateDoc(userDocRef, {
      displayName: usernameInput.value,
      location: locationInput.value,
      bio: bioInput.value,
      music: musicInput.value
    });
    alert("Profile info saved!");
  } catch (err) {
    console.error("Error saving info:", err);
    alert("Failed to save profile info");
  }
});

// -----------------------------
// Render Top 10 Friends
// -----------------------------
function renderFriends(friends) {
  friendsContainer.innerHTML = "";
  friends.forEach(friend => {
    const div = document.createElement("div");
    div.textContent = friend.displayName || "Unknown";
    friendsContainer.appendChild(div);
  });
}
