import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

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
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// Elements
const profilePhoto = document.getElementById("profilePhoto");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");

const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");

const themeSelect = document.getElementById("themeSelect");
const musicPlayer = document.getElementById("musicPlayer");
const topFriendsList = document.getElementById("topFriendsList");

const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

// Check login
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userDocRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDocRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    usernameInput.value = data.username || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.music || "";
    themeSelect.value = data.theme || "default";

    document.body.className = themeSelect.value;
    if (data.profilePhotoURL) profilePhoto.src = data.profilePhotoURL;
    if (data.music) musicPlayer.src = data.music;

    // Top friends
    topFriendsList.innerHTML = "";
    if (Array.isArray(data.topFriends)) {
      data.topFriends.forEach(friend => {
        const li = document.createElement("li");
        li.textContent = friend;
        topFriendsList.appendChild(li);
      });
    }
  }
});

// SAVE PROFILE PHOTO
saveProfilePhotoBtn.addEventListener("click", async () => {
  const file = profilePhotoInput.files[0];
  if (!file) return alert("Select a file first!");

  const user = auth.currentUser;
  const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await updateDoc(doc(db, "users", user.uid), { profilePhotoURL: url });
  profilePhoto.src = url;
  alert("Profile photo updated!");
});

// SAVE PROFILE INFO
saveProfileInfoBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  await updateDoc(doc(db, "users", user.uid), {
    username: usernameInput.value,
    location: locationInput.value,
    bio: bioInput.value,
    music: musicInput.value,
    theme: themeSelect.value
  });
  document.body.className = themeSelect.value;
  musicPlayer.src = musicInput.value;
  alert("Profile info saved!");
});

// NAVIGATION
homeBtn.addEventListener("click", () => window.location.href = "feed.html");
logoutBtn.addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "index.html";
});
