import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// --- Firebase config ---
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

const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const profilePhotoPreview = document.getElementById("profilePhotoPreview");
const saveProfileBtn = document.getElementById("saveProfileBtn");

// Preview new profile photo
profilePhotoInput.addEventListener("change", () => {
  const file = profilePhotoInput.files[0];
  if (!file) {
    profilePhotoPreview.src = "";
    return;
  }
  profilePhotoPreview.src = URL.createObjectURL(file);
});

// Load user data
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
    if (data.profilePhoto) profilePhotoPreview.src = data.profilePhoto;
  }

  saveProfileBtn.onclick = async () => {
    saveProfileBtn.disabled = true;

    let profilePhotoURL = profilePhotoPreview.src || null;

    try {
      // If a new file is selected, upload it
      const file = profilePhotoInput.files[0];
      if (file) {
        let contentType = file.type;
        if (!contentType) {
          const ext = file.name.split(".").pop().toLowerCase();
          if (["jpg", "jpeg", "png", "gif"].includes(ext)) contentType = "image/jpeg";
        }

        const safeName = encodeURIComponent(file.name);
        const storageRef = ref(storage, `yourspace-2026.appspot.com/profileImages/${user.uid}/${Date.now()}_${safeName}`);
        const snapshot = await uploadBytes(storageRef, file, { contentType });
        profilePhotoURL = await getDownloadURL(snapshot.ref);
      }

      // Save all profile info to Firestore
      await setDoc(userDocRef, {
        username: usernameInput.value.trim(),
        location: locationInput.value.trim(),
        bio: bioInput.value.trim(),
        music: musicInput.value.trim(),
        profilePhoto: profilePhotoURL
      }, { merge: true });

      alert("Profile saved!");
    } catch (err) {
      console.error("Failed to save profile:", err);
      alert("Profile save failed. Check console.");
    } finally {
      saveProfileBtn.disabled = false;
    }
  };
});
