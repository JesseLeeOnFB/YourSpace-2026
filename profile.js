// profile.js ── Fixed to load data like userProfile.html (initial fetch + real-time), pfp upload with progress bar, wall comments subcollection

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
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// DOM Elements (match userProfile.html IDs)
const profilePfp = document.getElementById("profilePfp");
const profilePfpInput = document.getElementById("profilePfpInput");
const saveProfilePfpBtn = document.getElementById("saveProfilePfpBtn");

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

// Cache buster
function cacheBust(url) {
  return url ? `${url}?v=${Date.now()}` : "https://via.placeholder.com/150?text=Default";
}

// Embedded music helper
function getEmbeddedPlayerHTML(url) {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const idMatch = url.match(/(?:v=|youtu\.be\/)([\w-]+)/);
    if (!idMatch) return "";
    return `<iframe width="300" height="80" src="https://www.youtube.com/embed/${idMatch[1]}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  }
  return `<p><a href="${url}" target="_blank">${url}</a></p>`;
}

// Initial load + real-time
let unsubscribeProfile = null;
let unsubscribeComments = null;

async function loadProfile(user) {
  const userRef = doc(db, "users", user.uid);

  // Initial fetch (like userProfile.js)
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const data = snap.data();

    profilePfp.src = cacheBust(data.photoURL || data.profilePic || '');

    displayNameEl.textContent = data.displayName || data.username || "Anonymous";
    locationEl.textContent = data.location || "";
    bioEl.textContent = data.bio || "";

    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";

    if (data.music) {
      musicInput.value = data.music;
      musicPlayerContainer.innerHTML = getEmbeddedPlayerHTML(data.music);
    }

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
  }

  // Real-time for updates
  unsubscribeProfile = onSnapshot(userRef, (snap) => {
    if (!snap.exists()) return;

    const data = snap.data();

    profilePfp.src = cacheBust(data.photoURL || data.profilePic || '');

    displayNameEl.textContent = data.displayName || data.username || "Anonymous";
    locationEl.textContent = data.location || "";
    bioEl.textContent = data.bio || "";

    if (data.music) {
      musicPlayerContainer.innerHTML = getEmbeddedPlayerHTML(data.music);
    }
  });

  // Wall comments subcollection real-time
  const commentsQ = query(collection(db, "users", user.uid, "wallComments"), orderBy("createdAt", "desc"));

  unsubscribeComments = onSnapshot(commentsQ, (snap) => {
    commentsContainer.innerHTML = "";

    if (snap.empty) {
      commentsContainer.innerHTML = '<p>No comments yet...</p>';
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

      commentsContainer.appendChild(div);
    });
  });
}

// ── Profile Picture Upload with Progress Bar ─────────────────────────────────
saveProfilePfpBtn.addEventListener("click", async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert("Please select an image first");

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
    const storageRef = ref(storage, `profilePictures/${auth.currentUser.uid}/${file.name}-${Date.now()}`);
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

    alert("Success!");
    loadProfile(auth.currentUser);
  } catch (err) {
    alert("Failed: " + err.message);
  } finally {
    progressDiv.remove();
  }
});

// ── Save Profile ─────────────────────────────────────────────────────────────
saveProfileBtn.addEventListener("click", async () => {
  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    bio: bioInput.value.trim(),
    location: locationInput.value.trim()
  }, { merge: true });

  alert("Saved!");
  loadProfile(auth.currentUser);
});

// ── Save Music ───────────────────────────────────────────────────────────────
saveMusicBtn.addEventListener("click", async () => {
  const musicLink = musicInput.value.trim();
  if (!musicLink) return;

  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    music: musicLink
  }, { merge: true });

  musicPlayerContainer.innerHTML = getEmbeddedPlayerHTML(musicLink);
  alert("Music saved!");
});

// ── Add Top Friend ───────────────────────────────────────────────────────────
addTopFriendBtn.addEventListener("click", async () => {
  const newFriend = addTopFriendInput.value.trim();
  if (!newFriend) return;

  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    topFriends: arrayUnion(newFriend)
  }, { merge: true });

  addTopFriendInput.value = "";
  alert("Friend added!");
  loadProfile(auth.currentUser);
});

// ── Add Wall Comment ─────────────────────────────────────────────────────────
addCommentBtn.addEventListener("click", async () => {
  const text = commentInput.value.trim();
  if (!text) return;

  await addDoc(collection(db, "users", auth.currentUser.uid, "wallComments"), {
    text,
    username: auth.currentUser.email.split('@')[0] || "Anonymous",
    createdAt: serverTimestamp()
  });
  commentInput.value = "";
  loadProfile(auth.currentUser);
});

// ── Init ─────────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  loadProfile(user);
});
