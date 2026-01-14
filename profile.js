// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove 
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
const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");
const locationInput = document.getElementById("location");
const musicInput = document.getElementById("musicEmbed");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const profilePhotoPreview = document.getElementById("profilePhotoPreview");
const topFriendsInputs = document.querySelectorAll(".topFriendInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const logoutBtn = document.getElementById("logoutBtn");
const homeBtn = document.getElementById("homeBtn");

// -------------------- Auth --------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Nav buttons
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };
  homeBtn.onclick = () => (window.location.href = "feed.html");

  const userDocRef = doc(db, "users", user.uid);

  // Load user data
  const userSnap = await getDoc(userDocRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    displayNameInput.value = data.displayName || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    musicInput.value = data.musicEmbed || "";
    profilePhotoPreview.src = data.photoURL || "default-avatar.png";

    if (Array.isArray(data.topFriends)) {
      topFriendsInputs.forEach((input, idx) => {
        input.value = data.topFriends[idx] || "";
      });
    }
  }

  // Preview new photo
  profilePhotoInput.onchange = () => {
    const file = profilePhotoInput.files[0];
    if (!file) return;
    profilePhotoPreview.src = URL.createObjectURL(file);
  };

  // Save profile
  saveProfileBtn.onclick = async () => {
    saveProfileBtn.disabled = true;
    try {
      let photoURL = profilePhotoPreview.src;

      // Upload new profile photo if selected
      if (profilePhotoInput.files.length > 0) {
        const file = profilePhotoInput.files[0];
        let contentType = file.type;
        if (!contentType) {
          const ext = file.name.split(".").pop().toLowerCase();
          if (["jpg", "jpeg", "png", "gif"].includes(ext)) contentType = "image/jpeg";
        }

        const filePath = `profileImages/${user.uid}/${Date.now()}_${encodeURIComponent(file.name)}`;
        const storageRef = ref(storage, filePath);
        const snapshot = await uploadBytes(storageRef, file, { contentType });
        photoURL = await getDownloadURL(snapshot.ref);
      }

      const topFriends = Array.from(topFriendsInputs).map(i => i.value.trim()).filter(v => v);

      // Save all fields to Firestore
      await setDoc(userDocRef, {
        displayName: displayNameInput.value.trim() || "Anonymous",
        bio: bioInput.value.trim() || "",
        location: locationInput.value.trim() || "",
        musicEmbed: musicInput.value.trim() || "",
        photoURL,
        topFriends
      }, { merge: true });

      alert("Profile saved!");
    } catch (err) {
      console.error(err);
      alert("Failed to save profile. Check console.");
    } finally {
      saveProfileBtn.disabled = false;
    }
  };
});
