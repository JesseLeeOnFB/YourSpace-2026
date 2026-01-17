// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, updateDoc, collection, addDoc, getDocs, orderBy, query
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
const auth = getAuth(app);
const storage = getStorage(app);

// ---------------------
// DOM Elements
// ---------------------
const navFeedBtn = document.getElementById("navFeedBtn");
const navProfileBtn = document.getElementById("navProfileBtn");
const navSettingsBtn = document.getElementById("navSettingsBtn");

const profilePfp = document.getElementById("profilePfp");
const profilePfpInput = document.getElementById("profilePfpInput");
const saveProfilePfpBtn = document.getElementById("saveProfilePfpBtn");

const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");
const customHtmlInput = document.getElementById("customHtmlInput");
const saveCustomHtmlBtn = document.getElementById("saveCustomHtmlBtn");

const wallCommentInput = document.getElementById("wallCommentInput");
const addWallCommentBtn = document.getElementById("addWallCommentBtn");
const wallCommentsContainer = document.getElementById("wallCommentsContainer");

const top10FriendsContainer = document.getElementById("top10FriendsContainer");
const editTop10Btn = document.getElementById("editTop10Btn");

// ---------------------
// Navigation
// ---------------------
navFeedBtn?.addEventListener("click", () => window.location.href = "feed.html");
navProfileBtn?.addEventListener("click", () => window.location.href = "profile.html");
navSettingsBtn?.addEventListener("click", () => alert("Settings coming soon!"));

// LOGOUT BUTTON
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// ---------------------
// Helpers
// ---------------------
async function getUsername(userId) {
  try {
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() && snap.data().username ? snap.data().username : "Anonymous";
  } catch {
    return "Anonymous";
  }
}

// ---------------------
// Profile Loading
// ---------------------
async function loadProfile(userId) {
  const userSnap = await getDoc(doc(db, "users", userId));
  if (!userSnap.exists()) return;

  const data = userSnap.data();

  // Load basic info
  usernameInput.value = data.username || "";
  bioInput.value = data.bio || "";
  locationInput.value = data.location || "";

  // Load pfp
  profilePfp.src = data.pfpURL || "default-avatar.png";

  // Load theme
  document.body.className = data.theme || "default-theme";
  if (themeSelect) themeSelect.value = data.theme || "default-theme";

  // Load custom HTML/CSS for full page
  loadCustomHtml(data);

  // Load wall comments
  loadWallComments(userId);

  // Load top 10 friends
  loadTop10Friends(data);
}

// ---------------------
// Custom HTML/CSS
// ---------------------
async function loadCustomHtml(userData) {
  const htmlCode = userData.customHtml || "";
  if (!htmlCode) return;

  const existingStyle = document.getElementById("customProfileStyle");
  if (existingStyle) existingStyle.remove();

  const styleTag = document.createElement("style");
  styleTag.id = "customProfileStyle";
  styleTag.innerHTML = htmlCode; // can contain body{}, div{}, animation, etc.
  document.head.appendChild(styleTag);
}

saveCustomHtmlBtn?.addEventListener("click", async () => {
  const htmlCode = customHtmlInput.value;

  const existingStyle = document.getElementById("customProfileStyle");
  if (existingStyle) existingStyle.remove();

  const styleTag = document.createElement("style");
  styleTag.id = "customProfileStyle";
  styleTag.innerHTML = htmlCode;
  document.head.appendChild(styleTag);

  await updateDoc(doc(db, "users", auth.currentUser.uid), { customHtml: htmlCode });
});

// ---------------------
// Save Profile Info
// ---------------------
saveProfileBtn?.addEventListener("click", async () => {
  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    username: usernameInput.value.trim(),
    bio: bioInput.value.trim(),
    location: locationInput.value.trim()
  });
  alert("Profile info saved!");
});

// ---------------------
// Save Profile Picture
// ---------------------
saveProfilePfpBtn?.addEventListener("click", async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert("Select a file first");

  const storageRef = ref(storage, `pfps/${auth.currentUser.uid}_${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  profilePfp.src = url;
  await updateDoc(doc(db, "users", auth.currentUser.uid), { pfpURL: url });
  alert("Profile picture updated!");
});

// ---------------------
// Save Theme
// ---------------------
saveThemeBtn?.addEventListener("click", async () => {
  const theme = themeSelect.value;
  document.body.className = theme;
  await updateDoc(doc(db, "users", auth.currentUser.uid), { theme });
});

// ---------------------
// Wall Comments
// ---------------------
async function loadWallComments(profileId) {
  wallCommentsContainer.innerHTML = "";
  const q = query(collection(db, "users", profileId, "wallComments"), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  snap.forEach(async cSnap => {
    const data = cSnap.data();
    const username = await getUsername(data.userId);
    const div = document.createElement("div");
    div.className = "wall-comment";
    div.innerHTML = `
      <b>${username}:</b> ${data.text}
      ${data.userId === auth.currentUser.uid ? `<button class="delete-wall-comment">Delete</button>` : ""}
    `;
    div.querySelector(".delete-wall-comment")?.addEventListener("click", async () => {
      await deleteDoc(doc(db, "users", profileId, "wallComments", cSnap.id));
      div.remove();
    });
    wallCommentsContainer.appendChild(div);
  });
}

addWallCommentBtn?.addEventListener("click", async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;
  await addDoc(collection(db, "users", auth.currentUser.uid, "wallComments"), {
    userId: auth.currentUser.uid,
    text,
    createdAt: new Date()
  });
  wallCommentInput.value = "";
  loadWallComments(auth.currentUser.uid);
});

// ---------------------
// Top 10 Friends
// ---------------------
function loadTop10Friends(userData) {
  const friends = userData.top10Friends || [];
  top10FriendsContainer.innerHTML = "";
  friends.forEach(f => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `<img src="${f.pfpURL || 'default-avatar.png'}" width="30" height="30" style="border-radius:50%;"> ${f.username || 'Unknown'}`;
    top10FriendsContainer.appendChild(div);
  });
}

// ---------------------
// Auth State
// ---------------------
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    loadProfile(user.uid);
  }
});
