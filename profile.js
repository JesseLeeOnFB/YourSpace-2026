import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

// INITIALIZE FIREBASE
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// NAVIGATION
document.addEventListener("DOMContentLoaded", () => {
  const homeBtn = document.getElementById("homeBtn");
  const profileBtn = document.getElementById("profileBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (homeBtn) homeBtn.addEventListener("click", () => window.location.href = "feed.html");
  if (profileBtn) profileBtn.addEventListener("click", () => window.location.href = "profile.html");
  if (logoutBtn) logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "index.html";
    } catch (err) {
      console.error(err);
      alert("Logout failed.");
    }
  });
});

// AUTH STATE
let currentUser = null;
onAuthStateChanged(auth, user => {
  if (!user) return window.location.href = "index.html";
  currentUser = user;
  loadProfile();
});

// ELEMENTS
const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");
const locationInput = document.getElementById("location");
const profilePic = document.getElementById("profilePic");
const profilePicInput = document.getElementById("profilePicInput");
const saveProfilePicBtn = document.getElementById("saveProfilePicBtn");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const musicLinkInput = document.getElementById("musicLink");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicPlayerContainer = document.getElementById("musicPlayerContainer");
const topFriendsInput = document.getElementById("topFriends");
const saveTopFriendsBtn = document.getElementById("saveTopFriendsBtn");
const commentInput = document.getElementById("commentInput");
const postCommentBtn = document.getElementById("postCommentBtn");
const commentsContainer = document.getElementById("commentsContainer");

// LOAD PROFILE DATA
async function loadProfile() {
  const userDocRef = doc(db, "users", currentUser.uid);
  const userSnap = await getDoc(userDocRef);
  if (!userSnap.exists()) return;

  const data = userSnap.data();
  displayNameInput.value = data.displayName || "";
  bioInput.value = data.bio || "";
  locationInput.value = data.location || "";
  musicLinkInput.value = data.music || "";
  topFriendsInput.value = (data.topFriends || []).join(", ");

  if (data.profilePic) profilePic.src = data.profilePic;

  if (data.music) updateMusicPlayer(data.music);
}

// SAVE PROFILE INFO
saveProfileBtn.addEventListener("click", async () => {
  const userDocRef = doc(db, "users", currentUser.uid);
  try {
    await updateDoc(userDocRef, {
      displayName: displayNameInput.value,
      bio: bioInput.value,
      location: locationInput.value
    });
    alert("Profile info saved!");
  } catch (err) {
    console.error(err);
    alert("Failed to save profile info.");
  }
});

// PROFILE PIC UPLOAD
saveProfilePicBtn.addEventListener("click", async () => {
  if (!profilePicInput.files[0]) return alert("Select a profile picture first.");
  const file = profilePicInput.files[0];
  const storageRef = ref(storage, `profileImages/${currentUser.uid}/${Date.now()}-${file.name}`);
  try {
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    await updateDoc(doc(db, "users", currentUser.uid), { profilePic: url });
    profilePic.src = url;
    alert("Profile picture updated!");
  } catch (err) {
    console.error(err);
    alert("Failed to upload profile picture.");
  }
});

// SAVE MUSIC LINK
saveMusicBtn.addEventListener("click", () => {
  const link = musicLinkInput.value;
  if (!link) return alert("Enter a music link");
  updateMusicPlayer(link);
  updateDoc(doc(db, "users", currentUser.uid), { music: link }).catch(console.error);
});

function updateMusicPlayer(link) {
  let embed = "";
  if (link.includes("youtube.com") || link.includes("youtu.be")) {
    embed = `<iframe width="100%" height="80" src="${link.replace("watch?v=", "embed/")}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  }
  musicPlayerContainer.innerHTML = embed;
}

// SAVE TOP FRIENDS
saveTopFriendsBtn.addEventListener("click", async () => {
  const friends = topFriendsInput.value.split(",").map(f => f.trim()).filter(f => f);
  try {
    await updateDoc(doc(db, "users", currentUser.uid), { topFriends: friends });
    alert("Top friends saved!");
  } catch (err) {
    console.error(err);
    alert("Failed to save top friends.");
  }
});

// WALL COMMENTS
postCommentBtn.addEventListener("click", async () => {
  const text = commentInput.value.trim();
  if (!text) return;
  const commentObj = { text, userId: currentUser.uid, timestamp: new Date() };
  try {
    const userDocRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userDocRef);
    const comments = userSnap.data().comments || [];
    comments.push(commentObj);
    await updateDoc(userDocRef, { comments });
    commentInput.value = "";
    loadComments(comments);
  } catch (err) {
    console.error(err);
    alert("Failed to post comment.");
  }
});

function loadComments(comments) {
  commentsContainer.innerHTML = "";
  comments.forEach(c => {
    const div = document.createElement("div");
    div.className = "comment card";
    div.innerHTML = `<strong>${c.userId}</strong>: ${c.text}`;
    commentsContainer.appendChild(div);
  });
}
