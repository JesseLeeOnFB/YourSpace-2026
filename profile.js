// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- DOM Elements ---
const profilePhotoInput = document.getElementById("profilePhotoInput");
const profilePhotoPreview = document.getElementById("profilePhotoPreview");
const savePhotoBtn = document.getElementById("savePhotoBtn");

const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const saveInfoBtn = document.getElementById("saveInfoBtn");

const topFriendsList = document.getElementById("topFriendsList");
const addFriendInput = document.getElementById("addFriendInput");
const addFriendBtn = document.getElementById("addFriendBtn");

const themeSelect = document.getElementById("themeSelect");
const musicPlayer = document.getElementById("musicPlayer");

const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

// --- Auth check ---
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    loadProfile(user.uid);
  }
});

// --- Load Profile ---
async function loadProfile(uid) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    usernameInput.value = data.username || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.music || "";
    profilePhotoPreview.src = data.profilePhoto || "";
    musicPlayer.src = data.music || "";
    themeSelect.value = data.theme || "default";

    if (data.topFriends) {
      topFriendsList.innerHTML = "";
      data.topFriends.forEach(friend => {
        const li = document.createElement("li");
        li.textContent = friend;
        topFriendsList.appendChild(li);
      });
    }
  }
}

// --- Save Profile Info ---
saveInfoBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  const userRef = doc(db, "users", user.uid);

  await setDoc(userRef, {
    username: usernameInput.value,
    location: locationInput.value,
    bio: bioInput.value,
    music: musicInput.value,
    theme: themeSelect.value
  }, { merge: true });

  musicPlayer.src = musicInput.value;
  document.body.className = themeSelect.value;
  alert("Profile info saved!");
});

// --- Save Profile Photo ---
savePhotoBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  const file = profilePhotoInput.files[0];
  if (!file) { alert("Select a photo first."); return; }

  const ext = file.name.split(".").pop().toLowerCase();
  let contentType = file.type;
  if (!contentType) {
    if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
  }

  const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);

  try {
    const snapshot = await uploadBytes(storageRef, file, { contentType });
    const downloadURL = await getDownloadURL(snapshot.ref);
    profilePhotoPreview.src = downloadURL;

    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { profilePhoto: downloadURL });
    alert("Profile photo saved!");
  } catch (err) {
    console.error(err);
    alert("Failed to upload photo.");
  }
});

// --- Add Friend ---
addFriendBtn.addEventListener("click", async () => {
  const friendUsername = addFriendInput.value.trim();
  if (!friendUsername) return;

  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  await updateDoc(userRef, {
    topFriends: arrayUnion(friendUsername)
  });

  const li = document.createElement("li");
  li.textContent = friendUsername;
  topFriendsList.appendChild(li);

  addFriendInput.value = "";
});

// --- Theme Change ---
themeSelect.addEventListener("change", () => {
  document.body.className = themeSelect.value;
});

// --- Navigation ---
homeBtn.addEventListener("click", () => { window.location.href = "feed.html"; });
logoutBtn.addEventListener("click", async () => { 
  await auth.signOut();
  window.location.href = "index.html";
});
