// profile.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

/* =======================
   Firebase Init
======================= */
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

/* =======================
   DOM
======================= */
const profilePic = document.getElementById("profilePic");
const profileName = document.getElementById("profileName");
const profileBio = document.getElementById("profileBio");
const bioInput = document.getElementById("bioInput");
const saveBioBtn = document.getElementById("saveBioBtn");
const pfpInput = document.getElementById("pfpInput");
const savePfpBtn = document.getElementById("savePfpBtn");
const uploadProgress = document.getElementById("uploadProgress");

/* =======================
   Auth
======================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      username: user.email,
      bio: "",
      profilePic: "",
      createdAt: serverTimestamp()
    });
  }

  const data = (await getDoc(userRef)).data();

  profileName.textContent = data.username || "YourSpace User";
  profileBio.textContent = data.bio || "";
  profilePic.src = data.profilePic || "default-avatar.png";
});

/* =======================
   Save Bio
======================= */
saveBioBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  await updateDoc(doc(db, "users", user.uid), {
    bio: bioInput.value.trim()
  });

  profileBio.textContent = bioInput.value.trim();
  bioInput.value = "";
});

/* =======================
   Upload Profile Picture
======================= */
savePfpBtn.addEventListener("click", () => {
  const user = auth.currentUser;
  if (!user) return;

  const file = pfpInput.files[0];
  if (!file) {
    alert("Select an image first");
    return;
  }

  const storageRef = ref(storage, `profilePictures/${user.uid}`);
  const uploadTask = uploadBytesResumable(storageRef, file);

  uploadProgress.style.display = "block";
  uploadProgress.value = 0;

  uploadTask.on(
    "state_changed",
    (snapshot) => {
      const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      uploadProgress.value = percent;
    },
    (error) => {
      console.error("Upload error:", error);
      alert("Upload failed");
    },
    async () => {
      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
      await updateDoc(doc(db, "users", user.uid), {
        profilePic: downloadURL
      });

      profilePic.src = downloadURL;
      uploadProgress.style.display = "none";
      pfpInput.value = "";
    }
  );
});
