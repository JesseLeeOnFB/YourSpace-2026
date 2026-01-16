// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// DOM Elements
const usernameEl = document.getElementById("username");
const bioEl = document.getElementById("bio");
const locationEl = document.getElementById("location");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const pfpInput = document.getElementById("pfpInput");
const savePfpBtn = document.getElementById("savePfpBtn");
const profileImgEl = document.getElementById("profileImg");

const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");

const topFriendsInput = document.getElementById("topFriendsInput");
const saveTopFriendsBtn = document.getElementById("saveTopFriendsBtn");
const topFriendsList = document.getElementById("topFriendsList");

const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const wallCommentsContainer = document.getElementById("wallCommentsContainer");

// Ensure user is logged in
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userRef = doc(db, "users", user.uid);

  // Load user profile data
  const docSnap = await getDoc(userRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    usernameEl.value = data.username || "";
    bioEl.value = data.bio || "";
    locationEl.value = data.location || "";
    profileImgEl.src = data.pfpURL || "default-pfp.png";
    musicInput.value = data.musicLink || "";

    // Load top friends
    topFriendsList.innerHTML = "";
    if (data.topFriends && data.topFriends.length) {
      data.topFriends.forEach(friend => {
        const li = document.createElement("li");
        li.textContent = friend;
        topFriendsList.appendChild(li);
      });
    }
  }

  // Real-time wall comments
  onSnapshot(userRef, (snap) => {
    const data = snap.data();
    wallCommentsContainer.innerHTML = "";
    if (data.wallComments && data.wallComments.length) {
      data.wallComments.forEach(comment => {
        const div = document.createElement("div");
        div.className = "wall-comment";
        div.innerHTML = `<strong>${comment.user}</strong>: ${comment.text}`;
        wallCommentsContainer.appendChild(div);
      });
    }
  });
});

// SAVE PROFILE INFO
saveProfileBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  const userRef = doc(db, "users", user.uid);
  try {
    await updateDoc(userRef, {
      username: usernameEl.value,
      bio: bioEl.value,
      location: locationEl.value
    });
    alert("Profile info saved!");
  } catch (err) {
    console.error(err);
    alert("Failed to save profile info.");
  }
});

// SAVE PROFILE PICTURE
savePfpBtn.addEventListener("click", async () => {
  const file = pfpInput.files[0];
  if (!file) return alert("Select a profile picture first.");

  const user = auth.currentUser;
  const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
  try {
    await uploadBytes(storageRef, file);
    const pfpURL = await getDownloadURL(storageRef);

    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { pfpURL });
    profileImgEl.src = pfpURL;
    alert("Profile picture updated!");
  } catch (err) {
    console.error(err);
    alert("Failed to update profile picture.");
  }
});

// SAVE MUSIC LINK
saveMusicBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  const userRef = doc(db, "users", user.uid);
  try {
    await updateDoc(userRef, { musicLink: musicInput.value });
    alert("Music link saved!");
  } catch (err) {
    console.error(err);
    alert("Failed to save music link.");
  }
});

// SAVE TOP FRIENDS
saveTopFriendsBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  const friends = topFriendsInput.value.split(",").map(f => f.trim()).filter(f => f);
  const userRef = doc(db, "users", user.uid);
  try {
    await updateDoc(userRef, { topFriends: friends });
    topFriendsList.innerHTML = "";
    friends.forEach(friend => {
      const li = document.createElement("li");
      li.textContent = friend;
      topFriendsList.appendChild(li);
    });
    alert("Top friends updated!");
  } catch (err) {
    console.error(err);
    alert("Failed to update top friends.");
  }
});

// POST WALL COMMENT
postWallCommentBtn.addEventListener("click", async () => {
  const commentText = wallCommentInput.value.trim();
  if (!commentText) return;

  const user = auth.currentUser;
  const userRef = doc(db, "users", user.uid);

  try {
    await updateDoc(userRef, {
      wallComments: arrayUnion({ user: user.email.split("@")[0], text: commentText })
    });
    wallCommentInput.value = "";
  } catch (err) {
    console.error(err);
    alert("Failed to post comment.");
  }
});
