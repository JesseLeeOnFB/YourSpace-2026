import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, getDocs, collection, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ----------------------------
// Cache-buster helper
function cacheBuster(url) { return url + "?v=" + Date.now(); }

document.addEventListener("DOMContentLoaded", async () => {
  // DOM Elements
  const usernameInput = document.getElementById("usernameInput");
  const bioInput = document.getElementById("bioInput");
  const locationInput = document.getElementById("locationInput");
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const profilePfp = document.getElementById("profilePfp");
  const profilePfpInput = document.getElementById("profilePfpInput");
  const saveProfilePfpBtn = document.getElementById("saveProfilePfpBtn");
  const wallCommentsContainer = document.getElementById("wallCommentsContainer");
  const wallCommentInput = document.getElementById("wallCommentInput");
  const addWallCommentBtn = document.getElementById("addWallCommentBtn");
  const themeSelect = document.getElementById("themeSelect");
  const saveThemeBtn = document.getElementById("saveThemeBtn");
  const customHtmlInput = document.getElementById("customHtmlInput");
  const saveCustomHtmlBtn = document.getElementById("saveCustomHtmlBtn");
  const customHtmlContainer = document.getElementById("customHtmlContainer");
  const musicUrlInput = document.getElementById("musicUrlInput");
  const loadMusicBtn = document.getElementById("loadMusicBtn");
  const musicIframe = document.getElementById("musicIframe");
  const pauseMusicBtn = document.getElementById("pauseMusicBtn");

  // -------- Load profile
  onAuthStateChanged(auth, async user => {
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userDocRef);
    const data = docSnap.exists() ? docSnap.data() : {};

    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    if (data.pfpURL) profilePfp.src = cacheBuster(data.pfpURL);
    if (data.theme) document.body.className = data.theme;
    if (data.customHtml) customHtmlContainer.innerHTML = data.customHtml;

    // Load wall comments
    wallCommentsContainer.innerHTML = "";
    if (data.wallComments && data.wallComments.length > 0) {
      data.wallComments.forEach(comment => {
        const div = document.createElement("div");
        div.className = "wall-comment";
        div.innerHTML = `<strong>${comment.username || "Unknown"}</strong>: ${comment.text} 
          ${(user.uid === user.uid || user.uid === comment.userId) ? '<button class="deleteWallCommentBtn">Delete</button>' : ''}`;
        if (user.uid === user.uid || user.uid === comment.userId) {
          div.querySelector(".deleteWallCommentBtn").addEventListener("click", async () => {
            await updateDoc(userDocRef, { wallComments: arrayRemove(comment) });
            location.reload();
          });
        }
        wallCommentsContainer.appendChild(div);
      });
    }
  });

  // -------- Save profile info
  saveProfileBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;
    const userDocRef = doc(db, "users", user.uid);
    await updateDoc(userDocRef, {
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value
    });
    alert("Profile info updated!");
  });

  // -------- Save profile picture
  saveProfilePfpBtn.addEventListener("click", async () => {
    const file = profilePfpInput.files[0];
    if (!file) return alert("Select a picture first");
    const user = auth.currentUser;
    const storageRef = ref(storage, `profilePictures/${user.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    profilePfp.src = cacheBuster(url);
    await updateDoc(doc(db, "users", user.uid), { pfpURL: url });
  });

  // -------- Wall comments
  addWallCommentBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;
    const comment = { text: wallCommentInput.value, username: usernameInput.value, userId: user.uid };
    await updateDoc(doc(db, "users", user.uid), { wallComments: arrayUnion(comment) });
    location.reload();
  });

  // -------- Theme selection
  saveThemeBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;
    const theme = themeSelect.value;
    document.body.className = theme;
    await updateDoc(doc(db, "users", user.uid), { theme });
  });

  // -------- Custom HTML
  saveCustomHtmlBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;
    const html = customHtmlInput.value;
    customHtmlContainer.innerHTML = html;
    await updateDoc(doc(db, "users", user.uid), { customHtml: html });
  });

  // -------- Music Player
  function convertToEmbed(url) {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.split("v=")[1] || url.split("/").pop();
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    if (url.includes("soundcloud.com")) return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true`;
    if (url.includes("spotify.com")) return `https://open.spotify.com/embed/${url.split(".com/").pop()}`;
    return url;
  }
  loadMusicBtn.addEventListener("click", () => {
    const embedUrl = convertToEmbed(musicUrlInput.value);
    musicIframe.src = cacheBuster(embedUrl);
  });
  pauseMusicBtn.addEventListener("click", () => { musicIframe.src = ""; });
});
