import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM
const profilePhoto = document.getElementById("profilePhoto");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const savePhotoBtn = document.getElementById("savePhotoBtn");

const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const musicPlayer = document.getElementById("musicPlayer");

const saveProfileBtn = document.getElementById("saveProfileBtn");

const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");

const customHTMLInput = document.getElementById("customHTMLInput");
const saveHTMLBtn = document.getElementById("saveHTMLBtn");
const customProfileContent = document.getElementById("customProfileContent");

document.getElementById("homeBtn").onclick = () => location.href = "feed.html";
document.getElementById("logoutBtn").onclick = () => signOut(auth);

onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "index.html";
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

    if (data.profilePhoto) profilePhoto.src = data.profilePhoto;
    if (data.music) loadMusic(data.music);

    if (data.theme) {
      document.body.className = data.theme;
      themeSelect.value = data.theme;
    }

    if (data.customHTML) {
      customProfileContent.innerHTML = data.customHTML;
      customHTMLInput.value = data.customHTML;
    }
  } else {
    await setDoc(userRef, { createdAt: Date.now() });
  }

  saveProfileBtn.onclick = async () => {
    await updateDoc(userRef, {
      username: usernameInput.value,
      location: locationInput.value,
      bio: bioInput.value,
      music: musicInput.value
    });
    loadMusic(musicInput.value);
    alert("Profile saved");
  };

  savePhotoBtn.onclick = async () => {
    const file = profilePhotoInput.files[0];
    if (!file) return;

    const photoRef = ref(storage, `profileImages/${user.uid}/profile.jpg`);
    await uploadBytes(photoRef, file);
    const url = await getDownloadURL(photoRef);

    await updateDoc(userRef, { profilePhoto: url });
    profilePhoto.src = url;
    alert("Profile photo updated");
  };

  saveThemeBtn.onclick = async () => {
    await updateDoc(userRef, { theme: themeSelect.value });
    document.body.className = themeSelect.value;
  };

  saveHTMLBtn.onclick = async () => {
    await updateDoc(userRef, { customHTML: customHTMLInput.value });
    customProfileContent.innerHTML = customHTMLInput.value;
  };
});

function loadMusic(url) {
  if (!url.includes("youtube")) return;
  const id = url.split("v=")[1]?.split("&")[0];
  musicPlayer.src = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1`;
}
