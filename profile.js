import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// ---------- Firebase Config ----------
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

// ---------- Elements ----------
const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

const profilePhoto = document.getElementById("profilePhoto");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");

const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");

const themeSelect = document.getElementById("themeSelect");
const applyThemeBtn = document.getElementById("applyThemeBtn");

const friendsList = document.getElementById("friendsList");
const addFriendInput = document.getElementById("addFriendInput");
const addFriendBtn = document.getElementById("addFriendBtn");

const searchUserInput = document.getElementById("searchUserInput");
const searchUserBtn = document.getElementById("searchUserBtn");
const searchResults = document.getElementById("searchResults");

// ---------- Navigation ----------
homeBtn.addEventListener("click", () => window.location.href = "feed.html");
profileBtn.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn.addEventListener("click", () => {
  signOut(auth).then(() => window.location.href = "index.html");
});

// ---------- Load Profile ----------
onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = "index.html";

  const userDocRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDocRef);
  const userData = userSnap.exists() ? userSnap.data() : {};

  usernameInput.value = userData.username || "";
  locationInput.value = userData.location || "";
  bioInput.value = userData.bio || "";
  musicInput.value = userData.music || "";
  profilePhoto.src = userData.photoURL || "default-profile.png";

  // Load top 10 friends
  const friends = userData.friends || [];
  friendsList.innerHTML = "";
  friends.forEach(f => {
    const li = document.createElement("li");
    li.textContent = f;
    friendsList.appendChild(li);
  });
});

// ---------- Save Profile Photo ----------
saveProfilePhotoBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user || !profilePhotoInput.files[0]) return alert("Select a photo first!");

  const file = profilePhotoInput.files[0];
  let contentType = file.type || "image/jpeg";

  const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
  try {
    const snapshot = await uploadBytes(storageRef, file, { contentType });
    const downloadURL = await getDownloadURL(snapshot.ref);

    await updateDoc(doc(db, "users", user.uid), { photoURL: downloadURL });
    profilePhoto.src = downloadURL;
    alert("Profile photo updated!");
  } catch (err) {
    console.error(err);
    alert("Failed to upload photo.");
  }
});

// ---------- Save Profile Info ----------
saveProfileInfoBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Not logged in!");

  try {
    await setDoc(doc(db, "users", user.uid), {
      username: usernameInput.value,
      location: locationInput.value,
      bio: bioInput.value,
      music: musicInput.value
    }, { merge: true });
    alert("Profile info saved!");
  } catch (err) {
    console.error(err);
    alert("Failed to save profile info.");
  }
});

// ---------- Apply Theme ----------
applyThemeBtn.addEventListener("click", () => {
  document.body.className = themeSelect.value;
});

// ---------- Add Friend ----------
addFriendBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user || !addFriendInput.value) return;

  const friendName = addFriendInput.value.trim();
  await updateDoc(doc(db, "users", user.uid), { friends: arrayUnion(friendName) });

  const li = document.createElement("li");
  li.textContent = friendName;
  friendsList.appendChild(li);
  addFriendInput.value = "";
});

// ---------- Search Users ----------
searchUserBtn.addEventListener("click", async () => {
  searchResults.innerHTML = "";
  const searchQuery = searchUserInput.value.trim().toLowerCase();
  if (!searchQuery) return;

  const usersSnapshot = await getDoc(doc(db, "users", searchQuery)); // Using username as doc ID
  if (usersSnapshot.exists()) {
    const li = document.createElement("li");
    li.textContent = usersSnapshot.data().username || searchQuery;
    searchResults.appendChild(li);
  } else {
    searchResults.innerHTML = "<li>No users found</li>";
  }
});
