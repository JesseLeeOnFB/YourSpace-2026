// ---------------------
// Firebase Imports & Init
// ---------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, deleteDoc, orderBy, query
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
const logoutBtn = document.getElementById("logoutBtn");
const navFeedBtn = document.getElementById("feedNavBtn");
const navProfileBtn = document.getElementById("profileNavBtn");

const pfpInput = document.getElementById("pfpInput");
const bioInput = document.getElementById("bioInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const wallInput = document.getElementById("wallInput");
const wallBtn = document.getElementById("wallBtn");
const wallContainer = document.getElementById("wallContainer");

const themeSelect = document.getElementById("themeSelect");
const customHtmlInput = document.getElementById("customHtmlInput");
const saveCustomHtmlBtn = document.getElementById("saveCustomHtmlBtn");
const resetCustomHtmlBtn = document.getElementById("resetCustomHtmlBtn");

const profilePicImg = document.getElementById("profilePic");
const bioDisplay = document.getElementById("bioDisplay");

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
// Helpers
// ---------------------
async function getUsername(userId) {
  try {
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() && snap.data().username ? snap.data().username : "Anonymous";
  } catch {
    return "Anonymous";
  }
}

// ---------------------
// Load Profile Info
// ---------------------
async function loadProfile() {
  const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  if (!userSnap.exists()) return;

  const data = userSnap.data();
  profilePicImg.src = data.pfpURL || "default-avatar.png";
  bioDisplay.textContent = data.bio || "This is the bio lol";
  bioInput.value = data.bio || "";
  themeSelect.value = data.theme || "dark";
  document.body.className = `theme-${themeSelect.value}`;

  customHtmlInput.value = data.customHtml || "";
  applyCustomHtml(data.customHtml);
}

// ---------------------
// Apply Custom HTML/CSS
// ---------------------
function applyCustomHtml(code) {
  let customContainer = document.getElementById("customHtmlContainer");
  if (!customContainer) {
    customContainer = document.createElement("div");
    customContainer.id = "customHtmlContainer";
    document.body.prepend(customContainer);
  }
  customContainer.innerHTML = code || "";
}

// ---------------------
// Save Profile Info
// ---------------------
saveProfileBtn?.addEventListener("click", async () => {
  const bio = bioInput.value.trim();
  let pfpURL = profilePicImg.src;

  if (pfpInput.files[0]) {
    const file = pfpInput.files[0];
    const storageRef = ref(storage, `pfps/${auth.currentUser.uid}_${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    pfpURL = await getDownloadURL(storageRef);
    profilePicImg.src = pfpURL;
  }

  await setDoc(doc(db, "users", auth.currentUser.uid), {
    bio,
    pfpURL,
    theme: themeSelect.value
  }, { merge: true });

  bioDisplay.textContent = bio;
  document.body.className = `theme-${themeSelect.value}`;
});

// ---------------------
// Theme Selector
// ---------------------
themeSelect?.addEventListener("change", () => {
  document.body.className = `theme-${themeSelect.value}`;
});

// ---------------------
// Custom HTML Save & Reset
// ---------------------
saveCustomHtmlBtn?.addEventListener("click", async () => {
  const code = customHtmlInput.value;
  applyCustomHtml(code);
  await updateDoc(doc(db, "users", auth.currentUser.uid), { customHtml: code });
});

resetCustomHtmlBtn?.addEventListener("click", async () => {
  customHtmlInput.value = "";
  applyCustomHtml("");
  await updateDoc(doc(db, "users", auth.currentUser.uid), { customHtml: "" });
});

// ---------------------
// Wall Comments
// ---------------------
async function loadWallComments() {
  wallContainer.innerHTML = "";
  const wallSnap = await getDocs(query(collection(db, "users", auth.currentUser.uid, "wall"), orderBy("createdAt", "asc")));
  wallSnap.forEach(async (docSnap) => {
    const data = docSnap.data();
    const username = await getUsername(data.userId);
    const p = document.createElement("p");
    p.textContent = `${username}: ${data.text}`;

    if (data.userId === auth.currentUser.uid) {
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.style.marginLeft = "5px";
      delBtn.addEventListener("click", async () => {
        await deleteDoc(doc(db, "users", auth.currentUser.uid, "wall", docSnap.id));
        loadWallComments();
      });
      p.appendChild(delBtn);
    }

    wallContainer.appendChild(p);
  });
}

wallBtn?.addEventListener("click", async () => {
  const text = wallInput.value.trim();
  if (!text) return;
  await addDoc(collection(db, "users", auth.currentUser.uid, "wall"), {
    userId: auth.currentUser.uid,
    text,
    createdAt: new Date()
  });
  wallInput.value = "";
  loadWallComments();
});

// ---------------------
// Auth State
// ---------------------
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    loadProfile();
    loadWallComments();
  }
});
