// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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
const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

const profilePic = document.getElementById("profilePic");
const profilePicInput = document.getElementById("profilePicInput");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const musicInput = document.getElementById("musicInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const friendsContainer = document.getElementById("friendsContainer");

/* -------------------- Auth State -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const uid = user.uid;

  // Nav buttons
  homeBtn.onclick = () => window.location.href = "feed.html";
  profileBtn.onclick = () => window.location.href = "profile.html";
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  /* -------------------- Load Profile -------------------- */
  const userDocRef = doc(db, "users", uid);
  const userSnap = await getDoc(userDocRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    musicInput.value = data.music || "";
    if (data.profilePic) profilePic.src = data.profilePic;
  }

  /* -------------------- Upload Profile Picture -------------------- */
  profilePicInput.onchange = async () => {
    const file = profilePicInput.files[0];
    if (!file) return;

    try {
      let contentType = file.type;
      if (!contentType) {
        const ext = file.name.split(".").pop().toLowerCase();
        if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
      }

      const storageRef = ref(storage, `profileImages/${uid}/${Date.now()}_${encodeURIComponent(file.name)}`);
      const snapshot = await uploadBytes(storageRef, file, { contentType });
      const url = await getDownloadURL(snapshot.ref);
      profilePic.src = url;

      // Save immediately to Firestore
      await setDoc(userDocRef, { profilePic: url }, { merge: true });
    } catch (err) {
      console.error("Profile pic upload failed:", err);
      alert("Failed to upload profile picture.");
    }
  };

  /* -------------------- Save Profile Info -------------------- */
  saveProfileBtn.onclick = async () => {
    try {
      await setDoc(userDocRef, {
        username: usernameInput.value,
        bio: bioInput.value,
        location: locationInput.value,
        music: musicInput.value
      }, { merge: true });
      alert("Profile updated!");
    } catch (err) {
      console.error("Failed to save profile:", err);
      alert("Failed to save profile.");
    }
  };

  /* -------------------- Load Top 10 Friends -------------------- */
  try {
    const usersCol = collection(db, "users");
    const usersSnap = await getDocs(usersCol);
    friendsContainer.innerHTML = "";

    let friends = [];
    usersSnap.forEach(docSnap => {
      if (docSnap.id !== uid) friends.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Top 10 only
    friends.slice(0,10).forEach(friend => {
      const div = document.createElement("div");
      div.className = "friendBox";
      div.textContent = friend.username || "Anonymous";
      friendsContainer.appendChild(div);
    });
  } catch (err) {
    console.error("Failed to load friends:", err);
  }
});
