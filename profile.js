// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.30.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.30.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.30.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.30.0/firebase-storage.js";

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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- Elements ---
const profilePicInput = document.getElementById("profilePicInput");
const profilePicDisplay = document.getElementById("profilePicDisplay");
const saveProfilePicBtn = document.getElementById("saveProfilePicBtn");

const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");

const friendsList = document.getElementById("friendsList");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const searchResults = document.getElementById("searchResults");

// --- Navigation ---
document.getElementById("homeBtn").addEventListener("click", () => window.location.href = "feed.html");
document.getElementById("profileBtn").addEventListener("click", () => window.location.href = "profile.html");
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "index.html";
});

// --- Load profile ---
onAuthStateChanged(auth, async user => {
  if (!user) return window.location.href = "index.html";

  const userRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    usernameInput.value = data.username || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.music || "";
    profilePicDisplay.src = data.profilePic || "defaultProfile.png";

    // Load friends
    friendsList.innerHTML = "";
    if (data.friends && data.friends.length) {
      data.friends.slice(0,10).forEach(f => {
        const li = document.createElement("li");
        li.textContent = f;
        friendsList.appendChild(li);
      });
    }
  } else {
    await setDoc(userRef, { username: "", location: "", bio: "", music: "", profilePic: "", friends: [] });
  }
});

// --- Save profile picture ---
saveProfilePicBtn.addEventListener("click", async () => {
  if (!auth.currentUser) return alert("Not signed in");
  const file = profilePicInput.files[0];
  if (!file) return alert("Select a file first");

  const ext = file.name.split('.').pop().toLowerCase();
  if (!["jpg","jpeg","png","gif"].includes(ext)) return alert("Invalid image type");

  const storageRef = ref(storage, `profileImages/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file, { contentType: file.type });
  const downloadURL = await getDownloadURL(snapshot.ref);

  await updateDoc(doc(db, "users", auth.currentUser.uid), { profilePic: downloadURL });
  profilePicDisplay.src = downloadURL;
  alert("Profile picture updated!");
});

// --- Save profile info ---
saveProfileInfoBtn.addEventListener("click", async () => {
  if (!auth.currentUser) return alert("Not signed in");

  const updates = {
    username: usernameInput.value,
    location: locationInput.value,
    bio: bioInput.value,
    music: musicInput.value
  };

  await updateDoc(doc(db, "users", auth.currentUser.uid), updates);
  alert("Profile info saved!");
});

// --- Search users ---
searchBtn.addEventListener("click", async () => {
  const queryText = searchInput.value.trim().toLowerCase();
  if (!queryText) return;

  const q = query(collection(db, "users"), where("username", ">=", queryText), where("username", "<=", queryText + "\uf8ff"));
  const snapshot = await getDocs(q);

  searchResults.innerHTML = "";
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.classList.add("searchResult");
    div.textContent = data.username;
    div.addEventListener("click", () => {
      window.location.href = `profileView.html?uid=${docSnap.id}`;
    });
    searchResults.appendChild(div);
  });
});
