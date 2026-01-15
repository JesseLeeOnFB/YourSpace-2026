alert("PROFILE.JS LOADED");
import { auth, db, storage } from "./firebase.js";
import {
  doc, getDoc, setDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const profilePhoto = document.getElementById("profilePhoto");
const profilePhotoInput = document.getElementById("profilePhotoInput");

const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");

const saveProfileBtn = document.getElementById("saveProfileBtn");
const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");

const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicPlayer = document.getElementById("musicPlayer");

// NAV
document.getElementById("navHome").onclick = () => window.location.href = "index.html";
document.getElementById("navFeed").onclick = () => window.location.href = "feed.html";
document.getElementById("navLogout").onclick = async () => {
  await signOut(auth);
  window.location.href = "index.html";
};

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      username: "",
      bio: "",
      location: "",
      theme: "default",
      music: "",
      photoURL: ""
    });
  }

  const data = (await getDoc(userRef)).data();

  usernameInput.value = data.username || "";
  bioInput.value = data.bio || "";
  locationInput.value = data.location || "";
  themeSelect.value = data.theme || "default";
  musicInput.value = data.music || "";

  document.body.className = data.theme || "default";

  if (data.photoURL) profilePhoto.src = data.photoURL;
  if (data.music) renderMusic(data.music);
});

// SAVE PROFILE
saveProfileBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) return;

  await updateDoc(doc(db, "users", user.uid), {
    username: usernameInput.value.trim(),
    bio: bioInput.value.trim(),
    location: locationInput.value.trim()
  });

  alert("Profile saved");
};

// THEME
saveThemeBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const theme = themeSelect.value;
  document.body.className = theme;

  await updateDoc(doc(db, "users", user.uid), { theme });
  alert("Theme saved");
};

// MUSIC
saveMusicBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const url = musicInput.value.trim();
  await updateDoc(doc(db, "users", user.uid), { music: url });
  renderMusic(url);
};

function renderMusic(url) {
  const videoId = url.split("v=")[1]?.split("&")[0];
  if (!videoId) return;

  musicPlayer.innerHTML = `
    <iframe
      src="https://www.youtube.com/embed/${videoId}"
      frameborder="0"
      allow="autoplay; encrypted-media"
      allowfullscreen>
    </iframe>
  `;
}

// PROFILE PHOTO
profilePhotoInput.onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;

  const user = auth.currentUser;
  const fileRef = ref(storage, `profileImages/${user.uid}.jpg`);

  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);

  await updateDoc(doc(db, "users", user.uid), { photoURL: url });
  profilePhoto.src = url;
};
