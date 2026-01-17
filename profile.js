import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, collection, addDoc, query, orderBy, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

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
const pfpInput = document.getElementById("pfpInput");
const savePfpBtn = document.getElementById("savePfpBtn");
const profilePfp = document.getElementById("profilePfp");
const bioInput = document.getElementById("bioInput");
const saveBioBtn = document.getElementById("saveBioBtn");

const musicInput = document.getElementById("musicInput");
const musicBtn = document.getElementById("musicBtn");
const musicContainer = document.getElementById("musicContainer");

const customHtmlInput = document.getElementById("customHtmlInput");
const saveCustomHtmlBtn = document.getElementById("saveCustomHtmlBtn");
const resetCustomHtmlBtn = document.getElementById("resetCustomHtmlBtn");

const top10Container = document.getElementById("top10Container");

const wallCommentsContainer = document.getElementById("wallCommentsContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");

const navFeedBtn = document.getElementById("feedNavBtn");
const navProfileBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

navFeedBtn?.addEventListener("click", () => window.location.href = "feed.html");
navProfileBtn?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

async function getUsername(userId) {
  try {
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() && snap.data().username ? snap.data().username : "Anonymous";
  } catch {
    return "Anonymous";
  }
}

async function loadProfile(uid) {
  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) return;

  const data = userSnap.data();
  profilePfp.src = data.pfpURL || "default-avatar.png";
  bioInput.value = data.bio || "This is the bio";

  loadTop10(uid);
  loadWallComments(uid);
}

async function loadTop10(uid) {
  top10Container.innerHTML = "";
  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) return;
  const top10 = userSnap.data().top10Friends || [];

  top10.forEach(f => {
    const div = document.createElement("div");
    div.innerHTML = `<a href="profile.html?uid=${f.uid}">
      <img src="${f.pfpURL || 'default-avatar.png'}" width="50" height="50"> ${f.username || 'Unknown'}
    </a>`;
    top10Container.appendChild(div);
  });
}

async function loadWallComments(uid) {
  wallCommentsContainer.innerHTML = "";
  const commentsSnap = await getDocs(query(collection(db, "users", uid, "wallComments"), orderBy("createdAt", "asc")));
  commentsSnap.forEach(async cSnap => {
    const data = cSnap.data();
    const username = await getUsername(data.userId);

    const div = document.createElement("div");
    div.className = "wallComment";
    div.innerHTML = `
      <p><a href="profile.html?uid=${data.userId}">${username}</a>: ${data.text}</p>
      ${data.userId === auth.currentUser.uid || uid === auth.currentUser.uid ? `<button class="deleteBtn">Delete</button>` : ""}
    `;
    div.querySelector(".deleteBtn")?.addEventListener("click", async () => {
      await deleteDoc(doc(db, "users", uid, "wallComments", cSnap.id));
      loadWallComments(uid);
    });

    wallCommentsContainer.appendChild(div);
  });
}

// Save PFP
savePfpBtn.addEventListener("click", async () => {
  const file = pfpInput.files[0];
  if (!file) return alert("Select a file first");
  const storageRef = ref(storage, `users/${auth.currentUser.uid}/pfp_${Date.now()}`);
  await uploadBytes(storageRef, file);
  const pfpURL = await getDownloadURL(storageRef);
  await updateDoc(doc(db, "users", auth.currentUser.uid), { pfpURL });
  profilePfp.src = pfpURL;
});

// Save Bio
saveBioBtn.addEventListener("click", async () => {
  await updateDoc(doc(db, "users", auth.currentUser.uid), { bio: bioInput.value });
  alert("Bio saved");
});

// Music Player Embed
function extractYoutubeID(url) {
  const match = url.match(/(?:v=|youtu\.be\/)([^&]+)/);
  return match ? match[1] : null;
}

musicBtn.addEventListener("click", () => {
  const url = musicInput.value.trim();
  if (!url) return;
  const youtubeID = extractYoutubeID(url);
  if (youtubeID) {
    musicContainer.innerHTML = `<iframe width="300" height="80"
      src="https://www.youtube.com/embed/${youtubeID}?autoplay=0"
      frameborder="0" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen></iframe>`;
  } else {
    alert("Invalid music URL");
  }
});

// Custom HTML Apply/Reset
saveCustomHtmlBtn.addEventListener("click", async () => {
  const code = customHtmlInput.value;
  await updateDoc(doc(db, "users", auth.currentUser.uid), { customHtml: code });
  applyCustomHtml(code);
});

resetCustomHtmlBtn.addEventListener("click", async () => {
  await updateDoc(doc(db, "users", auth.currentUser.uid), { customHtml: "" });
  applyCustomHtml("");
});

function applyCustomHtml(code) {
  const main = document.querySelector("main");
  if (!code) {
    main.style = "";
    return;
  }
  const styleTag = document.createElement("style");
  styleTag.innerHTML = code;
  main.appendChild(styleTag);
}

// Post Wall Comment
postWallCommentBtn.addEventListener("click", async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;
  const params = new URLSearchParams(window.location.search);
  const profileUid = params.get("uid") || auth.currentUser.uid;

  await addDoc(collection(db, "users", profileUid, "wallComments"), {
    userId: auth.currentUser.uid,
    text,
    createdAt: new Date()
  });
  wallCommentInput.value = "";
  loadWallComments(profileUid);
});

// Auth State
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    const params = new URLSearchParams(window.location.search);
    const profileUid = params.get("uid") || auth.currentUser.uid;
    loadProfile(profileUid);
  }
});
