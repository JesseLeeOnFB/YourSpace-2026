// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, updateDoc, collection, addDoc, getDocs, deleteDoc, orderBy, query
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
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
const pfpImg = document.getElementById("pfpImg");
const pfpInput = document.getElementById("pfpInput");
const savePfpBtn = document.getElementById("savePfpBtn");

const bioTextarea = document.getElementById("bioTextarea");
const saveBioBtn = document.getElementById("saveBioBtn");

const wallContainer = document.getElementById("wallContainer");
const wallInput = document.getElementById("wallInput");
const postWallBtn = document.getElementById("postWallBtn");

const musicInput = document.getElementById("musicInput");
const musicBtn = document.getElementById("musicBtn");
const musicIframeContainer = document.getElementById("musicIframeContainer");

const navFeedBtn = document.getElementById("feedNavBtn");
const navProfileBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ---------------------
// Navigation
// ---------------------
navFeedBtn?.addEventListener("click", () => window.location.href = "feed.html");
navProfileBtn?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// ---------------------
// Helper Functions
// ---------------------
async function loadProfile(userId) {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return;
  const data = snap.data();

  // Profile Picture
  if (data.pfpURL) pfpImg.src = data.pfpURL;
  else pfpImg.src = "default-avatar.png";

  // Bio
  bioTextarea.value = data.bio || "This is the bio lol";

  // Load Wall
  await loadWall(userId);

  // Load Music
  if (data.musicLink) embedMusic(data.musicLink);
}

async function loadWall(userId) {
  wallContainer.innerHTML = "";
  const wallSnap = await getDocs(query(collection(db, "users", userId, "wall"), orderBy("createdAt","asc")));
  wallSnap.forEach(docSnap => {
    const comment = docSnap.data();
    const div = document.createElement("div");
    div.className = "wall-comment";
    div.innerHTML = `<strong>${comment.username || 'Anonymous'}:</strong> ${comment.text}
                     ${(comment.userId === auth.currentUser.uid || userId === auth.currentUser.uid) ? '<button class="deleteWallBtn">Delete</button>' : ''}`;

    // Delete comment
    div.querySelector(".deleteWallBtn")?.addEventListener("click", async () => {
      await deleteDoc(doc(db,"users",userId,"wall",docSnap.id));
      loadWall(userId);
    });

    wallContainer.appendChild(div);
  });
}

function embedMusic(link) {
  let embedUrl = "";
  if(link.includes("youtube.com") || link.includes("youtu.be")){
    const videoId = link.includes("youtu.be") ? link.split("/").pop().split("?")[0] : link.split("v=")[1].split("&")[0];
    embedUrl = `https://www.youtube.com/embed/${videoId}`;
  } else if(link.includes("spotify.com")){
    embedUrl = link.replace("https://open.spotify.com/","https://open.spotify.com/embed/");
  } else if(link.includes("soundcloud.com")){
    embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(link)}`;
  } else {
    embedUrl = link; // fallback raw link
  }
  musicIframeContainer.innerHTML = `<iframe src="${embedUrl}" width="100%" height="200" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
}

// ---------------------
// Auth & Load
// ---------------------
onAuthStateChanged(auth, async user => {
  if(!user) { window.location.href="login.html"; return; }
  await loadProfile(user.uid);
});

// ---------------------
// Event Listeners
// ---------------------

// Save PFP
savePfpBtn?.addEventListener("click", async () => {
  const file = pfpInput.files[0];
  if (!file) return alert("No file selected");

  const storageRef = ref(storage, `pfp/${auth.currentUser.uid}_${Date.now()}_${file.name}`);
  await uploadBytes(storageRef,file);
  const url = await getDownloadURL(storageRef);

  await updateDoc(doc(db,"users",auth.currentUser.uid), { pfpURL: url });
  pfpImg.src = url;
  alert("Profile picture updated!");
});

// Save Bio
saveBioBtn?.addEventListener("click", async () => {
  const bio = bioTextarea.value.trim();
  await updateDoc(doc(db,"users",auth.currentUser.uid), { bio });
  alert("Bio updated!");
});

// Post on Wall
postWallBtn?.addEventListener("click", async () => {
  const text = wallInput.value.trim();
  if(!text) return;
  const userSnap = await getDoc(doc(db,"users",auth.currentUser.uid));
  const username = userSnap.exists() ? userSnap.data().username : "Anonymous";

  await addDoc(collection(db,"users",auth.currentUser.uid,"wall"),{
    text,
    userId: auth.currentUser.uid,
    username,
    createdAt: new Date()
  });
  wallInput.value = "";
  await loadWall(auth.currentUser.uid);
});

// Add Music
musicBtn?.addEventListener("click", async () => {
  const link = musicInput.value.trim();
  if(!link) return;
  await updateDoc(doc(db,"users",auth.currentUser.uid), { musicLink: link });
  embedMusic(link);
});
