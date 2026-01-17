// =====================
// PROFILE.JS - Full Version
// =====================

// Direct Firebase connection
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, collection, addDoc, query, orderBy, getDocs } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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

// DOM Elements
const profilePfp = document.getElementById("profilePfp");
const profilePfpInput = document.getElementById("profilePfpInput");
const saveProfilePfpBtn = document.getElementById("saveProfilePfpBtn");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const wallContainer = document.getElementById("wallContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const wallCommentBtn = document.getElementById("wallCommentBtn");
const top10FriendsContainer = document.getElementById("top10FriendsContainer");
const editTop10Btn = document.getElementById("editTop10Btn");
const musicInput = document.getElementById("musicInput");
const musicPlayBtn = document.getElementById("musicPlayBtn");
const musicPauseBtn = document.getElementById("musicPauseBtn");
const musicIframe = document.getElementById("musicIframe");
const customHtmlInput = document.getElementById("customHtmlInput");
const applyCustomHtmlBtn = document.getElementById("applyCustomHtmlBtn");
const navButtons = document.querySelectorAll(".navbar button");

// Cache buster function
function addCacheBuster(url) {
  const separator = url.includes("?") ? "&" : "?";
  return url + separator + "cb=" + Date.now();
}

// Current user object
let currentUser = null;

// =====================
// AUTH STATE
// =====================
onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  currentUser = user;
  await loadProfile();
  await loadWallComments();
  await loadTop10();
});

// =====================
// PROFILE INFO
// =====================
async function loadProfile() {
  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  if (!userDoc.exists()) return;
  const data = userDoc.data();
  usernameInput.value = data.username || "";
  bioInput.value = data.bio || "";
  locationInput.value = data.location || "";
  if (data.pfpURL) profilePfp.src = addCacheBuster(data.pfpURL);
}

saveProfileBtn.addEventListener("click", async () => {
  const userDocRef = doc(db, "users", currentUser.uid);
  await updateDoc(userDocRef, {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  alert("Profile info updated!");
});

saveProfilePfpBtn.addEventListener("click", async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert("Select a profile picture first");
  const storageRef = ref(storage, `profilePictures/${currentUser.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  profilePfp.src = addCacheBuster(url);
  const userDocRef = doc(db, "users", currentUser.uid);
  await updateDoc(userDocRef, { pfpURL: url });
});

// =====================
// WALL COMMENTS
// =====================
async function loadWallComments() {
  wallContainer.innerHTML = "";
  const q = query(collection(db, "users", currentUser.uid, "wallComments"), orderBy("timestamp"));
  const snapshot = await getDocs(q);
  snapshot.forEach(docSnap => {
    const comment = docSnap.data();
    const div = document.createElement("div");
    div.className = "wall-comment";
    const username = comment.authorName || "Unknown";
    div.innerHTML = `<strong>${username}:</strong> ${comment.text}`;
    if (comment.authorId === currentUser.uid || currentUser.uid === docSnap.ref.parent.parent.id) {
      const btn = document.createElement("button");
      btn.textContent = "Delete";
      btn.addEventListener("click", async () => {
        await docSnap.ref.delete();
        loadWallComments();
      });
      div.appendChild(btn);
    }
    wallContainer.appendChild(div);
  });
}

wallCommentBtn.addEventListener("click", async () => {
  const text = wallCommentInput.value;
  if (!text) return;
  const colRef = collection(db, "users", currentUser.uid, "wallComments");
  await addDoc(colRef, {
    text,
    authorId: currentUser.uid,
    authorName: usernameInput.value || "Unknown",
    timestamp: Date.now()
  });
  wallCommentInput.value = "";
  loadWallComments();
});

// =====================
// TOP 10 FRIENDS (Drag-and-Drop)
// =====================
async function loadTop10() {
  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  const data = userDoc.data();
  let friends = data.top10Friends || [];
  renderTop10(friends);
}

function renderTop10(friends) {
  top10FriendsContainer.innerHTML = "";
  friends.forEach((friend, index) => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.draggable = true;
    div.dataset.index = index;
    div.textContent = `${index + 1}. ${friend.username}`;
    top10FriendsContainer.appendChild(div);

    div.addEventListener("dragstart", e => {
      e.dataTransfer.setData("text/plain", index);
    });
    div.addEventListener("dragover", e => e.preventDefault());
    div.addEventListener("drop", e => {
      const fromIndex = e.dataTransfer.getData("text/plain");
      const toIndex = index;
      if (fromIndex == toIndex) return;
      const movedFriend = friends.splice(fromIndex, 1)[0];
      friends.splice(toIndex, 0, movedFriend);
      renderTop10(friends);
    });
  });
}

editTop10Btn.addEventListener("click", async () => {
  const friends = Array.from(top10FriendsContainer.children).map(div => ({
    username: div.textContent.replace(/^\d+\.\s/, "")
  }));
  const userDocRef = doc(db, "users", currentUser.uid);
  await updateDoc(userDocRef, { top10Friends: friends });
  renderTop10(friends);
});

// =====================
// MUSIC PLAYER
// =====================
musicPlayBtn.addEventListener("click", () => {
  const url = musicInput.value;
  if (!url) return;
  let embedUrl = "";
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const videoId = url.split("v=")[1] || url.split("/").pop();
    embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  } else if (url.includes("soundcloud.com")) {
    embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true`;
  }
  musicIframe.src = addCacheBuster(embedUrl);
});
musicPauseBtn.addEventListener("click", () => {
  musicIframe.src = "";
});

// =====================
// CUSTOM HTML BOX
// =====================
applyCustomHtmlBtn.addEventListener("click", () => {
  const html = customHtmlInput.value;
  const container = document.getElementById("customHtmlContainer");
  container.innerHTML = html;
});

// =====================
// NAVIGATION
// =====================
navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    alert(`Navigating to ${target} (placeholder)`); // Replace with actual page logic
  });
});
