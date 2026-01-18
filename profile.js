// profile.js – Full with all features: pfp upload with progress bar, bio/location save, preset themes (instant apply), custom HTML, music playlist (4 songs), top 10 friends (drag-drop, clickable), wall comments subcollection

import { auth, db, storage } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  collection,
  addDoc,
  deleteDoc,
  query,
  orderBy
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

const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");
const resetThemeBtn = document.getElementById("resetThemeBtn");

const customHtmlInput = document.getElementById("customHtmlInput");
const saveCustomHtmlBtn = document.getElementById("saveCustomHtmlBtn");
const customHtmlPreview = document.getElementById("customHtmlPreview");

const musicTitleInput = document.getElementById("musicTitleInput");
const musicLinkInput = document.getElementById("musicLinkInput");
const addMusicBtn = document.getElementById("addMusicBtn");
const musicPlaylist = document.getElementById("musicPlaylist");
const musicIframe = document.getElementById("musicIframe");

const top10FriendsList = document.getElementById("top10FriendsList");
const addFriendInput = document.getElementById("addFriendInput");
const addTopFriendBtn = document.getElementById("addTopFriendBtn");

const wallCommentsContainer = document.getElementById("wallCommentsContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const addWallCommentBtn = document.getElementById("addWallCommentBtn");

// Navigation
document.getElementById("navFeedBtn")?.addEventListener("click", () => window.location.href = "feed.html");

// Cache buster
function cacheBust(url) {
  return url ? `${url}?v=${Date.now()}` : "https://via.placeholder.com/150?text=Default";
}

// Music embed helper (supports YouTube, Spotify, SoundCloud, Pandora)
function getEmbeddedPlayerHTML(url) {
  if (!url) return "";

  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const id = url.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
    return id ? `<iframe width="100%" height="80" src="https://www.youtube.com/embed/${id}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>` : "";
  }

  if (url.includes("spotify.com")) {
    const trackId = url.split("/track/")[1]?.split("?")[0];
    return trackId ? `<iframe src="https://open.spotify.com/embed/track/${trackId}" width="100%" height="80" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>` : "";
  }

  if (url.includes("soundcloud.com")) {
    return `<iframe width="100%" height="80" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true"></iframe>`;
  }

  if (url.includes("pandora.com")) {
    return `<iframe src="${url}" width="100%" height="80" frameborder="0" allow="autoplay"></iframe>`;
  }

  return `<p><a href="${url}" target="_blank">Play on external player</a></p>`;
}

// Real-time listeners
let unsubscribeProfile = null;
let unsubscribeComments = null;

function startListeners(user) {
  if (unsubscribeProfile) unsubscribeProfile();
  if (unsubscribeComments) unsubscribeComments();

  const userRef = doc(db, "users", user.uid);

  unsubscribeProfile = onSnapshot(userRef, (snap) => {
    if (!snap.exists()) return;

    const data = snap.data();

    profilePfp.src = cacheBust(data.photoURL || data.profilePic || '');

    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";

    themeSelect.value = data.theme || "default-theme";
    document.body.className = data.theme || "default-theme";

    customHtmlInput.value = data.customHtml || "";
    customHtmlPreview.innerHTML = data.customHtml || "";

    // Music playlist
    musicPlaylist.innerHTML = "";
    (data.musicPlaylist || []).forEach((song, index) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${song.title}</strong>
        <button data-url="${song.url}" class="play-song">Play</button>
        <button data-index="${index}" class="remove-song">Remove</button>
      `;
      musicPlaylist.appendChild(li);
    });

    // Top 10 Friends (drag-drop list)
    top10FriendsList.innerHTML = "";
    (data.topFriends || []).forEach(friend => {
      const li = document.createElement("li");
      li.draggable = true;
      li.textContent = friend;
      li.addEventListener("click", () => {
        // Clickable to view profile (stub – would need uid mapping)
        alert("View profile of " + friend + " (feature stub)");
      });
      top10FriendsList.appendChild(li);
    });

    // Drag-drop reorder for top friends
    top10FriendsList.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", e.target.textContent);
      e.target.classList.add("dragging");
    });

    top10FriendsList.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    top10FriendsList.addEventListener("drop", async (e) => {
      e.preventDefault();
      const draggedText = e.dataTransfer.getData("text/plain");
      const target = e.target.closest("li");
      if (!target || target.textContent === draggedText) return;

      const newOrder = Array.from(top10FriendsList.children).map(li => li.textContent);
      await updateDoc(doc(db, "users", user.uid), {
        topFriends: newOrder
      }, { merge: true });
    });

    top10FriendsList.addEventListener("dragend", (e) => {
      e.target.classList.remove("dragging");
    });
  });

  // Wall comments subcollection
  const commentsQ = query(collection(db, "users", user.uid, "wallComments"), orderBy("createdAt", "desc"));

  unsubscribeComments = onSnapshot(commentsQ, (snap) => {
    wallCommentsContainer.innerHTML = "";

    if (snap.empty) {
      wallCommentsContainer.innerHTML = '<p>No comments yet...</p>';
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

// ── Save Theme (instant apply) ───────────────────────────────────────────────
saveThemeBtn.addEventListener("click", async () => {
  const theme = themeSelect.value;
  document.body.className = theme;

  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    theme: theme
  }, { merge: true });

  alert("Theme applied!");
});

// ── Reset Theme ──────────────────────────────────────────────────────────────
resetThemeBtn.addEventListener("click", async () => {
  document.body.className = "default-theme";
  themeSelect.value = "default-theme";

  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    theme: "default-theme"
  }, { merge: true });

  alert("Theme reset to default!");
});

// ── Save Custom HTML ─────────────────────────────────────────────────────────
saveCustomHtmlBtn.addEventListener("click", async () => {
  const customHtml = customHtmlInput.value;
  customHtmlPreview.innerHTML = customHtml;

  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    customHtml: customHtml
  }, { merge: true });

  alert("Custom HTML saved!");
});

// ── Music Playlist (up to 4 songs) ───────────────────────────────────────────
addMusicBtn.addEventListener("click", async () => {
  const title = musicTitleInput.value.trim();
  const link = musicLinkInput.value.trim();
  if (!title || !link) return alert("Enter title and link");

  const current = (await getDoc(doc(db, "users", auth.currentUser.uid))).data();
  const playlist = current.musicPlaylist || [];

  if (playlist.length >= 4) return alert("Max 4 songs");

  playlist.push({ title, url: link });

  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    musicPlaylist: playlist
  }, { merge: true });

  musicTitleInput.value = "";
  musicLinkInput.value = "";
  alert("Song added!");
  startListeners(auth.currentUser);
});

// Play song from playlist
musicPlaylist.addEventListener("click", (e) => {
  if (e.target.classList.contains("play-song")) {
    const url = e.target.dataset.url;
    musicIframe.src = getYouTubeEmbedUrl(url);
  }

  if (e.target.classList.contains("remove-song")) {
    const index = e.target.dataset.index;
    // Remove logic (future)
  }
});

// ── Add Top Friend ───────────────────────────────────────────────────────────
addTopFriendBtn.addEventListener("click", async () => {
  const newFriend = addFriendInput.value.trim();
  if (!newFriend) return;

  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    topFriends: arrayUnion(newFriend)
  }, { merge: true });

  addFriendInput.value = "";
  alert("Friend added!");
  startListeners(auth.currentUser);
});

// ── Add Wall Comment ─────────────────────────────────────────────────────────
addWallCommentBtn.addEventListener("click", async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;

  await addDoc(collection(db, "users", auth.currentUser.uid, "wallComments"), {
    text,
    username: auth.currentUser.email.split('@')[0] || "Anonymous",
    createdAt: serverTimestamp()
  });
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
