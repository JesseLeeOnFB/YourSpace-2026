// profile.js (Firebase v9 MODULAR — FINAL)

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
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

/* ------------------ FIREBASE CONFIG ------------------ */
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com", // ✅ CRITICAL FIX
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/* ------------------ DOM ------------------ */
const profilePic = document.getElementById("profilePic");
const profileName = document.getElementById("profileName");
const profileBio = document.getElementById("profileBio");

const pfpInput = document.getElementById("pfpInput");
const savePfpBtn = document.getElementById("savePfpBtn");
const uploadProgress = document.getElementById("uploadProgress");

const bioInput = document.getElementById("bioInput");
const saveBioBtn = document.getElementById("saveBioBtn");

const wallInput = document.getElementById("wallInput");
const postWallBtn = document.getElementById("postWallBtn");
const wallContainer = document.getElementById("wallContainer");

/* ------------------ STATE ------------------ */
let currentUser = null;
let viewedUid = null;

/* ------------------ AUTH ------------------ */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  currentUser = user;

  const params = new URLSearchParams(window.location.search);
  viewedUid = params.get("uid") || user.uid;

  await loadProfile(viewedUid);
  await loadWall(viewedUid);

  const isOwnProfile = viewedUid === user.uid;
  pfpInput.style.display = isOwnProfile ? "block" : "none";
  savePfpBtn.style.display = isOwnProfile ? "block" : "none";
  bioInput.style.display = isOwnProfile ? "block" : "none";
  saveBioBtn.style.display = isOwnProfile ? "block" : "none";
});

/* ------------------ LOAD PROFILE ------------------ */
async function loadProfile(uid) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      username: "Anonymous",
      bio: "",
      profilePic: "",
      createdAt: serverTimestamp()
    });
  }

  const data = (await getDoc(userRef)).data();

  profileName.textContent = data.username || "User";
  profileBio.textContent = data.bio || "";

  if (data.profilePic) {
    profilePic.src = data.profilePic;
  } else {
    profilePic.src = "default-avatar.png";
  }
}

/* ------------------ SAVE BIO ------------------ */
saveBioBtn.addEventListener("click", async () => {
  if (!bioInput.value.trim()) return;

  await updateDoc(doc(db, "users", currentUser.uid), {
    bio: bioInput.value.trim()
  });

  profileBio.textContent = bioInput.value.trim();
  bioInput.value = "";
});

/* ------------------ PROFILE PICTURE UPLOAD (FIXED) ------------------ */
savePfpBtn.addEventListener("click", () => {
  const file = pfpInput.files[0];
  if (!file) {
    alert("Select an image first");
    return;
  }

  const storageRef = ref(storage, `profilePictures/${currentUser.uid}`);
  const uploadTask = uploadBytesResumable(storageRef, file);

  uploadProgress.style.display = "block";
  uploadProgress.value = 0;

  uploadTask.on(
    "state_changed",
    (snapshot) => {
      const percent =
        (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      uploadProgress.value = percent;
    },
    (error) => {
      console.error("Upload error:", error);
      alert("Upload failed");
    },
    async () => {
      const url = await getDownloadURL(uploadTask.snapshot.ref);

      await updateDoc(doc(db, "users", currentUser.uid), {
        profilePic: url
      });

      profilePic.src = url;
      uploadProgress.style.display = "none";
      pfpInput.value = "";
    }
  );
});

/* ------------------ WALL ------------------ */
async function loadWall(uid) {
  wallContainer.innerHTML = "";

  const q = query(
    collection(db, "walls"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  snap.forEach((docSnap) => {
    const d = docSnap.data();
    if (d.profileUid !== uid) return;

    const div = document.createElement("div");
    div.className = "wall-post";
    div.innerHTML = `<strong>${d.username}</strong>: ${d.text}`;
    wallContainer.appendChild(div);
  });
}

postWallBtn.addEventListener("click", async () => {
  if (!wallInput.value.trim()) return;

  await addDoc(collection(db, "walls"), {
    profileUid: viewedUid,
    userId: currentUser.uid,
    username: currentUser.email,
    text: wallInput.value.trim(),
    createdAt: serverTimestamp()
  });

  wallInput.value = "";
  loadWall(viewedUid);
});
