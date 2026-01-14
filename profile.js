import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

/* -------------------- Firebase Init -------------------- */
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

/* -------------------- DOM -------------------- */
const usernameInput = document.getElementById("username");
const bioInput = document.getElementById("bio");
const locationInput = document.getElementById("location");
const musicInput = document.getElementById("music");
const profileImageInput = document.getElementById("profileImage");
const profileImagePreview = document.getElementById("profileImagePreview");
const profileSaveBtn = document.getElementById("saveProfileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const homeBtn = document.getElementById("homeBtn");

/* -------------------- Auth -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  /* Nav buttons */
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };
  homeBtn.onclick = () => (window.location.href = "feed.html");

  /* Load profile */
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    musicInput.value = data.music || "";
    if (data.photoURL) profileImagePreview.src = data.photoURL;
  }

  /* Preview profile image */
  profileImageInput.addEventListener("change", () => {
    const file = profileImageInput.files[0];
    if (!file) {
      profileImagePreview.style.display = "none";
      return;
    }
    profileImagePreview.src = URL.createObjectURL(file);
    profileImagePreview.style.display = "block";
  });

  /* Save profile button */
  profileSaveBtn.onclick = async () => {
    const username = usernameInput.value.trim();
    const bio = bioInput.value.trim();
    const location = locationInput.value.trim();
    const music = musicInput.value.trim();
    const file = profileImageInput.files[0];

    let photoURL = null;

    try {
      // Upload new profile picture if selected
      if (file) {
        let contentType = file.type;
        if (!contentType) {
          const ext = file.name.split(".").pop().toLowerCase();
          if (["jpg", "jpeg", "png", "gif"].includes(ext)) contentType = "image/jpeg";
        }

        const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${encodeURIComponent(file.name)}`);
        const snapshot = await uploadBytes(storageRef, file, { contentType });
        photoURL = await getDownloadURL(snapshot.ref);
      }

      // Update Firestore
      const updateData = { username, bio, location, music };
      if (photoURL) updateData.photoURL = photoURL;

      await updateDoc(userRef, updateData);
      alert("Profile saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save profile. Check console.");
    }
  };
});
