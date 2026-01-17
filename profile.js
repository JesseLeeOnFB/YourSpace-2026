import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Firebase config
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

// DOM elements
const navFeedBtn = document.getElementById("navFeedBtn");
const navProfileBtn = document.getElementById("navProfileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const profilePfpInput = document.getElementById("profilePfpInput");
const saveProfilePfpBtn = document.getElementById("saveProfilePfpBtn");
const profilePfp = document.getElementById("profilePfp");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");
const customHtmlInput = document.getElementById("customHtmlInput");
const saveCustomHtmlBtn = document.getElementById("saveCustomHtmlBtn");
const customHtmlPreview = document.getElementById("customProfileContainer");

const wallCommentsContainer = document.getElementById("wallCommentsContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const addWallCommentBtn = document.getElementById("addWallCommentBtn");

const top10Container = document.getElementById("top10FriendsContainer");

// ---------------------
// Navigation
// ---------------------
navFeedBtn?.addEventListener("click", () => window.location.href = "feed.html");
navProfileBtn?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "login.html";
});

// ---------------------
// Profile Functions
// ---------------------
saveProfileBtn?.addEventListener("click", async () => {
  const data = {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  };
  await updateDoc(doc(db, "users", auth.currentUser.uid), data);
  alert("Profile info saved");
});

saveProfilePfpBtn?.addEventListener("click", async () => {
  const file = profilePfpInput.files[0];
  if (!file) return;
  const storageRef = ref(storage, `pfp/${auth.currentUser.uid}_${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  profilePfp.src = url;
  await updateDoc(doc(db, "users", auth.currentUser.uid), { pfpURL: url });
});

// ---------------------
// Themes
// ---------------------
saveThemeBtn?.addEventListener("click", async () => {
  document.body.className = themeSelect.value;
  await updateDoc(doc(db, "users", auth.currentUser.uid), { theme: themeSelect.value });
});

// ---------------------
// Custom HTML Injector
// ---------------------
saveCustomHtmlBtn?.addEventListener("click", async () => {
  const htmlCode = customHtmlInput.value;
  customHtmlPreview.innerHTML = htmlCode;
  await updateDoc(doc(db, "users", auth.currentUser.uid), { customHtml: htmlCode });
});

async function loadCustomHtml() {
  const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  if (!userSnap.exists()) return;
  const htmlCode = userSnap.data().customHtml || "";
  if (htmlCode) customHtmlPreview.innerHTML = htmlCode;
}

// ---------------------
// Wall Comments (Anyone visiting can post)
// ---------------------
addWallCommentBtn?.addEventListener("click", async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;
  await addDoc(collection(db, "users", auth.currentUser.uid, "wallComments"), {
    userId: auth.currentUser.uid,
    text,
    createdAt: new Date()
  });
  wallCommentInput.value = "";
  loadWallComments();
});

async function loadWallComments() {
  wallCommentsContainer.innerHTML = "";
  const snap = await getDocs(query(collection(db, "users", auth.currentUser.uid, "wallComments"), orderBy("createdAt", "desc")));
  snap.forEach(async docSnap => {
    const data = docSnap.data();
    const p = document.createElement("p");
    const username = (await getDoc(doc(db, "users", data.userId)))?.data()?.username || "Anonymous";
    p.textContent = `${username}: ${data.text}`;
    wallCommentsContainer.appendChild(p);
  });
}

// ---------------------
// Top 10 Friends (visible for visitors)
// ---------------------
async function loadTop10Friends() {
  top10Container.innerHTML = "";
  const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  if (!userSnap.exists()) return;
  const friends = userSnap.data().top10Friends || [];
  friends.forEach(f => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `<img src="${f.pfpURL || 'default-avatar.png'}" width="30" height="30" style="border-radius:50%;"> ${f.username || 'Unknown'}`;
    top10Container.appendChild(div);
  });
}

// ---------------------
// Load on Auth
// ---------------------
onAuthStateChanged(auth, user => {
  if (!user) window.location.href = "login.html";
  else {
    loadCustomHtml();
    loadWallComments();
    loadTop10Friends();
  }
});
