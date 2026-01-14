import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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

// DOM
const displayNameEl = document.getElementById("displayName");
const profilePic = document.getElementById("profilePic");
const bioEl = document.getElementById("bio");
const locationEl = document.getElementById("location");
const profilePicInput = document.getElementById("profilePicInput");
const updateBtn = document.getElementById("updateProfileBtn");
const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

// Auth
onAuthStateChanged(auth, async (user) => {
  if (!user) window.location.href = "index.html";

  // Load profile
  const userSnap = await getDoc(doc(db, "users", user.uid));
  if (userSnap.exists()) {
    const data = userSnap.data();
    displayNameEl.textContent = data.displayName || "Anonymous";
    bioEl.textContent = data.bio || "";
    locationEl.textContent = data.location || "";
    profilePic.src = data.photoURL || "default-avatar.png";
  }

  // Navigation
  homeBtn.onclick = () => (window.location.href = "feed.html");
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  // Update profile
  updateBtn.onclick = async () => {
    let photoURL = profilePic.src;

    if (profilePicInput.files.length > 0) {
      const file = profilePicInput.files[0];
      const safeName = encodeURIComponent(file.name);
      const storageRef = ref(storage, `profilePictures/${user.uid}/${Date.now()}_${safeName}`);
      const snapshot = await uploadBytes(storageRef, file);
      photoURL = await getDownloadURL(snapshot.ref);
    }

    await updateDoc(doc(db, "users", user.uid), {
      photoURL,
      bio: bioEl.textContent,
      location: locationEl.textContent,
      updatedAt: serverTimestamp()
    });

    profilePic.src = photoURL;
    alert("Profile updated!");
  };
});
