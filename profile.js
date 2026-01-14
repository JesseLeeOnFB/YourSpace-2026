import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, arrayUnion } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// Firebase config
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
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// DOM elements
const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const profilePhotoPreview = document.getElementById("profilePhotoPreview");
const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");
const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");

const topFriendsList = document.getElementById("topFriendsList");
const friendSearchInput = document.getElementById("friendSearchInput");
const friendSearchBtn = document.getElementById("friendSearchBtn");
const friendSearchResults = document.getElementById("friendSearchResults");

// NAVIGATION
document.getElementById("homeBtn").addEventListener("click", () => { window.location.href = "feed.html"; });
document.getElementById("profileBtn").addEventListener("click", () => { window.location.href = "profile.html"; });
document.getElementById("logoutBtn").addEventListener("click", async () => { 
  await auth.signOut();
  window.location.href = "index.html";
});

// AUTH STATE
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "index.html"; return; }
  loadProfile(user.uid);
});

// LOAD PROFILE
async function loadProfile(uid) {
  const userDoc = doc(db, "users", uid);
  const userSnap = await getDoc(userDoc);

  if (userSnap.exists()) {
    const data = userSnap.data();
    usernameInput.value = data.username || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.music || "";

    if (data.profilePhoto) profilePhotoPreview.src = data.profilePhoto;

    // Top 10 friends
    topFriendsList.innerHTML = "";
    const friends = data.topFriends || [];
    friends.forEach(f => {
      const li = document.createElement("li");
      li.textContent = f;
      topFriendsList.appendChild(li);
    });
  } else {
    // create empty document if doesn't exist
    await setDoc(userDoc, { topFriends: [] });
  }
}

// SAVE PROFILE INFO
saveProfileInfoBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  const userDoc = doc(db, "users", user.uid);
  await updateDoc(userDoc, {
    username: usernameInput.value,
    location: locationInput.value,
    bio: bioInput.value,
    music: musicInput.value
  });
  alert("Profile info saved!");
});

// SAVE PROFILE PHOTO
saveProfilePhotoBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  const file = profilePhotoInput.files[0];
  if (!file) { alert("Select a photo first."); return; }

  let contentType = file.type || "image/jpeg";
  const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
  try {
    const snapshot = await uploadBytes(storageRef, file, { contentType });
    const downloadURL = await getDownloadURL(snapshot.ref);

    const userDoc = doc(db, "users", user.uid);
    await updateDoc(userDoc, { profilePhoto: downloadURL });

    profilePhotoPreview.src = downloadURL;
    alert("Profile photo saved!");
  } catch (err) {
    console.error("Photo upload failed:", err);
    alert("Photo upload failed. Check console.");
  }
});

// FRIEND SEARCH
friendSearchBtn.addEventListener("click", async () => {
  const searchText = friendSearchInput.value.trim();
  friendSearchResults.innerHTML = "";
  if (!searchText) return;

  const usersCol = collection(db, "users");
  const q = query(usersCol, where("username", "==", searchText));
  const querySnap = await getDocs(q);

  if (querySnap.empty) {
    friendSearchResults.textContent = "No users found.";
    return;
  }

  querySnap.forEach(docSnap => {
    const userData = docSnap.data();
    const uid = docSnap.id;
    if (uid === auth.currentUser.uid) return; // skip self

    const div = document.createElement("div");
    div.textContent = userData.username;

    const addBtn = document.createElement("button");
    addBtn.textContent = "Add Friend";
    addBtn.addEventListener("click", async () => {
      const userDoc = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userDoc, { topFriends: arrayUnion(userData.username) });
      loadProfile(auth.currentUser.uid); // refresh
      alert(`Friend request sent to ${userData.username}`);
    });

    div.appendChild(addBtn);
    friendSearchResults.appendChild(div);
  });
});
