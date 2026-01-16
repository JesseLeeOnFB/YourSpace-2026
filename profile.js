import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
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

// AUTH STATE
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userDocRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDocRef);

  // Initialize user data
  if (userSnap.exists()) {
    const data = userSnap.data();
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    profilePfp.src = data.pfpURL || "default-avatar.png";

    // Top friends
    topFriendsContainer.innerHTML = "";
    (data.topFriends || []).forEach(friend => {
      const div = document.createElement("div");
      div.textContent = friend;
      topFriendsContainer.appendChild(div);
    });

    // Wall comments
    commentContainer.innerHTML = "";
    (data.wallComments || []).forEach(c => {
      const div = document.createElement("div");
      div.textContent = `${c.user}: ${c.text}`;
      commentContainer.appendChild(div);
    });

    // Music
    if (data.musicURL) {
      musicPlayerContainer.innerHTML = getEmbeddedMusicHTML(data.musicURL);
    }
  }

  // SAVE PROFILE INFO
  saveProfileBtn.addEventListener("click", async () => {
    try {
      await updateDoc(userDocRef, {
        username: usernameInput.value,
        bio: bioInput.value,
        location: locationInput.value
      });
      alert("Profile updated!");
    } catch (err) {
      console.error("Failed to save profile info:", err);
      alert("Failed to save profile info");
    }
  });

  // PFP UPLOAD
  profilePfpInput.addEventListener("change", async () => {
    const file = profilePfpInput.files[0];
    if (!file) return;

    const storageRef = ref(storage, `pfp/${user.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    profilePfp.src = url;

    await updateDoc(userDocRef, { pfpURL: url });
  });

  // ADD TOP FRIEND
  addTopFriendBtn.addEventListener("click", async () => {
    const friend = topFriendInput.value.trim();
    if (!friend) return;

    const currentData = (userSnap.data() || {});
    const currentFriends = currentData.topFriends || [];
    if (currentFriends.length >= 10) return alert("Top 10 limit reached.");

    const newFriends = [...currentFriends, friend];
    await updateDoc(userDocRef, { topFriends: newFriends });

    topFriendInput.value = "";
    const div = document.createElement("div");
    div.textContent = friend;
    topFriendsContainer.appendChild(div);
  });

  // WALL COMMENTS
  postWallCommentBtn.addEventListener("click", async () => {
    const text = wallCommentInput.value.trim();
    if (!text) return;

    const currentData = (userSnap.data() || {});
    const currentComments = currentData.wallComments || [];
    const newComments = [...currentComments, { user: user.email.split("@")[0], text }];

    await updateDoc(userDocRef, { wallComments: newComments });

    const div = document.createElement("div");
    div.textContent = `${user.email.split("@")[0]}: ${text}`;
    commentContainer.appendChild(div);
    wallCommentInput.value = "";
  });

  // MUSIC PLAYER
  saveMusicBtn.addEventListener("click", async () => {
    const url = musicInput.value.trim();
    if (!url) return;
    await updateDoc(userDocRef, { musicURL: url });
    musicPlayerContainer.innerHTML = getEmbeddedMusicHTML(url);
  });
});

// HELPER: convert music links to embed
function getEmbeddedMusicHTML(url) {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const videoId = url.split("v=")[1]?.split("&")[0] || url.split("/").pop();
    return `<iframe width="100%" height="166" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
  }
  if (url.includes("soundcloud.com")) {
    return `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
      src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}"></iframe>`;
  }
  if (url.includes("spotify.com")) {
    return `<iframe src="https://open.spotify.com/embed/track/${url.split("/").pop()}" width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
  }
  return "";
}
