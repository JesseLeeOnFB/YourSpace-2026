import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

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
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// NAVIGATION
document.getElementById("homeBtn").onclick = () => window.location.href = "feed.html";
document.getElementById("profileBtn").onclick = () => window.location.href = "userProfile.html";
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
  displayNameEl.textContent = data.displayName || "Anonymous";
  locationEl.textContent = data.location || "";
  bioEl.textContent = data.bio || "";
  if (data.profilePic) profilePic.src = data.profilePic;

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
  if (data.music) musicPlayerContainer.innerHTML = getEmbeddedPlayerHTML(data.music);
}

// SAVE PROFILE
saveProfileBtn.onclick = async () => {
  await updateDoc(doc(db, "users", currentUser.uid), {
    bio: bioInput.value || bioEl.textContent,
    location: locationInput.value || locationEl.textContent
  });
  loadProfile();
};

// SAVE MUSIC
saveMusicBtn.onclick = async () => {
  const musicLink = musicInput.value;
  await updateDoc(doc(db, "users", currentUser.uid), { music: musicLink });
  loadProfile();
};

// UPDATE PROFILE PICTURE
profilePicInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const storageRef = ref(storage, `profileImages/${currentUser.uid}/${file.name}-${Date.now()}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db, "users", currentUser.uid), { profilePic: url });
  loadProfile();
});

// ADD TOP FRIEND
addTopFriendBtn.onclick = async () => {
  const newFriend = addTopFriendInput.value.trim();
  if (!newFriend) return;
  // In real system, check for accepted friend status first
  await updateDoc(doc(db, "users", currentUser.uid), {
    topFriends: arrayUnion(newFriend)
  });
  addTopFriendInput.value = "";
  loadProfile();
};

// COMMENTS WALL
addCommentBtn.onclick = async () => {
  const commentText = commentInput.value.trim();
  if (!commentText) return;
  const commentObj = { text: commentText, username: currentUser.displayName || "Anonymous", createdAt: new Date() };
  await updateDoc(doc(db, "users", currentUser.uid), { comments: arrayUnion(commentObj) });
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
  // Add SoundCloud/Spotify/Pandora parsing here if needed
  return `<p><a href="${url}" target="_blank">${url}</a></p>`;
}
