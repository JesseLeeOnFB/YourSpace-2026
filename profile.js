// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, deleteDoc, query, orderBy
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
const profilePfp = document.getElementById("profilePfp");
const profileBio = document.getElementById("profileBio");
const wallContainer = document.getElementById("wallContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const wallCommentBtn = document.getElementById("wallCommentBtn");
const top10Container = document.getElementById("top10FriendsContainer");
const themeSelect = document.getElementById("themeSelect");
const musicInput = document.getElementById("musicInput");
const musicIframe = document.getElementById("musicIframe");
const logoutBtn = document.getElementById("logoutBtn");

// ---------------------
// Navigation
// ---------------------
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// ---------------------
// Helpers
// ---------------------
async function getUserData(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

async function getUsername(uid) {
  const data = await getUserData(uid);
  return data?.username || "Anonymous";
}

// ---------------------
// Load Profile Info
// ---------------------
async function loadProfile(uid) {
  const data = await getUserData(uid);
  if (!data) return;

  // PFP
  profilePfp.src = data.pfpURL || "default-avatar.png";

  // Bio
  profileBio.value = data.bio || "";

  // Theme
  if (data.theme) {
    document.body.className = data.theme + "-theme";
    themeSelect.value = data.theme;
  }

  // Music
  if (data.musicURL) {
    musicIframe.src = data.musicURL;
    musicInput.value = data.musicURL;
  }
}

// ---------------------
// Save Profile Changes
// ---------------------
profileBio?.addEventListener("change", async () => {
  const uid = auth.currentUser.uid;
  await updateDoc(doc(db, "users", uid), { bio: profileBio.value });
});

themeSelect?.addEventListener("change", async () => {
  const theme = themeSelect.value;
  document.body.className = theme + "-theme";
  await updateDoc(doc(db, "users", auth.currentUser.uid), { theme });
});

musicInput?.addEventListener("change", async () => {
  const url = musicInput.value.trim();
  musicIframe.src = url;
  await updateDoc(doc(db, "users", auth.currentUser.uid), { musicURL: url });
});

// ---------------------
// Top 10 Friends
// ---------------------
async function loadTop10Friends(uid) {
  top10Container.innerHTML = "";
  const data = await getUserData(uid);
  if (!data) return;

  const friends = data.top10Friends || [];
  friends.forEach(f => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `
      <img src="${f.pfpURL || "default-avatar.png"}" width="30" height="30" style="border-radius:50%;">
      ${f.username || "Unknown"}
    `;
    top10Container.appendChild(div);
  });
}

// ---------------------
// Wall Comments
// ---------------------
async function renderWallComments(uid) {
  wallContainer.innerHTML = "";
  const commentsSnap = await getDocs(query(collection(db, "users", uid, "wallComments"), orderBy("createdAt", "asc")));
  commentsSnap.forEach(async cSnap => {
    const data = cSnap.data();
    const username = await getUsername(data.userId);

    const div = document.createElement("div");
    div.className = "wall-comment";
    div.innerHTML = `
      <span>${username}: ${data.text}</span>
      ${(data.userId === auth.currentUser.uid || uid === auth.currentUser.uid) ? `<button class="delete-comment">X</button>` : ""}
    `;
    // Delete comment
    div.querySelector(".delete-comment")?.addEventListener("click", async () => {
      await deleteDoc(doc(db, "users", uid, "wallComments", cSnap.id));
      renderWallComments(uid);
    });

    wallContainer.appendChild(div);
  });
}

// ---------------------
// Add Wall Comment
// ---------------------
wallCommentBtn?.addEventListener("click", async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;

  const uid = window.location.search.split("uid=")[1] || auth.currentUser.uid;
  await addDoc(collection(db, "users", uid, "wallComments"), {
    userId: auth.currentUser.uid,
    text,
    createdAt: new Date()
  });

  wallCommentInput.value = "";
  renderWallComments(uid);
});

// ---------------------
// Auth State
// ---------------------
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const profileUid = window.location.search.split("uid=")[1] || user.uid;
  await loadProfile(profileUid);
  await loadTop10Friends(profileUid);
  await renderWallComments(profileUid);
});
