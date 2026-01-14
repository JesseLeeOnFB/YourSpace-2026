// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// -------------------- Firebase Init --------------------
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

// -------------------- DOM --------------------
const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const profileImagePreview = document.getElementById("profileImagePreview"); // optional if you have an <img> for preview

const logoutBtn = document.getElementById("logoutBtn");
const homeBtn = document.getElementById("homeBtn");

// -------------------- Auth --------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userRef = doc(db, "users", user.uid);

  // Load existing profile data
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    usernameInput.value = data.username || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.music || "";
    if (data.photoURL && profileImagePreview) {
      profileImagePreview.src = data.photoURL;
    }
  }

  // -------------------- NAV BUTTONS --------------------
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };
  homeBtn.onclick = () => {
    window.location.href = "feed.html";
  };

  // -------------------- SAVE PROFILE --------------------
  saveProfileBtn.onclick = async () => {
    saveProfileBtn.disabled = true;

    try {
      let photoURL = userSnap.exists() ? userSnap.data().photoURL || "" : "";

      // Upload profile photo if selected
      const file = profilePhotoInput.files[0];
      if (file) {
        let contentType = file.type;
        if (!contentType) {
          const ext = file.name.split('.').pop().toLowerCase();
          if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
        }

        const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${encodeURIComponent(file.name)}`);
        const snapshot = await uploadBytes(storageRef, file, { contentType });
        photoURL = await getDownloadURL(snapshot.ref);

        // Update preview
        if (profileImagePreview) profileImagePreview.src = photoURL;
      }

      // Update Firestore user doc
      await setDoc(userRef, {
        username: usernameInput.value.trim(),
        location: locationInput.value.trim(),
        bio: bioInput.value.trim(),
        music: musicInput.value.trim(),
        photoURL,
        updatedAt: serverTimestamp()
      }, { merge: true });

      alert("Profile saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save profile. Check console.");
    } finally {
      saveProfileBtn.disabled = false;
    }
  };
});
