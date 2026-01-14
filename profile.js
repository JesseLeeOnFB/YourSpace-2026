import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

/* =========================
   FIREBASE CONFIG
========================= */
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

/* =========================
   DOM ELEMENTS
========================= */
const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");

const saveProfileBtn = document.getElementById("saveProfileBtn");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");

const profilePhotoInput = document.getElementById("profilePhotoInput");
const profilePhoto = document.getElementById("profilePhoto");
const musicPlayer = document.getElementById("musicPlayer");

/* NAV */
const homeBtn = document.getElementById("homeBtn");
const feedBtn = document.getElementById("feedBtn");
const logoutBtn = document.getElementById("logoutBtn");

/* =========================
   AUTH STATE
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data();

    usernameInput.value = data.username || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.music || "";

    if (data.profilePhoto) {
      profilePhoto.src = data.profilePhoto;
    }

    if (data.music) {
      loadMusic(data.music);
    }
  }
});

/* =========================
   SAVE PROFILE INFO
========================= */
saveProfileBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, "users", user.uid);

  await setDoc(
    userRef,
    {
      username: usernameInput.value.trim(),
      location: locationInput.value.trim(),
      bio: bioInput.value.trim(),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  alert("Profile saved");
});

/* =========================
   SAVE PROFILE PHOTO
========================= */
saveProfilePhotoBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  const file = profilePhotoInput.files[0];

  if (!user || !file) {
    alert("Select a photo first");
    return;
  }

  const storageRef = ref(
    storage,
    `profileImages/${user.uid}/profile.jpg`
  );

  await uploadBytes(storageRef, file, {
    contentType: file.type
  });

  const url = await getDownloadURL(storageRef);

  await updateDoc(doc(db, "users", user.uid), {
    profilePhoto: url
  });

  profilePhoto.src = url;
  alert("Profile photo updated");
});

/* =========================
   MUSIC PLAYER
========================= */
saveMusicBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const link = musicInput.value.trim();
  if (!link) return;

  await updateDoc(doc(db, "users", user.uid), {
    music: link
  });

  loadMusic(link);
});

/* Convert YouTube → Embed */
function loadMusic(link) {
  let embed = "";

  if (link.includes("youtu.be")) {
    embed = link.replace("youtu.be/", "www.youtube.com/embed/");
  } else if (link.includes("youtube.com/watch")) {
    embed = link.replace("watch?v=", "embed/");
  }

  musicPlayer.src = embed;
  musicPlayer.width = "100%";
  musicPlayer.height = "200";
  musicPlayer.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
}

/* =========================
   NAV BUTTONS
========================= */
homeBtn.addEventListener("click", () => {
  window.location.href = "feed.html";
});

feedBtn.addEventListener("click", () => {
  window.location.href = "feed.html";
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});
