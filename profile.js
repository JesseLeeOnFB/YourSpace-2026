import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Firebase Config
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

// DOM Elements
const profilePicture = document.getElementById("profilePicture");
const profilePicInput = document.getElementById("profilePicInput");
const saveProfilePicBtn = document.getElementById("saveProfilePicBtn");
const bioInput = document.getElementById("bioInput");
const saveBioBtn = document.getElementById("saveBioBtn");

const musicURLInput = document.getElementById("musicURLInput");
const addMusicBtn = document.getElementById("addMusicBtn");
const musicList = document.getElementById("musicList");
const musicPlayer = document.getElementById("musicPlayer");

const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const wallCommentsList = document.getElementById("wallCommentsList");

const top10List = document.getElementById("top10List");

const sendMessageBtn = document.getElementById("sendMessageBtn");

const feedNavBtn = document.getElementById("feedNavBtn");
const profileNavBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

// Navigation
feedNavBtn?.addEventListener("click", () => window.location.href = "feed.html");
profileNavBtn?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// Auth State
onAuthStateChanged(auth, async user => {
  if (!user) return window.location.href = "login.html";
  const uid = user.uid;

  // Load profile data
  const userSnap = await getDoc(doc(db, "users", uid));
  if (userSnap.exists()) {
    const data = userSnap.data();
    bioInput.value = data.bio || "";
    if (data.profilePicture) profilePicture.src = data.profilePicture;
  }

  // Load wall comments
  loadWallComments(uid);

  // Load music playlist
  loadMusic(uid);

  // Load Top 10 friends
  loadTop10(uid);
});

// Save Bio
saveBioBtn?.addEventListener("click", async () => {
  const uid = auth.currentUser.uid;
  await updateDoc(doc(db, "users", uid), { bio: bioInput.value });
  alert("Bio updated!");
});

// Save Profile Picture
saveProfilePicBtn?.addEventListener("click", async () => {
  const file = profilePicInput.files[0];
  if (!file) return alert("Please select a file");
  const uid = auth.currentUser.uid;
  const storageRef = ref(storage, `profilePictures/${uid}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  profilePicture.src = url;
  await updateDoc(doc(db, "users", uid), { profilePicture: url });
  alert("Profile picture updated!");
});

// Wall Comments
postWallCommentBtn?.addEventListener("click", async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;
  const uid = auth.currentUser.uid;
  await addDoc(collection(db, "users", uid, "wallComments"), {
    userId: uid,
    text,
    createdAt: new Date()
  });
  wallCommentInput.value = "";
  loadWallComments(uid);
});

async function loadWallComments(uid) {
  wallCommentsList.innerHTML = "";
  const q = query(collection(db, "users", uid, "wallComments"), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  snap.forEach(async docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    const userSnap = await getDoc(doc(db, "users", data.userId));
    const username = userSnap.exists() ? userSnap.data().username : "Unknown";
    div.innerHTML = `<strong>${username}:</strong> ${data.text}`;
    wallCommentsList.appendChild(div);
  });
}

// Music Playlist
addMusicBtn?.addEventListener("click", async () => {
  const url = musicURLInput.value.trim();
  if (!url) return;
  const uid = auth.currentUser.uid;
  await addDoc(collection(db, "users", uid, "musicPlaylist"), { url });
  musicURLInput.value = "";
  loadMusic(uid);
});

async function loadMusic(uid) {
  musicList.innerHTML = "";
  const q = query(collection(db, "users", uid, "musicPlaylist"));
  const snap = await getDocs(q);
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.textContent = data.url;
    div.style.cursor = "pointer";
    div.addEventListener("click", () => {
      // Embed YouTube player for now
      const embedUrl = data.url.replace("watch?v=", "embed/") + "?autoplay=1";
      musicPlayer.src = embedUrl;
    });
    musicList.appendChild(div);
  });
}

// Load Top 10 Friends
async function loadTop10(uid) {
  top10List.innerHTML = "";
  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) return;
  const friends = userSnap.data().top10Friends || [];
  friends.forEach(async f => {
    const div = document.createElement("div");
    const friendSnap = await getDoc(doc(db, "users", f.userId));
    const username = friendSnap.exists() ? friendSnap.data().username : "Unknown";
    const pfp = friendSnap.exists() ? friendSnap.data().profilePicture : "default-avatar.png";
    div.innerHTML = `<img src="${pfp}" width="40" height="40" style="border-radius:50%;"> <a href="profile.html?uid=${f.userId}">${username}</a>`;
    top10List.appendChild(div);
  });
}

// Send Private Message button
sendMessageBtn?.addEventListener("click", () => {
  const recipientUid = prompt("Enter the UID of the user you want to message:");
  if (!recipientUid) return;
  window.location.href = `privateMessages.html?recipient=${recipientUid}`;
});
