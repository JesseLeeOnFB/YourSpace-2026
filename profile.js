// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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
const profilePic = document.getElementById("profilePic");
const profilePicInput = document.getElementById("profilePicInput");
const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");
const locationInput = document.getElementById("location");
const customHTMLInput = document.getElementById("customHTML");
const musicEmbedInput = document.getElementById("musicEmbed");
const saveBtn = document.getElementById("saveBtn");

const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

/* -------------------- Auth & Navigation -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  homeBtn.onclick = () => window.location.href = "feed.html";
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  /* Load profile */
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    displayNameInput.value = data.displayName || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    customHTMLInput.value = data.customHTML || "";
    musicEmbedInput.value = data.musicEmbed || "";
    profilePic.src = data.photoURL || "default-avatar.png";
  }
});

/* -------------------- Profile Picture Upload -------------------- */
profilePicInput.addEventListener("change", async () => {
  const file = profilePicInput.files[0];
  if (!file) return;

  saveBtn.disabled = true;

  try {
    const safeName = encodeURIComponent(file.name);
    const path = `profileImages/${auth.currentUser.uid}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, path);

    const snapshot = await uploadBytes(storageRef, file, { contentType: file.type || "image/jpeg" });
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Update Firestore
    await updateDoc(doc(db, "users", auth.currentUser.uid), { photoURL: downloadURL });
    profilePic.src = downloadURL;

    alert("Profile picture updated!");
  } catch (err) {
    console.error("Profile pic upload failed:", err);
    alert("Failed to upload profile picture.");
  } finally {
    saveBtn.disabled = false;
  }
});

/* -------------------- Save Profile Changes -------------------- */
saveBtn.onclick = async () => {
  saveBtn.disabled = true;

  try {
    const updates = {
      displayName: displayNameInput.value.trim(),
      bio: bioInput.value.trim(),
      location: locationInput.value.trim(),
      customHTML: customHTMLInput.value.trim(),
      musicEmbed: musicEmbedInput.value.trim(),
      updatedAt: serverTimestamp()
    };

    await updateDoc(doc(db, "users", auth.currentUser.uid), updates);
    alert("Profile saved!");
  } catch (err) {
    console.error("Failed to save profile:", err);
    alert("Failed to save profile changes.");
  } finally {
    saveBtn.disabled = false;
  }
};
