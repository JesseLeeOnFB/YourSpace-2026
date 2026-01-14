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
const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const profilePicInput = document.getElementById("profilePicInput");
const profilePicPreview = document.getElementById("profilePicPreview");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const musicInput = document.getElementById("musicInput");
const musicPlayer = document.getElementById("musicPlayer");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const addFriendInput = document.getElementById("addFriendInput");
const addFriendBtn = document.getElementById("addFriendBtn");
const friendsList = document.getElementById("friendsList");

/* -------------------- Auth & Nav -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Nav buttons
  homeBtn.onclick = () => (window.location.href = "feed.html");
  profileBtn.onclick = () => (window.location.href = "profile.html");
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  // Load profile
  const userDocRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDocRef);
  const profile = userSnap.exists() ? userSnap.data() : {};

  if (profile.username) usernameInput.value = profile.username;
  if (profile.bio) bioInput.value = profile.bio;
  if (profile.location) locationInput.value = profile.location;
  if (profile.musicURL) {
    musicInput.value = profile.musicURL;
    musicPlayer.innerHTML = `<iframe width="300" height="80" src="${profile.musicURL}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  }
  if (profile.profilePicURL) profilePicPreview.src = profile.profilePicURL;

  // Load top friends
  friendsList.innerHTML = "";
  if (profile.topFriends && profile.topFriends.length > 0) {
    profile.topFriends.forEach(f => {
      const fEl = document.createElement("p");
      fEl.textContent = f;
      friendsList.appendChild(fEl);
    });
  }
});

/* -------------------- Profile Picture Preview -------------------- */
profilePicInput.addEventListener("change", () => {
  const file = profilePicInput.files[0];
  if (!file) return;
  profilePicPreview.src = URL.createObjectURL(file);
});

/* -------------------- Save Profile -------------------- */
saveProfileBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  saveProfileBtn.disabled = true;

  try {
    let profilePicURL = "";
    const file = profilePicInput.files[0];
    if (file) {
      let contentType = file.type;
      if (!contentType) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
      }
      const fileRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${encodeURIComponent(file.name)}`);
      const snapshot = await uploadBytes(fileRef, file, { contentType });
      profilePicURL = await getDownloadURL(snapshot.ref);
    }

    await setDoc(doc(db, "users", user.uid), {
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value,
      musicURL: musicInput.value,
      profilePicURL
    }, { merge: true });

    alert("Profile saved successfully!");
  } catch (err) {
    console.error(err);
    alert("Failed to save profile. Check console.");
  } finally {
    saveProfileBtn.disabled = false;
  }
});

/* -------------------- Add Friend -------------------- */
addFriendBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  const friendName = addFriendInput.value.trim();
  if (!friendName) return;
  try {
    const userDocRef = doc(db, "users", user.uid);
    await updateDoc(userDocRef, {
      topFriends: arrayUnion(friendName)
    });
    const fEl = document.createElement("p");
    fEl.textContent = friendName;
    friendsList.appendChild(fEl);
    addFriendInput.value = "";
  } catch (err) {
    console.error(err);
    alert("Failed to add friend.");
  }
});
