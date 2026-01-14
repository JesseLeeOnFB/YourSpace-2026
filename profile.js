// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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

/* -------------------- DOM Elements -------------------- */
const profileAvatar = document.getElementById("profileAvatar");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const musicInput = document.getElementById("musicInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const topFriendsList = document.getElementById("topFriendsList");
const addFriendInput = document.getElementById("addFriendInput");
const addFriendBtn = document.getElementById("addFriendBtn");

const profileBtn = document.getElementById("profileBtn");
const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

/* -------------------- Auth -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const uid = user.uid;

  /* Nav Buttons */
  profileBtn.onclick = () => (window.location.href = "profile.html");
  homeBtn.onclick = () => (window.location.href = "feed.html");
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  /* -------------------- Load Profile -------------------- */
  const userDocRef = doc(db, "users", uid);
  const userSnap = await getDoc(userDocRef);
  let userData = userSnap.exists() ? userSnap.data() : {};

  usernameInput.value = userData.username || "";
  bioInput.value = userData.bio || "";
  locationInput.value = userData.location || "";
  musicInput.value = userData.music || "";

  if (userData.photoURL) {
    profileAvatar.src = userData.photoURL;
  }

  // Top 10 friends
  const friends = userData.topFriends || [];
  friends.forEach(friend => {
    const li = document.createElement("li");
    li.textContent = friend;
    topFriendsList.appendChild(li);
  });

  /* -------------------- Add Friend -------------------- */
  addFriendBtn.onclick = async () => {
    const friendName = addFriendInput.value.trim();
    if (!friendName) return;
    try {
      await updateDoc(userDocRef, { topFriends: arrayUnion(friendName) });
      const li = document.createElement("li");
      li.textContent = friendName;
      topFriendsList.appendChild(li);
      addFriendInput.value = "";
    } catch (err) {
      alert("Failed to add friend");
      console.error(err);
    }
  };

  /* -------------------- Save Profile -------------------- */
  saveProfileBtn.onclick = async () => {
    saveProfileBtn.disabled = true;

    try {
      let photoURL = userData.photoURL || "";

      // Upload new profile photo if selected
      const file = profilePhotoInput.files[0];
      if (file) {
        let contentType = file.type;
        if (!contentType) {
          const ext = file.name.split(".").pop().toLowerCase();
          if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
        }

        const storageRef = ref(storage, `profileImages/${uid}/${Date.now()}_${encodeURIComponent(file.name)}`);
        const snapshot = await uploadBytes(storageRef, file, { contentType });
        photoURL = await getDownloadURL(snapshot.ref);
      }

      // Update Firestore
      await setDoc(userDocRef, {
        username: usernameInput.value,
        bio: bioInput.value,
        location: locationInput.value,
        music: musicInput.value,
        photoURL,
        topFriends: friends
      }, { merge: true });

      alert("Profile saved successfully!");
    } catch (err) {
      alert("Failed to save profile. Check console.");
      console.error(err);
    } finally {
      saveProfileBtn.disabled = false;
    }
  };
});
