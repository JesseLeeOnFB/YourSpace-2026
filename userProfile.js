import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs, arrayUnion } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

// --- Firebase Config ---
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

// --- DOM Elements ---
const profilePic = document.getElementById("profilePic");
const profilePicInput = document.getElementById("profilePicInput");
const saveProfilePicBtn = document.getElementById("saveProfilePicBtn");

const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");

const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");

const topFriendsList = document.getElementById("topFriendsList");

const searchUserInput = document.getElementById("searchUserInput");
const searchUserBtn = document.getElementById("searchUserBtn");
const searchResults = document.getElementById("searchResults");

// --- Load Current Profile ---
auth.onAuthStateChanged(async (user) => {
  if (!user) return window.location.href = "index.html";

  const userDocRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDocRef);
  const data = userSnap.data();

  if (!data) return;

  usernameInput.value = data.username || "";
  locationInput.value = data.location || "";
  bioInput.value = data.bio || "";
  musicInput.value = data.music || "";
  profilePic.src = data.photoURL || "";
  document.body.className = data.theme || "default";

  // Load Top Friends
  const topFriends = data.topFriends || [];
  topFriendsList.innerHTML = "";
  topFriends.forEach(f => {
    const li = document.createElement("li");
    li.textContent = f;
    topFriendsList.appendChild(li);
  });
});

// --- Save Profile Picture ---
saveProfilePicBtn.addEventListener("click", async () => {
  if (!profilePicInput.files[0]) return alert("Select a photo");
  const file = profilePicInput.files[0];
  const storageRef = ref(storage, `profileImages/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(storageRef);

  await updateDoc(doc(db, "users", auth.currentUser.uid), { photoURL: url });
  profilePic.src = url;
  alert("Profile picture updated!");
});

// --- Save Profile Info ---
saveProfileInfoBtn.addEventListener("click", async () => {
  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    username: usernameInput.value,
    location: locationInput.value,
    bio: bioInput.value,
    music: musicInput.value
  });
  alert("Profile info saved!");
});

// --- Save Theme ---
saveThemeBtn.addEventListener("click", async () => {
  const theme = themeSelect.value;
  if (!theme) return alert("Select a theme");
  document.body.className = theme;
  await updateDoc(doc(db, "users", auth.currentUser.uid), { theme });
  alert("Theme updated!");
});

// --- Friend Search ---
searchUserBtn.addEventListener("click", async () => {
  const queryName = searchUserInput.value.trim();
  if (!queryName) return alert("Enter a username");

  const usersRef = collection(db, "users");
  const qSnapshot = await getDocs(query(usersRef, where("username", "==", queryName)));

  searchResults.innerHTML = "";

  if (qSnapshot.empty) {
    searchResults.textContent = "No users found";
    return;
  }

  qSnapshot.forEach(docSnap => {
    const data = docSnap.data();
    const uid = docSnap.id;

    const div = document.createElement("div");
    div.className = "searchResult";
    div.innerHTML = `
      <span>${data.username}</span>
      <button class="viewProfileBtn">View Profile</button>
      <button class="sendRequestBtn">Add Friend</button>
    `;

    // View Profile
    div.querySelector(".viewProfileBtn").addEventListener("click", () => {
      window.location.href = `userProfile.html?uid=${uid}`;
    });

    // Add Friend / Send Request
    const sendBtn = div.querySelector(".sendRequestBtn");
    if (data.friends?.includes(auth.currentUser.uid)) {
      sendBtn.disabled = true;
      sendBtn.textContent = "Friend";
    } else if (data.friendRequests?.includes(auth.currentUser.uid)) {
      sendBtn.disabled = true;
      sendBtn.textContent = "Request Sent";
    }

    sendBtn.addEventListener("click", async () => {
      await updateDoc(doc(db, "users", uid), { friendRequests: arrayUnion(auth.currentUser.uid) });
      sendBtn.disabled = true;
      sendBtn.textContent = "Request Sent";
    });

    searchResults.appendChild(div);
  });
});
