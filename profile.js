// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// --- Firebase config ---
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

// DOM elements
const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const profilePhotoPreview = document.getElementById("profilePhotoPreview");
const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");
const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");
const topFriendsList = document.getElementById("topFriendsList");
const addFriendInput = document.getElementById("addFriendInput");
const addFriendBtn = document.getElementById("addFriendBtn");
const customHTMLInput = document.getElementById("customHTMLInput");
const saveCustomHTMLBtn = document.getElementById("saveCustomHTMLBtn");

// Helper function to render Top 10 friends
function renderFriends(friendsArray) {
  topFriendsList.innerHTML = "";
  if (!Array.isArray(friendsArray)) friendsArray = [];
  friendsArray.forEach(friend => {
    const li = document.createElement("li");
    li.textContent = friend;
    topFriendsList.appendChild(li);
  });
}

// --- Auth state ---
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userDocRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDocRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    usernameInput.value = data.username || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.music || "";
    customHTMLInput.value = data.customHTML || "";
    renderFriends(data.topFriends || []);
    if (data.profilePhoto) profilePhotoPreview.src = data.profilePhoto;
  } else {
    await setDoc(userDocRef, { topFriends: [] }); // initialize
  }
});

// --- Save profile info ---
saveProfileInfoBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = doc(db, "users", user.uid);
  await updateDoc(userDocRef, {
    username: usernameInput.value,
    location: locationInput.value,
    bio: bioInput.value,
    music: musicInput.value
  });

  alert("Profile info saved!");
});

// --- Save profile photo ---
saveProfilePhotoBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  const file = profilePhotoInput.files[0];
  if (!file) return alert("Please select a photo.");

  let contentType = file.type || "image/jpeg";
  const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);

  try {
    const snapshot = await uploadBytes(storageRef, file, { contentType });
    const downloadURL = await getDownloadURL(snapshot.ref);

    const userDocRef = doc(db, "users", user.uid);
    await updateDoc(userDocRef, { profilePhoto: downloadURL });
    profilePhotoPreview.src = downloadURL;
    alert("Profile photo saved!");
  } catch(err) {
    console.error(err);
    alert("Failed to upload profile photo.");
  }
});

// --- Top 10 friends ---
addFriendBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  const friendName = addFriendInput.value.trim();
  if (!friendName) return;

  const userDocRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDocRef);
  const currentFriends = userSnap.data().topFriends || [];
  if (currentFriends.length >= 10) return alert("Top 10 friends limit reached.");
  if (currentFriends.includes(friendName)) return alert("Friend already added.");

  currentFriends.push(friendName);
  await updateDoc(userDocRef, { topFriends: currentFriends });
  renderFriends(currentFriends);
  addFriendInput.value = "";
});

// --- Save custom HTML ---
saveCustomHTMLBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = doc(db, "users", user.uid);
  await updateDoc(userDocRef, { customHTML: customHTMLInput.value });
  alert("Custom HTML saved!");
});
