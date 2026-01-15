import { auth, db, storage } from "./script.js"; // assumes script.js initializes Firebase
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

document.addEventListener("DOMContentLoaded", () => {
  const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");
  const saveProfilePicBtn = document.getElementById("saveProfilePicBtn");
  const saveThemeBtn = document.getElementById("saveThemeBtn");

  saveProfileInfoBtn.addEventListener("click", saveProfileInfo);
  saveProfilePicBtn.addEventListener("click", saveProfilePicture);
  saveThemeBtn.addEventListener("click", saveTheme);

  loadProfileInfo();

  // Nav buttons
  document.getElementById("homeBtn").addEventListener("click", () => window.location.href = "feed.html");
  document.getElementById("profileBtn").addEventListener("click", () => window.location.href = "profile.html");
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "index.html";
  });
});

async function loadProfileInfo() {
  if (!auth.currentUser) return;
  const docRef = doc(db, "users", auth.currentUser.uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    document.getElementById("usernameInput").value = data.username || "";
    document.getElementById("bioInput").value = data.bio || "";
    document.getElementById("locationInput").value = data.location || "";
    document.getElementById("musicInput").value = data.music || "";
    document.getElementById("themeSelect").value = data.theme || "default";
    document.body.className = data.theme || "default";
    if (data.photoURL) document.getElementById("profilePhoto").src = data.photoURL;
  }
}

async function saveProfileInfo() {
  try {
    const username = document.getElementById("usernameInput").value;
    const bio = document.getElementById("bioInput").value;
    const location = document.getElementById("locationInput").value;
    const music = document.getElementById("musicInput").value;

    await setDoc(doc(db, "users", auth.currentUser.uid), {
      username,
      bio,
      location,
      music
    }, { merge: true });

    alert("Profile info saved!");
  } catch (err) {
    console.error(err);
    alert("Failed to save profile info.");
  }
}

async function saveProfilePicture() {
  const fileInput = document.getElementById("profilePicInput");
  const file = fileInput.files[0];
  if (!file) return alert("Select a file first.");

  const storageRef = ref(storage, `profileImages/${auth.currentUser.uid}/${file.name}`);
  try {
    await uploadBytes(storageRef, file);
    const photoURL = await getDownloadURL(storageRef);

    await setDoc(doc(db, "users", auth.currentUser.uid), { photoURL }, { merge: true });
    document.getElementById("profilePhoto").src = photoURL;
    alert("Profile photo saved!");
  } catch (err) {
    console.error(err);
    alert("Failed to save profile photo.");
  }
}

async function saveTheme() {
  const theme = document.getElementById("themeSelect").value;
  try {
    await setDoc(doc(db, "users", auth.currentUser.uid), { theme }, { merge: true });
    document.body.className = theme;
    alert("Theme saved!");
  } catch (err) {
    console.error(err);
    alert("Failed to save theme.");
  }
}
