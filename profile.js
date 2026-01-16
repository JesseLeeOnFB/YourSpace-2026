import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

/* FIREBASE CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

/* INIT */
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

/* DOM */
const profilePfp = document.getElementById("profilePfp");
const profilePfpInput = document.getElementById("profilePfpInput");
const savePfpBtn = document.getElementById("savePfpBtn");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const commentContainer = document.getElementById("commentContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicPlayerContainer = document.getElementById("musicPlayerContainer");
const logoutBtn = document.getElementById("logoutBtn");

let currentUser;

/* AUTH */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  await loadProfile();
});

/* LOGOUT */
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

/* LOAD PROFILE */
async function loadProfile() {
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      username: "",
      bio: "",
      location: "",
      pfpURL: "",
      wallComments: [],
      musicURL: ""
    });
    return loadProfile();
  }

  const data = snap.data();

  usernameInput.value = data.username || "";
  bioInput.value = data.bio || "";
  locationInput.value = data.location || "";

  profilePfp.src = data.pfpURL || "default-avatar.png";

  renderWallComments(data.wallComments || []);

  if (data.musicURL) {
    musicInput.value = data.musicURL;
    renderMusic(data.musicURL);
  }
}

/* SAVE PROFILE INFO */
saveProfileBtn.addEventListener("click", async () => {
  await updateDoc(doc(db, "users", currentUser.uid), {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  alert("Profile saved");
});

/* SAVE PROFILE PICTURE */
savePfpBtn.addEventListener("click", async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert("Select an image");

  const imgRef = ref(storage, `profileImages/${currentUser.uid}/pfp.jpg`);
  await uploadBytes(imgRef, file);
  const url = await getDownloadURL(imgRef);

  await updateDoc(doc(db, "users", currentUser.uid), { pfpURL: url });
  profilePfp.src = url;
});

/* WALL COMMENTS */
postWallCommentBtn.addEventListener("click", async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;

  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);
  const comments = snap.data().wallComments || [];

  comments.push({
    user: usernameInput.value || "Anonymous",
    text
  });

  await updateDoc(userRef, { wallComments: comments });
  renderWallComments(comments);
  wallCommentInput.value = "";
});

function renderWallComments(comments) {
  commentContainer.innerHTML = "";
  comments.forEach((c, i) => {
    const div = document.createElement("div");
    div.innerHTML = `<strong>${c.user}:</strong> ${c.text}`;
    commentContainer.appendChild(div);
  });
}

/* MUSIC */
saveMusicBtn.addEventListener("click", async () => {
  const url = musicInput.value.trim();
  if (!url) return alert("Enter a music link");

  await updateDoc(doc(db, "users", currentUser.uid), { musicURL: url });
  renderMusic(url);
});

function renderMusic(url) {
  musicPlayerContainer.innerHTML = "";

  if (url.includes("youtube")) {
    const id = url.split("v=")[1]?.split("&")[0];
    if (!id) return;
    musicPlayerContainer.innerHTML = `
      <iframe
        width="100%"
        height="220"
        src="https://www.youtube.com/embed/${id}"
        allowfullscreen>
      </iframe>
    `;
  } else {
    musicPlayerContainer.innerHTML = `
      <audio controls src="${url}"></audio>
    `;
  }
}
