// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  arrayUnion
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
const pfpInput = document.getElementById("pfpInput");
const pfpPreview = document.getElementById("pfpPreview");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const top10Input = document.getElementById("top10Friends");
const musicInput = document.getElementById("musicEmbed");
const themeInput = document.getElementById("themeSelect");

const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

/* -------------------- Auth -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Nav
  homeBtn.onclick = () => (window.location.href = "feed.html");
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  // Load user profile
  const userDocRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDocRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    usernameInput.value = data.displayName || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    top10Input.value = data.top10 ? data.top10.join(", ") : "";
    musicInput.value = data.musicEmbed || "";
    themeInput.value = data.theme || "";
    if (data.photoURL) {
      pfpPreview.src = data.photoURL;
      pfpPreview.style.display = "block";
    }
  }

  // Profile picture preview
  pfpInput.addEventListener("change", () => {
    const file = pfpInput.files[0];
    if (!file) {
      pfpPreview.style.display = "none";
      return;
    }
    pfpPreview.src = URL.createObjectURL(file);
    pfpPreview.style.display = "block";
  });

  // Save profile
  saveProfileBtn.onclick = async () => {
    saveProfileBtn.disabled = true;
    try {
      let photoURL = "";

      if (pfpInput.files[0]) {
        const file = pfpInput.files[0];
        let contentType = file.type || "image/jpeg";
        const safeName = encodeURIComponent(file.name);
        const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${safeName}`);
        const snapshot = await uploadBytes(storageRef, file, { contentType });
        photoURL = await getDownloadURL(snapshot.ref);
      }

      const top10Array = top10Input.value.split(",").map(t => t.trim()).filter(Boolean);

      await setDoc(userDocRef, {
        displayName: usernameInput.value || "Anonymous",
        bio: bioInput.value || "",
        location: locationInput.value || "",
        photoURL: photoURL || pfpPreview.src || "",
        top10: top10Array,
        musicEmbed: musicInput.value || "",
        theme: themeInput.value || ""
      }, { merge: true });

      alert("Profile saved!");
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Failed to save profile. Check console.");
    } finally {
      saveProfileBtn.disabled = false;
    }
  };
});
