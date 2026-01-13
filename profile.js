import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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

onAuthStateChanged(auth, async (user) => {
  // Only redirect if user is truly null AND Firebase is ready
  if (user === null) {
    // Let Firebase fully initialize first
    setTimeout(() => {
      if (!auth.currentUser) {
        window.location.href = "index.html";
      }
    }, 500); // 0.5s delay to allow Firebase to restore session
    return;
  }

  // ====== DOM elements ======
  const displayNameInput = document.getElementById("displayName");
  const bioInput = document.getElementById("bio");
  const profilePicInput = document.getElementById("profilePic");
  const saveBtn = document.getElementById("saveProfile");
  const profileImg = document.getElementById("profileImg");

  // ====== Load current profile ======
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    displayNameInput.value = data.displayName || "";
    bioInput.value = data.bio || "";
    if (data.photoURL) profileImg.src = data.photoURL;
  }

  // ====== Save profile ======
  saveBtn.addEventListener("click", async () => {
    const updates = {
      displayName: displayNameInput.value,
      bio: bioInput.value
    };

    if (profilePicInput.files.length > 0) {
      const file = profilePicInput.files[0];
      const storageRef = ref(storage, `profilePics/${user.uid}`);
      await uploadBytes(storageRef, file);
      updates.photoURL = await getDownloadURL(storageRef);
      profileImg.src = updates.photoURL; // immediately update picture
    }

    await setDoc(doc(db, "users", user.uid), updates, { merge: true });
    alert("Profile updated!");
  });
});

  // ====== DOM elements ======
  const displayNameInput = document.getElementById("displayName");
  const bioInput = document.getElementById("bio");
  const profilePicInput = document.getElementById("profilePic");
  const saveBtn = document.getElementById("saveProfile");
  const profileImg = document.getElementById("profileImg");

  // ====== Load current profile ======
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    displayNameInput.value = data.displayName || "";
    bioInput.value = data.bio || "";
    if (data.photoURL) profileImg.src = data.photoURL;
  }

  // ====== Save profile ======
  saveBtn.addEventListener("click", async () => {
    const updates = {
      displayName: displayNameInput.value,
      bio: bioInput.value
    };

    if (profilePicInput.files.length > 0) {
      const file = profilePicInput.files[0];
      const storageRef = ref(storage, `profilePics/${user.uid}`);
      await uploadBytes(storageRef, file);
      updates.photoURL = await getDownloadURL(storageRef);
      profileImg.src = updates.photoURL; // immediately update picture
    }

    await setDoc(doc(db, "users", user.uid), updates, { merge: true });
    alert("Profile updated!");
  });
});
