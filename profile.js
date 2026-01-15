import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

const profilePicInput = document.getElementById("profilePicInput");
const profilePicPreview = document.getElementById("profilePicPreview");
const saveProfilePicBtn = document.getElementById("saveProfilePicBtn");

const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");

const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");

const topFriendsContainer = document.getElementById("topFriendsContainer");
const saveTopFriendsBtn = document.getElementById("saveTopFriendsBtn");

let currentUserId;

// Load profile info
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  currentUserId = user.uid;

  const userDoc = await getDoc(doc(db, "users", currentUserId));
  if (userDoc.exists()) {
    const data = userDoc.data();

    usernameInput.value = data.username || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.music || "";
    themeSelect.value = data.theme || "";
    profilePicPreview.src = data.profilePic || "";

    // Top friends inputs
    topFriendsContainer.innerHTML = "";
    const topFriends = data.topFriends ? data.topFriends.split(",") : [];
    for (let i = 0; i < 10; i++) {
      const friendInput = document.createElement("input");
      friendInput.type = "text";
      friendInput.placeholder = `Top Friend #${i + 1}`;
      friendInput.value = topFriends[i] || "";
      topFriendsContainer.appendChild(friendInput);
    }

    // Music player
    if (data.music) {
      document.getElementById("musicPlayer").src = data.music;
    }
  }
});

// Save profile picture
saveProfilePicBtn.addEventListener("click", async () => {
  const file = profilePicInput.files[0];
  if (!file) return alert("Select a file first");

  const storageRef = ref(storage, `profileImages/${currentUserId}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);

  await updateDoc(doc(db, "users", currentUserId), { profilePic: downloadURL });
  profilePicPreview.src = downloadURL;
  alert("Profile picture updated!");
});

// Save profile info
saveProfileInfoBtn.addEventListener("click", async () => {
  await updateDoc(doc(db, "users", currentUserId), {
    username: usernameInput.value,
    location: locationInput.value,
    bio: bioInput.value,
    music: musicInput.value
  });
  alert("Profile info saved!");
  document.getElementById("musicPlayer").src = musicInput.value;
});

// Save theme
saveThemeBtn.addEventListener("click", async () => {
  await updateDoc(doc(db, "users", currentUserId), { theme: themeSelect.value });
  document.body.className = themeSelect.value;
  alert("Theme updated!");
});

// Save top friends
saveTopFriendsBtn.addEventListener("click", async () => {
  const friendInputs = topFriendsContainer.querySelectorAll("input");
  const friendsArray = Array.from(friendInputs).map(f => f.value.trim()).filter(f => f);
  await updateDoc(doc(db, "users", currentUserId), { topFriends: friendsArray.join(",") });
  alert("Top friends saved!");
});

// Nav buttons
document.getElementById("homeBtn").addEventListener("click", () => window.location.href = "feed.html");
document.getElementById("profileBtn").addEventListener("click", () => window.location.href = "profile.html");
document.getElementById("logoutBtn").addEventListener("click", () => auth.signOut().then(() => window.location.href = "index.html")));
