import { getAuth } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-storage.js";

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// ------------------------
// ELEMENTS
// ------------------------
const profilePhotoInput = document.getElementById("profilePhotoInput");
const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");
const profilePhoto = document.getElementById("profilePhoto");

const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const saveProfileInfoBtn = document.getElementById("saveProfileInfoBtn");

const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");

const topFriendInput = document.getElementById("topFriendInput");
const addTopFriendBtn = document.getElementById("addTopFriendBtn");
const topFriendsList = document.getElementById("topFriendsList");

const friendSearchInput = document.getElementById("friendSearchInput");
const friendSearchBtn = document.getElementById("friendSearchBtn");
const friendSearchResults = document.getElementById("friendSearchResults");

// ------------------------
// LOAD USER DATA
// ------------------------
async function loadProfile() {
  const userId = auth.currentUser.uid;
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    profilePhoto.src = data.photoURL || "";
    usernameInput.value = data.username || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.music || "";
    themeSelect.value = data.theme || "default";

    // Top friends
    topFriendsList.innerHTML = "";
    if (data.topFriends) {
      data.topFriends.forEach(friend => {
        const div = document.createElement("div");
        div.textContent = friend;
        topFriendsList.appendChild(div);
      });
    }

    // Theme
    document.body.className = data.theme || "default";

    // Music player
    if (data.music) {
      musicPlayer.innerHTML = `<iframe src="${data.music}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    }
  }
}

// ------------------------
// SAVE PROFILE PHOTO
// ------------------------
saveProfilePhotoBtn.addEventListener("click", async () => {
  const file = profilePhotoInput.files[0];
  if (!file) return alert("Select a photo first");
  const storageRef = ref(storage, `profileImages/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);

  const userRef = doc(db, "users", auth.currentUser.uid);
  await updateDoc(userRef, { photoURL: downloadURL });
  profilePhoto.src = downloadURL;
  alert("Profile photo updated!");
});

// ------------------------
// SAVE PROFILE INFO
// ------------------------
saveProfileInfoBtn.addEventListener("click", async () => {
  const userRef = doc(db, "users", auth.currentUser.uid);
  await updateDoc(userRef, {
    username: usernameInput.value,
    location: locationInput.value,
    bio: bioInput.value,
    music: musicInput.value
  });
  alert("Profile info updated!");
  loadProfile();
});

// ------------------------
// SAVE THEME
// ------------------------
saveThemeBtn.addEventListener("click", async () => {
  const theme = themeSelect.value;
  await updateDoc(doc(db, "users", auth.currentUser.uid), { theme });
  document.body.className = theme;
  alert("Theme updated!");
});

// ------------------------
// TOP FRIENDS
// ------------------------
addTopFriendBtn.addEventListener("click", async () => {
  const friend = topFriendInput.value.trim();
  if (!friend) return;
  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    topFriends: arrayUnion(friend)
  });
  loadProfile();
});

// ------------------------
// SEARCH USERS
// ------------------------
friendSearchBtn.addEventListener("click", async () => {
  const query = friendSearchInput.value.trim().toLowerCase();
  if (!query) return;
  const usersSnap = await getDoc(doc(db, "users", query));
  friendSearchResults.innerHTML = "";
  if (usersSnap.exists()) {
    const data = usersSnap.data();
    const div = document.createElement("div");
    div.textContent = data.username || "Anonymous";
    const addBtn = document.createElement("button");
    addBtn.textContent = "Add Friend";
    addBtn.onclick = async () => {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        friendRequests: arrayUnion(data.username)
      });
      alert("Friend request sent!");
    };
    div.appendChild(addBtn);
    friendSearchResults.appendChild(div);
  } else {
    friendSearchResults.textContent = "User not found";
  }
});

// ------------------------
// INITIAL LOAD
// ------------------------
auth.onAuthStateChanged(user => {
  if (user) loadProfile();
});
