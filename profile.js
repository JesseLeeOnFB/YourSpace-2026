import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const db = getFirestore();
const auth = getAuth();
const storage = getStorage();

const profilePhoto = document.getElementById("profilePhoto");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const profilePhotoSaveBtn = document.getElementById("profilePhotoSaveBtn");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const profileInfoSaveBtn = document.getElementById("profileInfoSaveBtn");
const musicInput = document.getElementById("musicInput");
const musicSaveBtn = document.getElementById("musicSaveBtn");
const musicPlayerContainer = document.getElementById("musicPlayerContainer");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const searchResults = document.getElementById("searchResults");
const topFriendsContainer = document.getElementById("topFriendsContainer");

let userDocRef;

// Wait for auth
auth.onAuthStateChanged(async (user) => {
  if (!user) return window.location.href = "index.html";
  userDocRef = doc(db, "users", user.uid);
  const snap = await getDoc(userDocRef);
  if (!snap.exists()) return alert("Profile not found");

  const data = snap.data();
  usernameInput.value = data.username || "";
  bioInput.value = data.bio || "";
  locationInput.value = data.location || "";
  if (data.photoURL) profilePhoto.src = data.photoURL;

  // Music player
  if (data.music) {
    musicInput.value = data.music;
    const match = data.music.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/);
    if (match) {
      musicPlayerContainer.innerHTML = `<iframe width="300" height="150" src="https://www.youtube.com/embed/${match[1]}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    }
  }

  // Load top friends
  if (data.topFriends && data.topFriends.length) {
    topFriendsContainer.innerHTML = data.topFriends.map(f => `<div>${f}</div>`).join("");
  }
});

// Save profile info
profileInfoSaveBtn.addEventListener("click", async () => {
  try {
    await updateDoc(userDocRef, {
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value
    });
    alert("Profile info saved!");
  } catch (err) {
    console.error(err);
    alert("Failed to save profile info");
  }
});

// Upload & save profile photo
profilePhotoSaveBtn.addEventListener("click", async () => {
  const file = profilePhotoInput.files[0];
  if (!file) return alert("Select a photo first.");
  const storageRef = ref(storage, `profileImages/${auth.currentUser.uid}/${file.name}`);
  try {
    const snap = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snap.ref);
    await updateDoc(userDocRef, { photoURL: url });
    profilePhoto.src = url;
    alert("Profile photo updated!");
  } catch(err) {
    console.error(err);
    alert("Failed to upload profile photo");
  }
});

// Save music & embed
musicSaveBtn.addEventListener("click", async () => {
  const url = musicInput.value.trim();
  if (!url) return alert("Enter a valid YouTube URL.");
  const match = url.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/);
  if (!match) return alert("Invalid YouTube URL.");
  try {
    await updateDoc(userDocRef, { music: url });
    musicPlayerContainer.innerHTML = `<iframe width="300" height="150" src="https://www.youtube.com/embed/${match[1]}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    alert("Music saved!");
  } catch(err) {
    console.error(err);
    alert("Failed to save music.");
  }
});

// Search users
searchBtn.addEventListener("click", async () => {
  const query = searchInput.value.trim();
  if (!query) return alert("Enter username");
  searchResults.innerHTML = "Searching...";
  try {
    const usersRef = collection(db, "users");
    const q = queryFn(usersRef, where("username", "==", query));
    const snap = await getDocs(q);
    if (!snap.empty) {
      searchResults.innerHTML = "";
      snap.forEach(docSnap => {
        const data = docSnap.data();
        const uid = docSnap.id;
        const div = document.createElement("div");
        div.innerHTML = `<strong>${data.username}</strong> <button class="addFriendBtn">Add Friend</button>`;
        const btn = div.querySelector(".addFriendBtn");
        btn.addEventListener("click", () => alert(`Send friend request to ${data.username}`));
        searchResults.appendChild(div);
      });
    } else searchResults.innerHTML = "User not found";
  } catch(err) {
    console.error(err);
    searchResults.innerHTML = "Error searching";
  }
});
