// profile.js
import { auth, db, storage } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// DOM Elements
const profilePic = document.getElementById("profilePic");
const pfpInput = document.getElementById("pfpInput");
const savePfpBtn = document.getElementById("savePfpBtn");
const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");
const locationInput = document.getElementById("location");
const musicInput = document.getElementById("music");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");
const topFriendsContainer = document.getElementById("topFriendsContainer");
const addTopFriendInput = document.getElementById("addTopFriendInput");
const addTopFriendBtn = document.getElementById("addTopFriendBtn");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const wallCommentsContainer = document.getElementById("wallCommentsContainer");

// NAV BUTTONS
document.getElementById("homeBtn").addEventListener("click", () => window.location.href="feed.html");
document.getElementById("profileBtn").addEventListener("click", () => window.location.href="profile.html");
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try { await auth.signOut(); window.location.href="index.html"; } 
  catch (err) { console.error(err); alert("Logout failed"); }
});

// Load Profile
async function loadProfile() {
  if (!auth.currentUser) return alert("You must be signed in.");
  const uid = auth.currentUser.uid;
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    displayNameInput.value = data.displayName || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    musicInput.value = data.music || "";
    themeSelect.value = data.theme || "";
    profilePic.src = data.profilePic || "default-pfp.png";

    // Top friends
    topFriendsContainer.innerHTML = "";
    (data.topFriends || []).forEach(f => {
      const fEl = document.createElement("p");
      fEl.textContent = f;
      topFriendsContainer.appendChild(fEl);
    });

    // Wall comments
    wallCommentsContainer.innerHTML = "";
    (data.wallComments || []).forEach(c => {
      const cEl = document.createElement("p");
      cEl.textContent = `${c.username}: ${c.text}`;
      wallCommentsContainer.appendChild(cEl);
    });
  }
}

// Save Profile Info
saveProfileBtn.addEventListener("click", async () => {
  const uid = auth.currentUser.uid;
  const docRef = doc(db, "users", uid);
  await setDoc(docRef, {
    displayName: displayNameInput.value,
    bio: bioInput.value,
    location: locationInput.value,
    music: musicInput.value
  }, { merge: true });
  alert("Profile saved!");
});

// Save Theme
saveThemeBtn.addEventListener("click", async () => {
  const uid = auth.currentUser.uid;
  const docRef = doc(db, "users", uid);
  await updateDoc(docRef, { theme: themeSelect.value });
  alert("Theme saved!");
});

// Upload Profile Picture
savePfpBtn.addEventListener("click", async () => {
  const uid = auth.currentUser.uid;
  const file = pfpInput.files[0];
  if (!file) return alert("Select a photo first!");
  const fileRef = ref(storage, `profileImages/${uid}/${file.name}-${Date.now()}`);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);
  profilePic.src = url;
  await updateDoc(doc(db, "users", uid), { profilePic: url });
  alert("Profile picture updated!");
});

// Add Top Friend
addTopFriendBtn.addEventListener("click", async () => {
  const friendUsername = addTopFriendInput.value.trim();
  if (!friendUsername) return;
  const uid = auth.currentUser.uid;
  const userRef = doc(db, "users", uid);
  const docSnap = await getDoc(userRef);
  const currentTop = docSnap.data().topFriends || [];
  if (!currentTop.includes(friendUsername) && currentTop.length < 10) {
    currentTop.push(friendUsername);
    await updateDoc(userRef, { topFriends: currentTop });
    addTopFriendInput.value = "";
    loadProfile();
  } else {
    alert("Friend already added or top 10 reached.");
  }
});

// Post Wall Comment
postWallCommentBtn.addEventListener("click", async () => {
  const comment = wallCommentInput.value.trim();
  if (!comment) return;
  const uid = auth.currentUser.uid;
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  const wallComments = docSnap.data().wallComments || [];
  wallComments.push({ username: auth.currentUser.displayName || "Anonymous", text: comment, createdAt: serverTimestamp() });
  await updateDoc(docRef, { wallComments });
  wallCommentInput.value = "";
  loadProfile();
});

// Initial load
auth.onAuthStateChanged(user => {
  if (user) loadProfile();
});
