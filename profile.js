// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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
const profilePic = document.getElementById("profilePic");
const profilePicInput = document.getElementById("profilePicInput");
const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const topFriendsContainer = document.getElementById("topFriendsContainer");
const addFriendInput = document.getElementById("addFriendInput");
const addFriendBtn = document.getElementById("addFriendBtn");
const customHTMLInput = document.getElementById("customHTMLInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

let currentUserId = null;
let topFriends = [];

/* -------------------- Auth & Navigation -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUserId = user.uid;

  homeBtn.onclick = () => (window.location.href = "feed.html");
  profileBtn.onclick = () => (window.location.href = "profile.html");
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  await loadProfile();
});

/* -------------------- Load Profile -------------------- */
async function loadProfile() {
  const userRef = doc(db, "users", currentUserId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return;

  const data = userSnap.data();
  usernameInput.value = data.displayName || "";
  locationInput.value = data.location || "";
  bioInput.value = data.bio || "";
  customHTMLInput.value = data.customHTML || "";
  topFriends = data.topFriends || [];

  profilePic.src = data.photoURL || "default-avatar.png";

  renderTopFriends();
}

function renderTopFriends() {
  topFriendsContainer.innerHTML = "";
  topFriends.forEach((friend, idx) => {
    const div = document.createElement("div");
    div.className = "friend";
    div.innerHTML = `
      ${friend} <button data-index="${idx}" class="removeFriendBtn">Remove</button>
    `;
    topFriendsContainer.appendChild(div);
  });

  // Remove friend buttons
  const removeBtns = document.querySelectorAll(".removeFriendBtn");
  removeBtns.forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.index);
      topFriends.splice(idx, 1);
      renderTopFriends();
    };
  });
}

/* -------------------- Add Friend -------------------- */
addFriendBtn.onclick = () => {
  const friendName = addFriendInput.value.trim();
  if (!friendName) return;
  if (topFriends.length >= 10) {
    alert("Top 10 friends limit reached!");
    return;
  }
  topFriends.push(friendName);
  addFriendInput.value = "";
  renderTopFriends();
};

/* -------------------- Save Profile -------------------- */
saveProfileBtn.onclick = async () => {
  saveProfileBtn.disabled = true;
  let photoURL = profilePic.src;

  // Upload profile image if changed
  const file = profilePicInput.files[0];
  if (file) {
    try {
      const safeName = encodeURIComponent(file.name);
      const storageRef = ref(storage, `profileImages/${currentUserId}/${Date.now()}_${safeName}`);
      const snapshot = await uploadBytes(storageRef, file, { contentType: file.type || "image/jpeg" });
      photoURL = await getDownloadURL(snapshot.ref);
    } catch (err) {
      console.error("Profile pic upload failed:", err);
      alert("Failed to upload profile picture.");
      saveProfileBtn.disabled = false;
      return;
    }
  }

  // Save to Firestore
  try {
    const userRef = doc(db, "users", currentUserId);
    await setDoc(userRef, {
      displayName: usernameInput.value.trim(),
      location: locationInput.value.trim(),
      bio: bioInput.value.trim(),
      photoURL,
      topFriends,
      customHTML: customHTMLInput.value.trim()
    }, { merge: true });

    alert("Profile saved successfully!");
  } catch (err) {
    console.error("Save profile failed:", err);
    alert("Failed to save profile.");
  } finally {
    saveProfileBtn.disabled = false;
  }
};
