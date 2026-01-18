import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc,
  collection, addDoc, getDocs, query, orderBy,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// --------------------
// Firebase Init
// --------------------
const firebaseConfig = { /* your config */ };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --------------------
// DOM
// --------------------
const profileName = document.getElementById("profileName");
const profileBio = document.getElementById("profileBio");
const profilePic = document.getElementById("profilePic");
const bioInput = document.getElementById("bioInput");
const saveBioBtn = document.getElementById("saveBioBtn");
const pfpInput = document.getElementById("pfpInput");
const savePfpBtn = document.getElementById("savePfpBtn");
const wallInput = document.getElementById("wallInput");
const postWallBtn = document.getElementById("postWallBtn");
const wallContainer = document.getElementById("wallContainer");
const top10List = document.getElementById("top10List");
const feedNavBtn = document.getElementById("feedNavBtn");
const messagesNavBtn = document.getElementById("messagesNavBtn");
const logoutBtn = document.getElementById("logoutBtn");
const musicInput = document.getElementById("musicInput");
const addMusicBtn = document.getElementById("addMusicBtn");
const musicPlaylistDiv = document.getElementById("musicPlaylist");
const musicPlayer = document.getElementById("musicPlayer");

// --------------------
// State
// --------------------
let currentUser = null;
let viewedUserId = null;
let top10Friends = [];
let musicPlaylist = [];

// --------------------
// Auth
// --------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  const params = new URLSearchParams(window.location.search);
  viewedUserId = params.get("uid") || user.uid;
  await loadProfile(viewedUserId);
  await loadWall(viewedUserId);
  await loadTop10(viewedUserId);
  await loadMusic(viewedUserId);
});

// --------------------
// Navigation
// --------------------
feedNavBtn?.addEventListener("click", () => window.location.href = "feed.html");
messagesNavBtn?.addEventListener("click", () => window.location.href = "messages.html");
logoutBtn?.addEventListener("click", async () => { await signOut(auth); window.location.href = "login.html"; });

// --------------------
// Profile
// --------------------
async function loadProfile(uid) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) await setDoc(userRef, { bio: "", profilePicture: "", top10Friends: [], musicPlaylist: [] });
  const data = (await getDoc(userRef)).data();

  profileName.textContent = data.username || "YourSpace User";
  profileBio.textContent = data.bio || "This is the bio lol";
  profilePic.src = data.profilePicture || "default-avatar.png";

  const isOwn = uid === currentUser.uid;
  bioInput.style.display = isOwn ? "block" : "none";
  saveBioBtn.style.display = isOwn ? "block" : "none";
  pfpInput.style.display = isOwn ? "block" : "none";
  savePfpBtn.style.display = isOwn ? "block" : "none";
}

// Save Bio
saveBioBtn?.addEventListener("click", async () => {
  await updateDoc(doc(db, "users", currentUser.uid), { bio: bioInput.value.trim() });
  profileBio.textContent = bioInput.value.trim();
  bioInput.value = "";
});

// Save Profile Picture
savePfpBtn?.addEventListener("click", async () => {
  const file = pfpInput.files[0];
  if (!file) return alert("Select an image");
  const pfpRef = ref(storage, `profilePictures/${currentUser.uid}`);
  await uploadBytes(pfpRef, file);
  const url = await getDownloadURL(pfpRef);
  await updateDoc(doc(db, "users", currentUser.uid), { profilePicture: url });
  profilePic.src = url;
  pfpInput.value = "";
});

// --------------------
// Wall
// --------------------
async function loadWall(uid) {
  wallContainer.innerHTML = "";
  const q = query(collection(db, "users", uid, "wallComments"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "wall-post";
    div.innerHTML = `<strong>${data.username}</strong>: ${data.text}`;
    if (currentUser.uid === data.userId || currentUser.uid === uid) {
      const del = document.createElement("button");
      del.textContent = "Delete";
      del.onclick = async () => { await deleteDoc(doc(db, "users", uid, "wallComments", docSnap.id)); loadWall(uid); };
      div.appendChild(del);
    }
    wallContainer.appendChild(div);
  });
}

postWallBtn?.addEventListener("click", async () => {
  if (!wallInput.value.trim()) return;
  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  await addDoc(collection(db, "users", viewedUserId, "wallComments"), {
    text: wallInput.value.trim(),
    userId: currentUser.uid,
    username: userSnap.data()?.username || "User",
    createdAt: new Date()
  });
  wallInput.value = "";
  loadWall(viewedUserId);
});

// --------------------
// Top 10 Friends Drag & Drop
// --------------------
async function loadTop10(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  top10Friends = snap.data()?.top10Friends || [];
  renderTop10();
}

function renderTop10() {
  top10List.innerHTML = "";
  top10Friends.forEach((friend, idx) => {
    const li = document.createElement("li");
    li.draggable = true;
    li.dataset.index = idx;
    li.innerHTML = `<img src="${friend.profilePicture || 'default-avatar.png'}"><span class="friend-name">${friend.username}</span>`;
    li.querySelector(".friend-name").onclick = () => window.location.href = `profile.html?uid=${friend.uid}`;

    li.addEventListener("dragstart", e => { e.dataTransfer.setData("text/plain", idx); });
    li.addEventListener("dragover", e => e.preventDefault());
    li.addEventListener("drop", async e => {
      e.preventDefault();
      const fromIdx = parseInt(e.dataTransfer.getData("text/plain"));
      const toIdx = parseInt(li.dataset.index);
      const temp = top10Friends[fromIdx];
      top10Friends[fromIdx] = top10Friends[toIdx];
      top10Friends[toIdx] = temp;
      await updateDoc(doc(db, "users", currentUser.uid), { top10Friends });
      renderTop10();
    });

    top10List.appendChild(li);
  });
}

// --------------------
// Music Player
// --------------------
async function loadMusic(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  musicPlaylist = snap.data()?.musicPlaylist || [];
  renderMusic();
}

function renderMusic() {
  musicPlaylistDiv.innerHTML = "";
  musicPlaylist.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "music-item";
    div.textContent = item.title || item.link;
    div.onclick = () => {
      if (item.type === "youtube") musicPlayer.src = `https://www.youtube.com/embed/${item.id}?autoplay=1`;
    };
    musicPlaylistDiv.appendChild(div);
  });
}

addMusicBtn?.addEventListener("click", async () => {
  const link = musicInput.value.trim();
  if (!link) return;
  let id = "";
  if (link.includes("youtube")) {
    id = link.split("v=")[1]?.split("&")[0];
    musicPlaylist.push({ link, type: "youtube", id, title: "YouTube Song" });
  }
  await updateDoc(doc(db, "users", currentUser.uid), { musicPlaylist });
  musicInput.value = "";
  renderMusic();
});
