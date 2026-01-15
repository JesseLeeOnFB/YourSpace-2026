import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

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
const profilePhoto = document.getElementById("profilePhoto");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");

const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");

const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");

const topFriendsList = document.getElementById("topFriendsList");
const friendRequestsList = document.getElementById("friendRequestsList");

// --- Load user profile ---
onAuthStateChanged(auth, async user => {
  if (!user) return window.location.href = "index.html";

  const userDocRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDocRef);
  const data = userSnap.data();

  // Populate inputs
  profilePhoto.src = data.profilePic || "";
  usernameInput.value = data.username || "";
  locationInput.value = data.location || "";
  bioInput.value = data.bio || "";
  musicInput.value = data.music || "";
  themeSelect.value = data.theme || "";

  // Top friends
  topFriendsList.innerHTML = "";
  if (data.topFriends && data.topFriends.length > 0) {
    data.topFriends.forEach(friendUsername => {
      const li = document.createElement("li");
      li.textContent = friendUsername;
      topFriendsList.appendChild(li);
    });
  }

  // --- Friend Requests ---
  friendRequestsList.innerHTML = "";
  if (data.friendRequests && data.friendRequests.length > 0) {
    data.friendRequests.forEach(async requestUid => {
      const requestUserDoc = await getDoc(doc(db, "users", requestUid));
      const requestUser = requestUserDoc.data();
      const li = document.createElement("li");
      li.textContent = requestUser.username || "Anonymous";

      const acceptBtn = document.createElement("button");
      acceptBtn.textContent = "Accept";
      acceptBtn.addEventListener("click", async () => {
        try {
          await updateDoc(doc(db, "users", auth.currentUser.uid), { friends: arrayUnion(requestUid), friendRequests: arrayRemove(requestUid) });
          await updateDoc(doc(db, "users", requestUid), { friends: arrayUnion(auth.currentUser.uid) });
          li.remove();
          alert("Friend added!");
        } catch(err) { console.error(err); alert("Failed to accept friend"); }
      });

      const declineBtn = document.createElement("button");
      declineBtn.textContent = "Decline";
      declineBtn.addEventListener("click", async () => {
        try {
          await updateDoc(doc(db, "users", auth.currentUser.uid), { friendRequests: arrayRemove(requestUid) });
          li.remove();
        } catch(err) { console.error(err); alert("Failed to decline friend request"); }
      });

      li.appendChild(acceptBtn);
      li.appendChild(declineBtn);
      friendRequestsList.appendChild(li);
    });
  }
});

// --- Save profile info ---
saveProfileInfoBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await updateDoc(doc(db, "users", user.uid), {
      username: usernameInput.value,
      location: locationInput.value,
      bio: bioInput.value,
      music: musicInput.value
    });
    alert("Profile info saved!");
  } catch(err) { console.error(err); alert("Failed to save profile info"); }
});

// --- Save profile photo ---
saveProfilePhotoBtn.addEventListener("click", async () => {
  const file = profilePhotoInput.files[0];
  if (!file) return alert("Select a photo first");

  const storageRef = ref(storage, `profileImages/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    await updateDoc(doc(db, "users", auth.currentUser.uid), { profilePic: downloadURL });
    profilePhoto.src = downloadURL;
    alert("Profile photo updated!");
  } catch(err) { console.error(err); alert("Failed to save profile photo"); }
});

// --- Save theme ---
saveThemeBtn.addEventListener("click", async () => {
  const theme = themeSelect.value;
  if (!theme) return alert("Select a theme");

  try {
    await updateDoc(doc(db, "users", auth.currentUser.uid), { theme });
    document.body.className = theme;
    alert("Theme saved!");
  } catch(err) { console.error(err); alert("Failed to save theme"); }
});
