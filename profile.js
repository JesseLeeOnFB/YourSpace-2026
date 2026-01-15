import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM
const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");

const saveProfileBtn = document.getElementById("saveProfileBtn");

const profilePhoto = document.getElementById("profilePhoto");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");

const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");

const customHTMLInput = document.getElementById("customHTMLInput");
const saveCustomHTMLBtn = document.getElementById("saveCustomHTMLBtn");

const musicPlayer = document.getElementById("musicPlayer");

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
    customHTMLInput.value = data.customHTML || "";
    themeSelect.value = data.theme || "default";

    // Apply theme safely
    document.body.classList.remove("default", "dark", "neon", "animated");
    document.body.classList.add(data.theme || "default");

    if (data.photoURL) profilePhoto.src = data.photoURL;

    if (data.music && data.music.includes("youtube")) {
      const videoId = data.music.split("v=")[1]?.split("&")[0];
      musicPlayer.innerHTML = `
        <iframe width="100%" height="200"
          src="https://www.youtube.com/embed/${videoId}"
          frameborder="0" allow="autoplay; encrypted-media" allowfullscreen>
        </iframe>`;
    }

    document.body.insertAdjacentHTML("beforeend", data.customHTML || "");
  }

  // NAV
  homeBtn.onclick = () => window.location.href = "feed.html";
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  // SAVE PROFILE INFO
  saveProfileBtn.onclick = async () => {
    await setDoc(userRef, {
      username: usernameInput.value.trim(),
      location: locationInput.value.trim(),
      bio: bioInput.value.trim(),
      music: musicInput.value.trim()
    }, { merge: true });

    alert("Profile saved");
  };

  // SAVE PROFILE PHOTO
  saveProfilePhotoBtn.onclick = async () => {
    const file = profilePhotoInput.files[0];
    if (!file) return alert("Select a photo");

    const storageRef = ref(storage, `profileImages/${user.uid}/profile.jpg`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await updateDoc(userRef, { photoURL: url });
    profilePhoto.src = url;
  };

  // SAVE THEME (FIXED)
  saveThemeBtn.onclick = async () => {
    const theme = themeSelect.value;

    await updateDoc(userRef, { theme });

    document.body.classList.remove("default", "dark", "neon", "animated");
    document.body.classList.add(theme);

    alert("Theme saved");
  };

  // SAVE CUSTOM HTML
  saveCustomHTMLBtn.onclick = async () => {
    await updateDoc(userRef, {
      customHTML: customHTMLInput.value
    });
    alert("Custom HTML saved (refresh to apply)");
  };
});
