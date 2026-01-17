import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, deleteDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// ---------------- Firebase ----------------
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

// ---------------- DOM Elements ----------------
const profilePicture = document.getElementById("profilePicture");
const profilePicInput = document.getElementById("profilePicInput");
const savePfpBtn = document.getElementById("savePfpBtn");
const bioInput = document.getElementById("bioInput");
const saveBioBtn = document.getElementById("saveBioBtn");
const top10Container = document.getElementById("top10Container");
const wallContainer = document.getElementById("wallContainer");
const wallInput = document.getElementById("wallInput");
const postWallBtn = document.getElementById("postWallBtn");
const musicInput = document.getElementById("musicInput");
const playMusicBtn = document.getElementById("playMusicBtn");
const musicPlayer = document.getElementById("musicPlayer");
const themeBtns = document.querySelectorAll(".theme-btn");
const resetThemeBtn = document.getElementById("resetThemeBtn");
const customHtmlInput = document.getElementById("customHtmlInput");
const applyCustomHtmlBtn = document.getElementById("applyCustomHtmlBtn");
const resetCustomHtmlBtn = document.getElementById("resetCustomHtmlBtn");
const customHtmlContainer = document.getElementById("customHtmlContainer");
const navFeedBtn = document.getElementById("feedNavBtn");
const navProfileBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ---------------- Navigation ----------------
navFeedBtn?.addEventListener("click", () => window.location.href = "feed.html");
navProfileBtn?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// ---------------- Helpers ----------------
async function getUserDoc(uid) {
  const docRef = doc(db, "users", uid);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : null;
}

// ---------------- Profile Picture ----------------
savePfpBtn.addEventListener("click", async () => {
  const file = profilePicInput.files[0];
  if (!file) return alert("Select an image first");
  const storageRef = ref(storage, `profilePics/${auth.currentUser.uid}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  profilePicture.src = url;
  await updateDoc(doc(db, "users", auth.currentUser.uid), { pfpURL: url });
});

// ---------------- Bio ----------------
saveBioBtn.addEventListener("click", async () => {
  const bio = bioInput.value;
  await updateDoc(doc(db, "users", auth.currentUser.uid), { bio });
});

// ---------------- Top 10 Friends ----------------
async function loadTop10() {
  top10Container.innerHTML = "";
  const userData = await getUserDoc(auth.currentUser.uid);
  const friends = userData?.top10Friends || [];
  friends.forEach(f => {
    const div = document.createElement("div");
    div.textContent = f.username || "Unknown";
    top10Container.appendChild(div);
  });
}

// ---------------- Wall ----------------
async function loadWall() {
  wallContainer.innerHTML = "";
  const wallSnap = await getDocs(query(collection(db, "wall"), orderBy("createdAt", "asc")));
  wallSnap.forEach(async docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.textContent = `${data.username || "Anonymous"}: ${data.text}`;
    wallContainer.appendChild(div);
  });
}

postWallBtn.addEventListener("click", async () => {
  const text = wallInput.value.trim();
  if (!text) return;
  const user = await getUserDoc(auth.currentUser.uid);
  await addDoc(collection(db, "wall"), {
    userId: auth.currentUser.uid,
    username: user.username || "Anonymous",
    text,
    createdAt: new Date()
  });
  wallInput.value = "";
  loadWall();
});

// ---------------- Music ----------------
playMusicBtn.addEventListener("click", () => {
  const link = musicInput.value.trim();
  if (!link) return;
  let embedHTML = "";
  if (link.includes("youtube")) {
    const id = new URL(link).searchParams.get("v");
    embedHTML = `<iframe width="300" height="150" src="https://www.youtube.com/embed/${id}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  } else if (link.includes("soundcloud")) {
    embedHTML = `<iframe width="300" height="150" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(link)}"></iframe>`;
  }
  musicPlayer.innerHTML = embedHTML;
});

// ---------------- Themes ----------------
themeBtns.forEach(btn => btn.addEventListener("click", () => {
  document.body.className = btn.dataset.theme;
}));
resetThemeBtn.addEventListener("click", () => document.body.className = "");

// ---------------- Custom HTML ----------------
applyCustomHtmlBtn.addEventListener("click", () => {
  customHtmlContainer.innerHTML = customHtmlInput.value;
});
resetCustomHtmlBtn.addEventListener("click", () => {
  customHtmlInput.value = "";
  customHtmlContainer.innerHTML = "";
});

// ---------------- Auth State ----------------
onAuthStateChanged(auth, async user => {
  if (!user) window.location.href = "login.html";
  else {
    const userData = await getUserDoc(auth.currentUser.uid);
    profilePicture.src = userData?.pfpURL || "default-avatar.png";
    bioInput.value = userData?.bio || "This is the bio lol";
    loadTop10();
    loadWall();
  }
});
