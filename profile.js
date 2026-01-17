// ---------------------
// Profile.js
// ---------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, updateDoc, collection, addDoc, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// ---------------------
// Firebase Config
// ---------------------
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// ---------------------
// DOM Elements
// ---------------------
const profilePicture = document.getElementById("profilePicture");
const profilePicInput = document.getElementById("profilePicInput");
const savePfpBtn = document.getElementById("savePfpBtn");

const bioText = document.getElementById("bioText");
const saveBioBtn = document.getElementById("saveBioBtn");

const wallContainer = document.getElementById("wallContainer");
const wallInput = document.getElementById("wallInput");
const postWallBtn = document.getElementById("postWallBtn");

const navFeedBtn = document.getElementById("feedNavBtn");
const navProfileBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ---------------------
// Navigation
// ---------------------
navFeedBtn?.addEventListener("click", () => window.location.href = "feed.html");
navProfileBtn?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// ---------------------
// Helpers
// ---------------------
async function getUserDoc(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

// ---------------------
// Profile Picture
// ---------------------
savePfpBtn?.addEventListener("click", async () => {
  const file = profilePicInput.files[0];
  if (!file) return alert("Select an image first");

  try {
    const storageRef = ref(storage, `profilePics/${auth.currentUser.uid}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await updateDoc(doc(db, "users", auth.currentUser.uid), { pfpURL: url });
    profilePicture.src = url;
    alert("Profile picture updated!");
  } catch (err) {
    console.error(err);
    alert("Error updating profile picture: " + err.message);
  }
});

// ---------------------
// Bio
// ---------------------
saveBioBtn?.addEventListener("click", async () => {
  const text = bioText.value.trim();
  try {
    await updateDoc(doc(db, "users", auth.currentUser.uid), { bio: text });
    alert("Bio updated!");
  } catch (err) {
    console.error(err);
    alert("Error updating bio: " + err.message);
  }
});

// ---------------------
// Wall
// ---------------------
async function loadWall() {
  wallContainer.innerHTML = "";
  const wallSnap = await getDocs(query(collection(db, "wall"), orderBy("createdAt", "asc")));
  wallSnap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "wall-comment";
    div.textContent = `${data.username || "Anonymous"}: ${data.text}`;
    wallContainer.appendChild(div);
  });
}

postWallBtn?.addEventListener("click", async () => {
  const text = wallInput.value.trim();
  if (!text) return alert("Write something first!");

  try {
    const userData = await getUserDoc(auth.currentUser.uid);
    await addDoc(collection(db, "wall"), {
      userId: auth.currentUser.uid,
      username: userData?.username || "Anonymous",
      text,
      createdAt: new Date()
    });
    wallInput.value = "";
    loadWall();
  } catch (err) {
    console.error(err);
    alert("Error posting on wall: " + err.message);
  }
});

// ---------------------
// Auth State
// ---------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    const userData = await getUserDoc(user.uid);
    if (userData?.pfpURL) profilePicture.src = userData.pfpURL;
    if (userData?.bio) bioText.value = userData.bio;

    loadWall();
  }
});
