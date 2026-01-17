import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
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

// DOM
const feedNavBtn = document.getElementById("feedNavBtn");
const profileNavBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

const profilePfp = document.getElementById("profilePfp");
const pfpUpload = document.getElementById("pfpUpload");
const profileUsername = document.getElementById("profileUsername");
const profileBio = document.getElementById("profileBio");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const top10Container = document.getElementById("top10FriendsContainer");
const editTop10Btn = document.getElementById("editTop10Btn");

const wallCommentsContainer = document.getElementById("wallCommentsContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");

const musicInput = document.getElementById("musicInput");
const musicIframe = document.getElementById("musicIframe");
const saveMusicBtn = document.getElementById("saveMusicBtn");

const customHtmlInput = document.getElementById("customHtmlInput");
const saveCustomHtmlBtn = document.getElementById("saveCustomHtmlBtn");

// --------------------- Navigation ---------------------
feedNavBtn?.addEventListener("click", () => window.location.href = "feed.html");
profileNavBtn?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// --------------------- Helpers ---------------------
async function getUsername(userId) {
  try {
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() && snap.data().username ? snap.data().username : "Anonymous";
  } catch {
    return "Anonymous";
  }
}

// --------------------- Load Profile ---------------------
async function loadProfile() {
  const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  if (!userSnap.exists()) return;
  const data = userSnap.data();

  profileUsername.value = data.username || "";
  profileBio.value = data.bio || "";
  profilePfp.src = data.pfpURL || "default-avatar.png";

  // Load music
  if (data.musicURL) musicIframe.src = data.musicURL;

  // Load custom HTML
  if (data.customHTML) applyCustomHTML(data.customHTML);

  // Load Top 10 Friends
  top10Container.innerHTML = "";
  const friends = data.top10Friends || [];
  friends.forEach(f => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `<img src="${f.pfpURL || 'default-avatar.png'}" width="30" height="30" style="border-radius:50%;"> ${f.username || 'Unknown'}`;
    top10Container.appendChild(div);
  });

  // Load Wall Comments
  const wallComments = data.wallComments || [];
  wallCommentsContainer.innerHTML = "";
  wallComments.forEach((c, idx) => {
    const div = document.createElement("div");
    div.className = "wall-comment";
    div.innerHTML = `<span>${c.username}: ${c.text}</span>
                     ${(c.userId === auth.currentUser.uid || auth.currentUser.uid === c.userId) ? `<button data-idx="${idx}">Delete</button>` : ""}`;
    wallCommentsContainer.appendChild(div);

    const delBtn = div.querySelector("button");
    delBtn?.addEventListener("click", async () => {
      wallComments.splice(idx,1);
      await updateDoc(doc(db, "users", auth.currentUser.uid), { wallComments });
      loadProfile();
    });
  });
}

// --------------------- Save Profile ---------------------
saveProfileBtn.addEventListener("click", async () => {
  let pfpURL = profilePfp.src;
  if (pfpUpload.files[0]) {
    const storageRef = ref(storage, `pfp/${auth.currentUser.uid}_${Date.now()}`);
    await uploadBytes(storageRef, pfpUpload.files[0]);
    pfpURL = await getDownloadURL(storageRef);
  }

  await setDoc(doc(db, "users", auth.currentUser.uid), {
    username: profileUsername.value,
    bio: profileBio.value,
    pfpURL
  }, { merge: true });

  loadProfile();
});

// --------------------- Wall Comments ---------------------
postWallCommentBtn.addEventListener("click", async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;

  const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  const username = userSnap.data()?.username || "Anonymous";

  const profileSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
  const wallComments = profileSnap.data()?.wallComments || [];
  wallComments.push({ userId: auth.currentUser.uid, username, text });

  await updateDoc(doc(db, "users", auth.currentUser.uid), { wallComments });
  wallCommentInput.value = "";
  loadProfile();
});

// --------------------- Music Player ---------------------
saveMusicBtn.addEventListener("click", async () => {
  await updateDoc(doc(db, "users", auth.currentUser.uid), { musicURL: musicInput.value });
  musicIframe.src = musicInput.value;
});

// --------------------- Custom HTML ---------------------
function applyCustomHTML(code) {
  // Clear previous injected style/script
  document.querySelectorAll(".custom-injected").forEach(e => e.remove());

  const style = document.createElement("style");
  style.className = "custom-injected";
  style.textContent = code;
  document.head.appendChild(style);
}

saveCustomHtmlBtn.addEventListener("click", async () => {
  const code = customHtmlInput.value;
  applyCustomHTML(code);
  await updateDoc(doc(db, "users", auth.currentUser.uid), { customHTML: code });
});

// --------------------- Auth State ---------------------
onAuthStateChanged(auth, user => {
  if (!user) window.location.href = "login.html";
  else loadProfile();
});
