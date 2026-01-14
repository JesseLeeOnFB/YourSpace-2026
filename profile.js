// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ---------------- Firebase Init ----------------
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ---------------- DOM Elements ----------------
const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

const profilePic = document.getElementById("profilePic");
const profilePicInput = document.getElementById("profilePicInput");
const saveProfilePicBtn = document.getElementById("saveProfilePicBtn");

const displayNameEl = document.getElementById("displayName");
const bioEl = document.getElementById("bio");
const locationEl = document.getElementById("location");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicContainer = document.getElementById("musicContainer");

const topFriendsList = document.getElementById("topFriendsList");

const customHtmlInput = document.getElementById("customHtmlInput");
const saveCustomHtmlBtn = document.getElementById("saveCustomHtmlBtn");
const customHtmlContainer = document.getElementById("customHtmlContainer");

// ---------------- Auth & Navigation ----------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Nav buttons
  homeBtn.onclick = () => window.location.href = "feed.html";
  profileBtn.onclick = () => window.location.href = "profile.html";
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};

  // Load profile info
  profilePic.src = userData.photoURL || "default-avatar.png";
  displayNameEl.textContent = userData.displayName || "Anonymous";
  bioEl.textContent = userData.bio || "";
  locationEl.textContent = userData.location || "";
  bioInput.value = userData.bio || "";
  locationInput.value = userData.location || "";
  musicContainer.innerHTML = userData.music || "";
  customHtmlContainer.innerHTML = userData.customHtml || "";

  // Top 10 friends
  topFriendsList.innerHTML = "";
  (userData.topFriends || []).slice(0, 10).forEach(friend => {
    const li = document.createElement("li");
    li.textContent = friend;
    topFriendsList.appendChild(li);
  });

  // ---------------- Profile Picture Upload ----------------
  saveProfilePicBtn.onclick = async () => {
    const file = profilePicInput.files[0];
    if (!file) return alert("Select an image first.");

    const ext = file.name.split(".").pop().toLowerCase();
    let contentType = file.type;
    if (!contentType) {
      if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
    }

    const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${encodeURIComponent(file.name)}`);
    try {
      const snapshot = await uploadBytes(storageRef, file, { contentType });
      const downloadURL = await getDownloadURL(snapshot.ref);
      profilePic.src = downloadURL;
      await updateDoc(userRef, { photoURL: downloadURL });
      alert("Profile picture updated!");
    } catch (err) {
      console.error(err);
      alert("Failed to upload profile picture.");
    }
  };

  // ---------------- Bio & Location ----------------
  saveProfileBtn.onclick = async () => {
    try {
      await updateDoc(userRef, {
        bio: bioInput.value,
        location: locationInput.value
      });
      bioEl.textContent = bioInput.value;
      locationEl.textContent = locationInput.value;
      alert("Profile info saved!");
    } catch (err) {
      console.error(err);
      alert("Failed to save profile info.");
    }
  };

  // ---------------- Music ----------------
  saveMusicBtn.onclick = async () => {
    const code = musicInput.value;
    musicContainer.innerHTML = code;
    try {
      await updateDoc(userRef, { music: code });
      alert("Music saved!");
    } catch (err) {
      console.error(err);
      alert("Failed to save music.");
    }
  };

  // ---------------- Custom HTML / Themes ----------------
  saveCustomHtmlBtn.onclick = async () => {
    const html = customHtmlInput.value;
    customHtmlContainer.innerHTML = html;
    try {
      await updateDoc(userRef, { customHtml: html });
      alert("Customization saved!");
    } catch (err) {
      console.error(err);
      alert("Failed to save customization.");
    }
  };
});
