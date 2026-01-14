// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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
const pfpInput = document.getElementById("profilePfpInput");
const pfpImg = document.getElementById("profilePfpImg");
const savePfpBtn = document.getElementById("savePfpBtn");

/* -------------------- Auth -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Load profile info
  const userSnap = await getDoc(doc(db, "users", user.uid));
  const profile = userSnap.exists() ? userSnap.data() : {};
  pfpImg.src = profile.photoURL || "default-avatar.png";

  // Preview new PFP
  pfpInput.addEventListener("change", () => {
    const file = pfpInput.files[0];
    if (!file) return;
    pfpImg.src = URL.createObjectURL(file);
  });

  // Save new profile picture
  savePfpBtn.onclick = async () => {
    const file = pfpInput.files[0];
    if (!file) return alert("Select a picture first!");

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return alert("Only JPEG, PNG, or GIF images are allowed.");
    }

    const storageRef = ref(storage, `profileImages/${user.uid}/profile_${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file, { contentType: file.type });
    const photoURL = await getDownloadURL(snapshot.ref);

    // Update Firestore
    await updateDoc(doc(db, "users", user.uid), { photoURL });
    alert("Profile picture updated!");
  };
});
