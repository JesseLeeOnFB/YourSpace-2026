import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, query, collection, where, getDocs, arrayUnion } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// Firebase config
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

// DOM elements
const profilePfp = document.getElementById("profilePfp");
const profilePfpInput = document.getElementById("profilePfpInput");
const saveProfilePfpBtn = document.getElementById("saveProfilePfpBtn");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const topFriendInput = document.getElementById("topFriendInput");
const addTopFriendBtn = document.getElementById("addTopFriendBtn");
const topFriendsContainer = document.querySelector(".top-friends-container");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const commentContainer = document.getElementById("commentContainer");
const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicPlayerContainer = document.getElementById("musicPlayerContainer");
const friendPreview = document.getElementById("friendPreview");

const feedBtn = document.getElementById("feedBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

// NAVIGATION
feedBtn.addEventListener("click", () => window.location.href = "feed.html");
profileBtn.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn.addEventListener("click", () => signOut(auth));

// AUTH & LOAD PROFILE
auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userDocRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDocRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    profilePfp.src = data.pfpURL || "default-avatar.png";

    // Top Friends
    topFriendsContainer.innerHTML = "";
    (data.topFriends || []).forEach(friend => {
      const div = document.createElement("div");
      div.textContent = friend.username || friend;
      topFriendsContainer.appendChild(div);
    });

    // Wall Comments
    commentContainer.innerHTML = "";
    (data.wallComments || []).forEach(c => {
      const div = document.createElement("div");
      div.textContent = `${c.username}: ${c.text}`;
      commentContainer.appendChild(div);
    });

    // Music
    if (data.musicURL) musicPlayerContainer.innerHTML = getEmbeddedMusicHTML(data.musicURL);
  }
});

// SAVE PROFILE INFO
saveProfileBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  const userDocRef = doc(db, "users", user.uid);
  try {
    await updateDoc(userDocRef, {
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value
    });
    alert("Profile updated!");
  } catch(e) {
    alert("Failed to save profile info");
    console.error(e);
  }
});

// SAVE PROFILE PICTURE
saveProfilePfpBtn.addEventListener("click", async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert("Please select a profile picture first");
  const user = auth.currentUser;
  const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
  try {
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    profilePfp.src = url;
    await updateDoc(doc(db, "users", user.uid), { pfpURL: url });
    alert("Profile picture updated!");
  } catch(e) {
    alert("Failed to upload profile picture");
    console.error(e);
  }
});

// WALL COMMENTS
postWallCommentBtn.addEventListener("click", async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;
  const user = auth.currentUser;
  const userSnap = await getDoc(doc(db, "users", user.uid));
  const username = userSnap.data().username || user.email.split("@")[0];
  const newComments = [...(userSnap.data().wallComments || []), { username, text }];
  await updateDoc(doc(db, "users", user.uid), { wallComments: newComments });
  const div = document.createElement("div");
  div.textContent = `${username}: ${text}`;
  commentContainer.appendChild(div);
  wallCommentInput.value = "";
});

// MUSIC PLAYER
saveMusicBtn.addEventListener("click", () => {
  const url = musicInput.value.trim();
  if (!url) return alert("Enter a valid URL");
  musicPlayerContainer.innerHTML = getEmbeddedMusicHTML(url);
  updateDoc(doc(db, "users", auth.currentUser.uid), { musicURL: url });
});

function getEmbeddedMusicHTML(url) {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const videoId = url.includes("v=") ? url.split("v=")[1].split("&")[0] : url.split("/").pop();
    return `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
  }
  if (url.includes("soundcloud.com")) {
    return `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}"></iframe>`;
  }
  if (url.includes("spotify.com")) {
    return `<iframe src="https://open.spotify.com/embed/track/${url.split("/").pop()}" width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
  }
  return `<p>Invalid music URL</p>`;
}
