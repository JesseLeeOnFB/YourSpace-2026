// profile.js ── Rewritten for modular SDK, progress bar, data loading, wall comments array

import { auth, db, storage } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// DOM Elements
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
const customHtmlPreview = document.getElementById("customHtmlPreview");

const musicLinkInput = document.getElementById("musicLinkInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicIframe = document.getElementById("musicIframe");

const wallCommentsContainer = document.getElementById("wallCommentsContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const addWallCommentBtn = document.getElementById("addWallCommentBtn");

const top10FriendsContainer = document.getElementById("top10FriendsContainer");

// Cache buster
function cacheBust(url) {
  return url ? `${url}?v=${Date.now()}` : "https://via.placeholder.com/150?text=Default";
}

// Music embed helper
function getYouTubeEmbedUrl(url) {
  if (!url) return "";
  const id = url.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : "";
}

// Real-time listener
let unsubscribe = null;

function startListener(user) {
  if (unsubscribe) unsubscribe();

  const userRef = doc(db, "users", user.uid);

  unsubscribe = onSnapshot(userRef, (snap) => {
    if (!snap.exists()) {
      console.log("No profile document");
      return;
    }

    const data = snap.data();

    // Profile picture
    profilePfp.src = cacheBust(data.photoURL || data.profilePic || '');

    // Basic info
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";

    // Theme
    if (data.theme) {
      document.body.className = data.theme;
      themeSelect.value = data.theme;
    }

    // Custom HTML
    customHtmlInput.value = data.customHtml || "";
    customHtmlPreview.innerHTML = data.customHtml || "";

    // Music
    if (data.music) {
      musicLinkInput.value = data.music;
      musicIframe.src = getYouTubeEmbedUrl(data.music);
    }

    // Top 10 Friends
    top10FriendsContainer.innerHTML = "";
    (data.topFriends || []).forEach(friend => {
      const div = document.createElement("div");
      div.className = "top-friend";
      div.textContent = typeof friend === "string" ? friend : friend.username || "Unknown";
      top10FriendsContainer.appendChild(div);
    });

    // Wall comments (array)
    wallCommentsContainer.innerHTML = "";
    (data.wallComments || []).forEach(c => {
      const div = document.createElement("div");
      div.className = "wall-comment";
      const time = c.createdAt ? new Date(c.createdAt.toMillis()).toLocaleString() : "just now";
      div.innerHTML = `
        <strong>${c.username || "Anonymous"}</strong>
        <small>${time}</small>
        <p>${c.text}</p>
      `;
      wallCommentsContainer.appendChild(div);
    });
  }, (err) => {
    alert("Data load error: " + err.message);
  });
}

// ── Profile Picture Upload with Live Progress Bar ─────────────────────────────────
saveProfilePfpBtn.addEventListener("click", async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert("Select an image");

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
    const path = `profilePictures/${auth.currentUser.uid}/${file.name}-${Date.now()}`;
    const storageRef = ref(storage, path);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on("state_changed", (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      progressBar.value = progress;
      percentText.textContent = Math.round(progress) + "%";
    });

    await uploadTask;

    const url = await getDownloadURL(uploadTask.snapshot.ref);

    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      photoURL: url,
      profilePic: url
    }, { merge: true });

    alert("Success! Refresh to see.");
    startListeners(auth.currentUser);
  } catch (err) {
    alert("Failed: " + err.message);
  } finally {
    progressDiv.remove();
  }
});

// ── Save Bio & Location ──────────────────────────────────────────────────────
saveProfileBtn.addEventListener("click", async () => {
  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    bio: bioInput.value.trim(),
    location: locationInput.value.trim()
  }, { merge: true });

  alert("Saved!");
});

// ── Save Theme ───────────────────────────────────────────────────────────────
saveThemeBtn.addEventListener("click", async () => {
  const theme = themeSelect.value;
  document.body.className = theme;

  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    theme: theme
  }, { merge: true });

  alert("Theme saved!");
});

// ── Save Music ───────────────────────────────────────────────────────────────
saveMusicBtn.addEventListener("click", async () => {
  const link = musicLinkInput.value.trim();
  if (!link) return;

  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    music: link
  }, { merge: true });

  musicIframe.src = getYouTubeEmbedUrl(link);
  alert("Music saved!");
});

// ── Add Wall Comment ─────────────────────────────────────────────────────────
addWallCommentBtn.addEventListener("click", async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;

  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    wallComments: arrayUnion({
      text,
      username: auth.currentUser.email.split('@')[0] || "Anonymous",
      createdAt: serverTimestamp()
    })
  }, { merge: true });

  wallCommentInput.value = "";
});

// ── Init ─────────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  startListeners(user);
});
