// profile.js ── Debug version: waits for auth, alerts on every step, loads bio/location/pfp/music, pfp upload with progress, wall comments subcollection

import { auth, db, storage } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  collection,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// DOM Elements (match your HTML IDs)
const profilePfp = document.getElementById("profilePfp");
const profilePfpInput = document.getElementById("profilePfpInput");
const saveProfilePfpBtn = document.getElementById("saveProfilePfpBtn");

const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const musicLinkInput = document.getElementById("musicLinkInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicIframe = document.getElementById("musicIframe");

const wallCommentsContainer = document.getElementById("wallCommentsContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const addWallCommentBtn = document.getElementById("addWallCommentBtn");

// Navigation
document.getElementById("navFeedBtn")?.addEventListener("click", () => window.location.href = "feed.html");
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

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

// Real-time listeners with alerts
let unsubscribeProfile = null;
let unsubscribeComments = null;

function startListeners(user) {
  alert("Starting Firebase listeners for UID: " + user.uid);

  if (unsubscribeProfile) unsubscribeProfile();
  if (unsubscribeComments) unsubscribeComments();

  const userRef = doc(db, "users", user.uid);

  unsubscribeProfile = onSnapshot(userRef, (snap) => {
    if (!snap.exists()) {
      alert("No profile document found for UID " + user.uid + " – creating default.");
      updateDoc(userRef, {
        username: user.email.split("@")[0],
        bio: "",
        location: "",
        photoURL: "",
        music: "",
        theme: "default-theme"
      }, { merge: true });
      return;
    }

    const data = snap.data();

    alert("Profile data loaded! Bio: " + (data.bio || "none") + ", Location: " + (data.location || "none") + ", photoURL: " + (data.photoURL || "none"));

    profilePfp.src = cacheBust(data.photoURL || data.profilePic || '');

    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";

    if (data.music) {
      musicLinkInput.value = data.music;
      musicIframe.src = getYouTubeEmbedUrl(data.music);
    }
  }, (err) => {
    alert("Profile listener error: " + err.message + "\nLikely permissions or document not found.");
  });

  const commentsQ = query(collection(db, "users", user.uid, "wallComments"), orderBy("createdAt", "desc"));

  unsubscribeComments = onSnapshot(commentsQ, (snap) => {
    alert("Wall comments loaded – " + snap.size + " comments");

    wallCommentsContainer.innerHTML = "";

    if (snap.empty) {
      wallCommentsContainer.innerHTML = '<p style="color:#888; font-style:italic;">No comments yet...</p>';
      return;
    }

    snap.forEach((docSnap) => {
      const c = docSnap.data();
      const commentId = docSnap.id;

      const div = document.createElement("div");
      div.className = "wall-comment";
      const time = c.createdAt ? new Date(c.createdAt.toMillis()).toLocaleString() : "just now";

      div.innerHTML = `
        <strong>${c.username || "Anonymous"}</strong>
        <small>${time}</small>
        <p>${c.text}</p>
        <button class="delete-comment" data-id="${commentId}">Delete</button>
      `;

      const deleteBtn = div.querySelector(".delete-comment");
      deleteBtn.onclick = async () => {
        if (confirm("Delete this comment?")) {
          await deleteDoc(doc(db, "users", user.uid, "wallComments", commentId));
        }
      };

      wallCommentsContainer.appendChild(div);
    });
  }, (err) => {
    alert("Wall comments listener error: " + err.message);
  });
}

// ── Profile Picture Upload with Progress Bar ─────────────────────────────────
saveProfilePfpBtn.addEventListener("click", async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert("Please select an image first");

  alert("File selected: " + file.name + " (" + (file.size / 1024 / 1024).toFixed(2) + " MB)");

  if (!auth.currentUser) {
    alert("Not authenticated yet – wait a moment and try again.");
    return;
  }

  alert("Authenticated as UID: " + auth.currentUser.uid);

  // Progress bar popup
  const progressDiv = document.createElement("div");
  progressDiv.style = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.2); z-index: 1000; text-align: center; min-width: 250px;";
  progressDiv.innerHTML = `
    <p>Uploading...</p>
    <progress id="uploadProgress" value="0" max="100" style="width: 100%; height: 20px; border-radius: 10px;"></progress>
    <p id="uploadPercent" style="margin-top: 10px; font-size: 1.2rem; color: #007bff;">0%</p>
  `;
  document.body.appendChild(progressDiv);

  const progressBar = document.getElementById("uploadProgress");
  const percentText = document.getElementById("uploadPercent");

  try {
    alert("Creating storage reference...");

    const path = `profilePictures/${auth.currentUser.uid}/${file.name}-${Date.now()}`;
    const storageRef = ref(storage, path);

    alert("Storage ref created: " + path);

    alert("Starting upload...");

    await uploadBytes(storageRef, file);

    alert("Upload complete – getting URL...");

    const url = await getDownloadURL(storageRef);

    alert("URL received: " + url.substring(0, 100) + "...");

    alert("Saving to Firestore (photoURL)...");

    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      photoURL: url,
      profilePic: url
    }, { merge: true });

    alert("Firestore save complete!");

    profilePfp.src = url + "?cb=" + Date.now();

    alert("Success! Profile picture uploaded and saved.\nRefresh to confirm it stays.");

  } catch (err) {
    alert("UPLOAD FAILED:\nMessage: " + (err.message || "unknown") + "\nCode: " + (err.code || "none"));
  } finally {
    progressDiv.remove();
  }
});

// ── Save Bio & Location ──────────────────────────────────────────────────────
saveProfileBtn.addEventListener("click", async () => {
  if (!auth.currentUser) return alert("Not logged in");

  try {
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      bio: bioInput.value.trim(),
      location: locationInput.value.trim()
    }, { merge: true });

    alert("Bio and location saved!");
  } catch (err) {
    alert("Save failed: " + err.message);
  }
});

// ── Save Music ───────────────────────────────────────────────────────────────
saveMusicBtn.addEventListener("click", async () => {
  if (!auth.currentUser) return alert("Not logged in");

  const link = musicLinkInput.value.trim();
  if (!link) return;

  try {
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      music: link
    }, { merge: true });

    musicIframe.src = getYouTubeEmbedUrl(link);
    alert("Music saved!");
  } catch (err) {
    alert("Music save failed: " + err.message);
  }
});

// ── Add Wall Comment ─────────────────────────────────────────────────────────
addWallCommentBtn.addEventListener("click", async () => {
  if (!auth.currentUser) return alert("Not logged in");

  const text = wallCommentInput.value.trim();
  if (!text) return;

  try {
    await addDoc(collection(db, "users", auth.currentUser.uid, "wallComments"), {
      text,
      username: auth.currentUser.email.split('@')[0] || "Anonymous",
      createdAt: serverTimestamp()
    });
    wallCommentInput.value = "";
    alert("Comment posted!");
  } catch (err) {
    alert("Comment failed: " + err.message);
  }
});

// ── Init ─────────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  alert("Authenticated as: " + user.email + " – starting profile load...");
  startListeners(user);
});
