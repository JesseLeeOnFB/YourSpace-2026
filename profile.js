import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

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
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// DOM elements
const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const profilePicInput = document.getElementById("profilePicInput");
const profileImage = document.getElementById("profileImage");
const themeSelect = document.getElementById("themeSelect");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const saveThemeBtn = document.getElementById("saveThemeBtn");
const topFriendsContainer = document.getElementById("topFriendsContainer");
const addFriendInput = document.getElementById("addFriendInput");
const sendFriendRequestBtn = document.getElementById("sendFriendRequestBtn");
const friendRequestsContainer = document.getElementById("friendRequestsContainer");

let currentUserId = null;
let currentUserData = null;

// Wait for auth
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html"; // redirect if not signed in
    return;
  }
  currentUserId = user.uid;
  await loadProfile(currentUserId);
});

// Load profile info
async function loadProfile(uid) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return console.error("User not found");
  
  currentUserData = userSnap.data();

  usernameInput.value = currentUserData.username || "";
  locationInput.value = currentUserData.location || "";
  bioInput.value = currentUserData.bio || "";
  musicInput.value = currentUserData.music || "";
  themeSelect.value = currentUserData.theme || "";
  profileImage.src = currentUserData.profilePic || "defaultProfile.png";

  renderTopFriends();
  renderFriendRequests();
}

// Save profile info (username, bio, location, music)
saveProfileBtn.addEventListener("click", async () => {
  if (!currentUserId) return;

  const userRef = doc(db, "users", currentUserId);
  try {
    await updateDoc(userRef, {
      username: usernameInput.value,
      location: locationInput.value,
      bio: bioInput.value,
      music: musicInput.value
    });
    alert("Profile saved!");
  } catch (err) {
    console.error(err);
    alert("Failed to save profile");
  }
});

// Change profile picture
profilePicInput.addEventListener("change", async (e) => {
  if (!currentUserId) return;
  const file = e.target.files[0];
  if (!file) return;

  let contentType = file.type || "image/jpeg";

  const storageRef = ref(storage, `profileImages/${currentUserId}/${Date.now()}_${file.name}`);
  try {
    const snapshot = await uploadBytes(storageRef, file, { contentType });
    const downloadURL = await getDownloadURL(snapshot.ref);

    const userRef = doc(db, "users", currentUserId);
    await updateDoc(userRef, { profilePic: downloadURL });
    profileImage.src = downloadURL;

    alert("Profile picture updated!");
  } catch (err) {
    console.error(err);
    alert("Failed to upload profile picture");
  }
});

// Save theme
saveThemeBtn.addEventListener("click", async () => {
  if (!currentUserId) return;
  const userRef = doc(db, "users", currentUserId);
  try {
    await updateDoc(userRef, { theme: themeSelect.value });
    document.body.className = themeSelect.value;
    alert("Theme saved!");
  } catch (err) {
    console.error(err);
    alert("Failed to save theme");
  }
});

// Render top friends
function renderTopFriends() {
  topFriendsContainer.innerHTML = "";
  if (!currentUserData.topFriends) return;
  currentUserData.topFriends.forEach((friendUsername) => {
    const div = document.createElement("div");
    div.textContent = friendUsername;
    topFriendsContainer.appendChild(div);
  });
}

// Friend requests
function renderFriendRequests() {
  friendRequestsContainer.innerHTML = "";
  if (!currentUserData.friendRequests) return;
  currentUserData.friendRequests.forEach(async (requestUid) => {
    const reqRef = doc(db, "users", requestUid);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) return;
    const requestUser = reqSnap.data();

    const div = document.createElement("div");
    div.textContent = requestUser.username || "Anonymous";

    const acceptBtn = document.createElement("button");
    acceptBtn.textContent = "Accept";
    acceptBtn.onclick = async () => {
      await updateDoc(doc(db, "users", currentUserId), {
        friends: arrayUnion(requestUid),
        friendRequests: arrayRemove(requestUid)
      });
      await updateDoc(doc(db, "users", requestUid), {
        friends: arrayUnion(currentUserId)
      });
      await loadProfile(currentUserId);
    };

    const declineBtn = document.createElement("button");
    declineBtn.textContent = "Decline";
    declineBtn.onclick = async () => {
      await updateDoc(doc(db, "users", currentUserId), {
        friendRequests: arrayRemove(requestUid)
      });
      await loadProfile(currentUserId);
    };

    div.appendChild(acceptBtn);
    div.appendChild(declineBtn);
    friendRequestsContainer.appendChild(div);
  });
}

// Send friend request
sendFriendRequestBtn.addEventListener("click", async () => {
  const targetUsername = addFriendInput.value.trim();
  if (!targetUsername) return;

  // Find user by username
  const usersSnap = await getDoc(doc(db, "users", targetUsername));
  if (!usersSnap.exists()) {
    alert("User not found");
    return;
  }

  const targetUid = usersSnap.id;

  // Add to friendRequests of target
  await updateDoc(doc(db, "users", targetUid), {
    friendRequests: arrayUnion(currentUserId)
  });

  alert("Friend request sent!");
});
