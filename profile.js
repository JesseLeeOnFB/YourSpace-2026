// profile.js
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// --- NAV BUTTONS ---
document.getElementById("homeBtn").addEventListener("click", () => {
  window.location.href = "feed.html";
});
document.getElementById("profileBtn").addEventListener("click", () => {
  window.location.href = "profile.html";
});
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// --- PROFILE ELEMENTS ---
const profilePhoto = document.getElementById("profilePhoto");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const savePhotoBtn = document.getElementById("savePhotoBtn");

const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const saveInfoBtn = document.getElementById("saveInfoBtn");

const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");

const customHtmlInput = document.getElementById("customHtmlInput");
const saveHtmlBtn = document.getElementById("saveHtmlBtn");

const musicPlayerContainer = document.getElementById("musicPlayerContainer");

const friendsList = document.getElementById("friendsList");
const addFriendInput = document.getElementById("addFriendInput");
const addFriendBtn = document.getElementById("addFriendBtn");

// --- LOAD PROFILE DATA ---
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userDocRef = doc(db, "users", user.uid);
  const userDocSnap = await getDoc(userDocRef);
  if (userDocSnap.exists()) {
    const data = userDocSnap.data();

    // Load profile photo
    if (data.profilePhotoURL) profilePhoto.src = data.profilePhotoURL;

    // Load info
    if (data.username) usernameInput.value = data.username;
    if (data.location) locationInput.value = data.location;
    if (data.bio) bioInput.value = data.bio;
    if (data.music) musicInput.value = data.music;

    // Load theme
    if (data.theme) document.body.className = data.theme;

    // Load custom HTML
    if (data.customHtml) customHtmlInput.value = data.customHtml;

    // Load top friends
    if (data.topFriends) renderFriends(data.topFriends);

    // Load music player
    if (data.music) loadMusicPlayer(data.music);
  }
});

// --- SAVE PROFILE PHOTO ---
savePhotoBtn.addEventListener("click", async () => {
  const file = profilePhotoInput.files[0];
  if (!file) return alert("Select a photo first");

  const storageRef = ref(storage, `profileImages/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
  try {
    const snapshot = await uploadBytes(storageRef, file, { contentType: file.type });
    const url = await getDownloadURL(snapshot.ref);

    await updateDoc(doc(db, "users", auth.currentUser.uid), { profilePhotoURL: url });
    profilePhoto.src = url;
    alert("Profile photo updated!");
  } catch (err) {
    console.error("Profile photo upload failed:", err);
    alert("Upload failed. Check console.");
  }
});

// --- SAVE PROFILE INFO ---
saveInfoBtn.addEventListener("click", async () => {
  try {
    await setDoc(doc(db, "users", auth.currentUser.uid), {
      username: usernameInput.value,
      location: locationInput.value,
      bio: bioInput.value,
      music: musicInput.value
    }, { merge: true });

    if (musicInput.value) loadMusicPlayer(musicInput.value);
    alert("Profile info saved!");
  } catch (err) {
    console.error("Save profile info failed:", err);
    alert("Failed to save profile info.");
  }
});

// --- SAVE THEME ---
saveThemeBtn.addEventListener("click", async () => {
  const theme = themeSelect.value;
  document.body.className = theme;
  await updateDoc(doc(db, "users", auth.currentUser.uid), { theme });
  alert(`Theme set to ${theme}`);
});

// --- SAVE CUSTOM HTML ---
saveHtmlBtn.addEventListener("click", async () => {
  const html = customHtmlInput.value;
  await updateDoc(doc(db, "users", auth.currentUser.uid), { customHtml: html });
  alert("Custom HTML saved!");
});

// --- MUSIC PLAYER ---
function loadMusicPlayer(url) {
  musicPlayerContainer.innerHTML = `<iframe width="100%" height="80" src="https://www.youtube.com/embed/${extractYouTubeID(url)}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
}

function extractYouTubeID(url) {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/watch\?v=)([^\s&]+)/;
  const match = url.match(regex);
  return match ? match[1] : "";
}

// --- FRIENDS ---
function renderFriends(friendsArray) {
  friendsList.innerHTML = "";
  friendsArray.forEach(friend => {
    const li = document.createElement("li");
    li.textContent = friend;
    friendsList.appendChild(li);
  });
}

addFriendBtn.addEventListener("click", async () => {
  const friend = addFriendInput.value.trim();
  if (!friend) return;

  const userDocRef = doc(db, "users", auth.currentUser.uid);
  const userDocSnap = await getDoc(userDocRef);
  const currentFriends = userDocSnap.exists() && userDocSnap.data().topFriends ? userDocSnap.data().topFriends : [];

  if (!currentFriends.includes(friend)) currentFriends.push(friend);

  await updateDoc(userDocRef, { topFriends: currentFriends });
  renderFriends(currentFriends);
  addFriendInput.value = "";
});
