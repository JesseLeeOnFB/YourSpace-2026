import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

// --- CONFIG ---
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

// --- ELEMENTS ---
const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const profilePhotoImg = document.getElementById("profilePhotoImg");

const saveProfileBtn = document.getElementById("saveProfileBtn");
const savePhotoBtn = document.getElementById("savePhotoBtn");

const friendsList = document.getElementById("friendsList");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const searchResults = document.getElementById("searchResults");

// --- LOAD PROFILE ---
async function loadProfile() {
  if (!auth.currentUser) return;
  const userDocRef = doc(db, "users", auth.currentUser.uid);
  const userSnap = await getDoc(userDocRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    usernameInput.value = data.username || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.music || "";
    if (data.profilePhotoURL) profilePhotoImg.src = data.profilePhotoURL;
    if (data.topFriends) renderFriends(data.topFriends);
  }
}

// --- SAVE PROFILE INFO (TEXT) ---
saveProfileBtn.addEventListener("click", async () => {
  if (!auth.currentUser) return;
  const userDocRef = doc(db, "users", auth.currentUser.uid);
  await setDoc(userDocRef, {
    username: usernameInput.value,
    location: locationInput.value,
    bio: bioInput.value,
    music: musicInput.value,
  }, { merge: true });
  alert("Profile updated!");
});

// --- UPLOAD PROFILE PHOTO ---
savePhotoBtn.addEventListener("click", async () => {
  if (!auth.currentUser || !profilePhotoInput.files[0]) return;

  const file = profilePhotoInput.files[0];
  let contentType = file.type;
  if (!contentType) contentType = "image/jpeg";

  const storageRef = ref(storage, `profileImages/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
  try {
    const snapshot = await uploadBytes(storageRef, file, { contentType });
    const downloadURL = await getDownloadURL(snapshot.ref);

    const userDocRef = doc(db, "users", auth.currentUser.uid);
    await updateDoc(userDocRef, { profilePhotoURL: downloadURL });

    profilePhotoImg.src = downloadURL;
    alert("Profile photo updated!");
  } catch (err) {
    console.error("Photo upload failed:", err);
    alert("Photo upload failed. Check console.");
  }
});

// --- FRIENDS MANAGEMENT ---
function renderFriends(friends) {
  friendsList.innerHTML = "";
  friends.forEach(friend => {
    const li = document.createElement("li");
    li.textContent = friend;
    friendsList.appendChild(li);
  });
}

// --- SEARCH USERS ---
searchBtn.addEventListener("click", async () => {
  const queryText = searchInput.value.toLowerCase();
  searchResults.innerHTML = "";
  const usersCol = await getDoc(doc(db, "users", auth.currentUser.uid));
  // For simplicity, scan all users
  // In production, implement proper Firestore queries
  const usersSnap = await db.collection("users").get?.(); // optional, depends on SDK version
  if (!usersSnap) return;
  usersSnap.forEach(docSnap => {
    const data = docSnap.data();
    if (data.username && data.username.toLowerCase().includes(queryText)) {
      const div = document.createElement("div");
      div.textContent = data.username;
      const addBtn = document.createElement("button");
      addBtn.textContent = "Add Friend";
      addBtn.addEventListener("click", async () => {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        let topFriends = userSnap.data()?.topFriends || [];
        if (!topFriends.includes(data.username)) topFriends.push(data.username);
        await updateDoc(userDocRef, { topFriends });
        renderFriends(topFriends);
        alert(`Friend request sent to ${data.username}!`);
      });
      div.appendChild(addBtn);
      searchResults.appendChild(div);
    }
  });
});

// --- INITIAL LOAD ---
auth.onAuthStateChanged(user => {
  if (user) {
    loadProfile();
  } else {
    // redirect to login if needed
    window.location.href = "index.html";
  }
});
