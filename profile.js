// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

/* -------------------- Firebase Config -------------------- */
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
const profilePhoto = document.getElementById("profilePhoto");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const usernameInput = document.getElementById("username");
const bioInput = document.getElementById("bio");
const locationInput = document.getElementById("location");
const musicInput = document.getElementById("music");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const topFriendsList = document.getElementById("topFriendsList");

const searchInput = document.getElementById("searchUserInput");
const searchBtn = document.getElementById("searchUserBtn");
const searchResults = document.getElementById("searchResults");

const profileBtn = document.getElementById("profileBtn");
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
  profileBtn.onclick = () => (window.location.href = "profile.html");
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  const userDocRef = doc(db, "users", user.uid);

  // Load profile
  const userSnap = await getDoc(userDocRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    usernameInput.value = data.displayName || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    musicInput.value = data.music || "";
    profilePhoto.src = data.photoURL || "https://via.placeholder.com/100";

    // Top 10 friends
    topFriendsList.innerHTML = "";
    (data.topFriends || []).forEach(friend => {
      const f = document.createElement("div");
      f.textContent = friend;
      topFriendsList.appendChild(f);
    });
  }

  // Save profile
  saveProfileBtn.onclick = async () => {
    saveProfileBtn.disabled = true;
    let photoURL = profilePhoto.src;

    // If a new photo selected, upload
    if (profilePhotoInput.files.length > 0) {
      const file = profilePhotoInput.files[0];
      let contentType = file.type;
      if (!contentType) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
      }
      const fileRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${encodeURIComponent(file.name)}`);
      const snapshot = await uploadBytes(fileRef, file, { contentType });
      photoURL = await getDownloadURL(snapshot.ref);
    }

    // Save profile fields
    await setDoc(userDocRef, {
      displayName: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value,
      music: musicInput.value,
      photoURL: photoURL,
      topFriends: (userSnap.exists() ? userSnap.data().topFriends : []) || []
    }, { merge: true });

    alert("Profile saved!");
    saveProfileBtn.disabled = false;
    profilePhoto.src = photoURL;
  };

  // Search users
  searchBtn.onclick = async () => {
    const term = searchInput.value.trim().toLowerCase();
    if (!term) return;
    const usersCol = collection(db, "users");
    const q = query(usersCol, where("displayName", ">=", term), where("displayName", "<=", term + "\uf8ff"));
    const snap = await getDocs(q);
    searchResults.innerHTML = "";
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const div = document.createElement("div");
      div.textContent = data.displayName + " (" + (data.location || "Unknown") + ")";
      searchResults.appendChild(div);
    });
  };

});
