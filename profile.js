// profile.js – Exact from userProfile.js with live progress bar for pfp upload

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// NAVIGATION
document.getElementById("homeBtn").onclick = () => window.location.href = "feed.html";
document.getElementById("profileBtn").onclick = () => window.location.href = "profile.html"; // Self-reference
document.getElementById("logoutBtn").onclick = async () => {
  await auth.signOut();
  window.location.href = "index.html";
};

// AUTH STATE
let currentUser;
onAuthStateChanged(auth, user => {
  if (!user) window.location.href = "index.html";
  else {
    currentUser = user;
    loadProfile();
  }
});

// PROFILE ELEMENTS
const profilePic = document.getElementById("profilePic");
const profilePicInput = document.getElementById("profilePicInput");
const displayNameEl = document.getElementById("displayName");
const locationEl = document.getElementById("location");
const bioEl = document.getElementById("bio");

const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const musicInput = document.getElementById("musicInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const saveMusicBtn = document.getElementById("saveMusicBtn");

const topFriendsContainer = document.getElementById("topFriendsContainer");
const addTopFriendInput = document.getElementById("addTopFriendInput");
const addTopFriendBtn = document.getElementById("addTopFriendBtn");

const friendRequestsContainer = document.getElementById("friendRequestsContainer");

const commentsContainer = document.getElementById("commentsContainer");
const commentInput = document.getElementById("commentInput");
const addCommentBtn = document.getElementById("addCommentBtn");

const musicPlayerContainer = document.getElementById("musicPlayerContainer");

// LOAD PROFILE DATA
async function loadProfile() {
  const uid = currentUser.uid;
  const userDoc = await getDoc(doc(db, "users", uid));
  if (!userDoc.exists()) return;

  const data = userDoc.data();

  // Display saved info
  displayNameEl.textContent = data.displayName || data.username || "Anonymous";
  locationEl.textContent = data.location || "";
  bioEl.textContent = data.bio || "";
  if (data.photoURL || data.profilePic) profilePic.src = data.photoURL || data.profilePic;

  // Top friends
  topFriendsContainer.innerHTML = "";
  (data.topFriends || []).forEach(friend => {
    const div = document.createElement("div");
    div.textContent = friend;
    topFriendsContainer.appendChild(div);
  });

  // Friend requests
  friendRequestsContainer.innerHTML = "";
  (data.friendRequests || []).forEach(req => {
    const div = document.createElement("div");
    div.textContent = req;
    friendRequestsContainer.appendChild(div);
  });

  // Music
  if (data.music) {
    musicPlayerContainer.innerHTML = getEmbeddedPlayerHTML(data.music);
  }
}

// SAVE PROFILE
saveProfileBtn.onclick = async () => {
  await updateDoc(doc(db, "users", currentUser.uid), {
    bio: bioInput.value || bioEl.textContent,
    location: locationInput.value || locationEl.textContent
  }, { merge: true });
  loadProfile();
};

// SAVE MUSIC
saveMusicBtn.onclick = async () => {
  const musicLink = musicInput.value;
  await updateDoc(doc(db, "users", currentUser.uid), { music: musicLink }, { merge: true });
  loadProfile();
};

// UPDATE PROFILE PICTURE WITH PROGRESS BAR
saveProfilePfpBtn.onclick = async () => {
  const file = profilePicInput.files[0];
  if (!file) return alert("Please select an image");

  // Progress bar popup
  const progressDiv = document.createElement("div");
  progressDiv.style = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.2); z-index: 1000; text-align: center;";
  progressDiv.innerHTML = `
    <p>Uploading...</p>
    <progress id="uploadProgress" value="0" max="100" style="width: 200px;"></progress>
    <p id="uploadPercent">0%</p>
  `;
  document.body.appendChild(progressDiv);

  const progressBar = document.getElementById("uploadProgress");
  const percentText = document.getElementById("uploadPercent");

  try {
    const storageRef = ref(storage, `profilePictures/${currentUser.uid}/${file.name}-${Date.now()}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on("state_changed", (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      progressBar.value = progress;
      percentText.textContent = Math.round(progress) + "%";
    });

    await uploadTask;

    const url = await getDownloadURL(uploadTask.snapshot.ref);

    await updateDoc(doc(db, "users", currentUser.uid), { photoURL: url, profilePic: url }, { merge: true });

    alert("Profile picture updated!");
    loadProfile();
  } catch (err) {
    alert("Upload failed: " + err.message);
  } finally {
    progressDiv.remove();
  }
};

// ADD TOP FRIEND
addTopFriendBtn.onclick = async () => {
  const newFriend = addTopFriendInput.value.trim();
  if (!newFriend) return;
  await updateDoc(doc(db, "users", currentUser.uid), {
    topFriends: arrayUnion(newFriend)
  }, { merge: true });
  addTopFriendInput.value = "";
  loadProfile();
};

// COMMENTS WALL
addCommentBtn.onclick = async () => {
  const commentText = commentInput.value.trim();
  if (!commentText) return;
  const commentObj = { text: commentText, username: currentUser.displayName || "Anonymous", createdAt: new Date() };
  await updateDoc(doc(db, "users", currentUser.uid), { comments: arrayUnion(commentObj) }, { merge: true });
  commentInput.value = "";
  loadProfile();
};

// EMBEDDED MUSIC HELPER
function getEmbeddedPlayerHTML(url) {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const idMatch = url.match(/(?:v=|\.be\/)([\w-]+)/);
    if (!idMatch) return "";
    return `<iframe width="300" height="80" src="https://www.youtube.com/embed/${idMatch[1]}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  }
  return `<p><a href="${url}" target="_blank">${url}</a></p>`;
}
