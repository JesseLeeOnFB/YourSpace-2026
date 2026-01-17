// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// ---------------------
// Firebase Config
// ---------------------
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// ---------------------
// DOM Elements
// ---------------------
const profilePic = document.getElementById("profilePic");
const profilePicInput = document.getElementById("profilePicInput");
const bioInput = document.getElementById("bioInput");
const bioSaveBtn = document.getElementById("bioSaveBtn");
const bioDisplay = document.getElementById("bioDisplay");

const wallInput = document.getElementById("wallInput");
const wallPostBtn = document.getElementById("wallPostBtn");
const wallContainer = document.getElementById("wallContainer");

const musicInput = document.getElementById("musicInput");
const musicAddBtn = document.getElementById("musicAddBtn");
const musicContainer = document.getElementById("musicContainer");

const themeSelect = document.getElementById("themeSelect");
const customHtmlInput = document.getElementById("customHtmlInput");
const customHtmlSaveBtn = document.getElementById("customHtmlSaveBtn");
const customHtmlContainer = document.getElementById("customHtmlContainer");

const navFeedBtn = document.getElementById("feedNavBtn");
const navProfileBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ---------------------
// Navigation Buttons
// ---------------------
navFeedBtn?.addEventListener("click", () => window.location.href = "feed.html");
navProfileBtn?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "login.html";
});

// ---------------------
// Helpers
// ---------------------
async function loadUserProfile(userId) {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return;

  const data = snap.data();

  // Bio
  bioDisplay.textContent = data.bio || "This is the bio lol";
  bioInput.value = data.bio || "";

  // Profile picture
  if (data.pfpURL) profilePic.src = data.pfpURL;

  // Wall posts
  loadWallPosts(userId);

  // Music
  if (data.musicLinks) renderMusic(data.musicLinks);

  // Theme
  if (data.theme) {
    document.body.setAttribute("data-theme", data.theme);
    themeSelect.value = data.theme;
  }

  // Custom HTML
  if (data.customHtml) {
    customHtmlContainer.innerHTML = data.customHtml;
    customHtmlInput.value = data.customHtml;
  }
}

async function loadWallPosts(userId) {
  wallContainer.innerHTML = "";
  const wallSnap = await getDocs(query(collection(db, "users", userId, "wall"), orderBy("createdAt", "asc")));
  wallSnap.forEach(async docSnap => {
    const data = docSnap.data();
    const postDiv = document.createElement("div");
    postDiv.className = "wall-post";
    postDiv.innerHTML = `<strong>${data.username}:</strong> ${data.text}`;
    wallContainer.appendChild(postDiv);
  });
}

function renderMusic(links) {
  musicContainer.innerHTML = "";
  links.forEach(link => {
    let embedHTML = "";
    if (link.includes("youtube.com") || link.includes("youtu.be")) {
      const videoId = link.split("v=")[1] || link.split("/").pop();
      embedHTML = `<iframe width="300" height="169" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
    } else if (link.includes("spotify.com")) {
      embedHTML = `<iframe src="https://open.spotify.com/embed/${link.split(".com/")[1]}" width="300" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
    } else if (link.includes("soundcloud.com")) {
      embedHTML = `<iframe width="300" height="80" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=${link}"></iframe>`;
    } else {
      embedHTML = `<a href="${link}" target="_blank">${link}</a>`;
    }
    const div = document.createElement("div");
    div.className = "music-item";
    div.innerHTML = embedHTML;
    musicContainer.appendChild(div);
  });
}

// ---------------------
// Event Listeners
// ---------------------
bioSaveBtn?.addEventListener("click", async () => {
  const bio = bioInput.value.trim();
  await setDoc(doc(db, "users", auth.currentUser.uid), { bio }, { merge: true });
  bioDisplay.textContent = bio;
});

profilePicInput?.addEventListener("change", async () => {
  const file = profilePicInput.files[0];
  if (!file) return;

  const storageRef = ref(storage, `pfp/${auth.currentUser.uid}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  profilePic.src = url;

  await setDoc(doc(db, "users", auth.currentUser.uid), { pfpURL: url }, { merge: true });
});

wallPostBtn?.addEventListener("click", async () => {
  const text = wallInput.value.trim();
  if (!text) return;

  const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  const username = userSnap.exists() ? userSnap.data().username : "Anonymous";

  await addDoc(collection(db, "users", auth.currentUser.uid, "wall"), {
    text,
    username,
    createdAt: new Date()
  });

  wallInput.value = "";
  loadWallPosts(auth.currentUser.uid);
});

musicAddBtn?.addEventListener("click", async () => {
  const link = musicInput.value.trim();
  if (!link) return;

  const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
  const musicLinks = snap.exists() && snap.data().musicLinks ? snap.data().musicLinks : [];
  musicLinks.push(link);

  await setDoc(doc(db, "users", auth.currentUser.uid), { musicLinks }, { merge: true });
  renderMusic(musicLinks);
  musicInput.value = "";
});

themeSelect?.addEventListener("change", async () => {
  const theme = themeSelect.value;
  document.body.setAttribute("data-theme", theme);
  await setDoc(doc(db, "users", auth.currentUser.uid), { theme }, { merge: true });
});

customHtmlSaveBtn?.addEventListener("click", async () => {
  const html = customHtmlInput.value;
  customHtmlContainer.innerHTML = html;
  await setDoc(doc(db, "users", auth.currentUser.uid), { customHtml: html }, { merge: true });
});

// ---------------------
// Auth State
// ---------------------
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    loadUserProfile(user.uid);
  }
});
