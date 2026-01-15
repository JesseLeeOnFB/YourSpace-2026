import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

// ----- Firebase Config -----
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// ----- DOM Elements -----
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const musicInput = document.getElementById("musicInput");
const profilePicInput = document.getElementById("profilePicInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");

// ----- Load User Data -----
onAuthStateChanged(auth, async (user) => {
  if (!user) return; // Not logged in

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    musicInput.value = data.music || "";
    themeSelect.value = data.theme || "";

    if (data.profilePic) {
      const profileImg = document.getElementById("profileImg");
      if (profileImg) profileImg.src = data.profilePic;
    }
  }
});

// ----- Save Profile Info -----
saveProfileBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in.");

  const userRef = doc(db, "users", user.uid);

  try {
    await setDoc(userRef, {
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value,
      music: musicInput.value
    }, { merge: true });
    alert("Profile saved successfully!");
  } catch (err) {
    console.error("Error saving profile:", err);
    alert("Failed to save profile.");
  }
});

// ----- Save Theme -----
saveThemeBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in.");
  const selectedTheme = themeSelect.value;

  const userRef = doc(db, "users", user.uid);

  try {
    await setDoc(userRef, { theme: selectedTheme }, { merge: true });
    document.body.className = selectedTheme; // Apply theme immediately
    alert("Theme saved!");
  } catch (err) {
    console.error("Error saving theme:", err);
    alert("Failed to save theme.");
  }
});

// ----- Upload Profile Picture -----
profilePicInput.addEventListener("change", async (event) => {
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in.");
  const file = event.target.files[0];
  if (!file) return;

  // Determine contentType if missing
  let contentType = file.type;
  if (!contentType) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
    if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
  }

  const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);

  try {
    const snapshot = await uploadBytes(storageRef, file, { contentType });
    const downloadURL = await getDownloadURL(snapshot.ref);

    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { profilePic: downloadURL }, { merge: true });

    const profileImg = document.getElementById("profileImg");
    if (profileImg) profileImg.src = downloadURL;

    alert("Profile picture uploaded!");
  } catch (err) {
    console.error("Error uploading profile picture:", err);
    alert("Failed to upload profile picture.");
  }
});
