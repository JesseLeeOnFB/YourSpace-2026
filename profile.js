// PROFILE.JS - Direct Firebase connection, cache-busting included
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM elements
const usernameInput = document.getElementById('usernameInput');
const bioInput = document.getElementById('bioInput');
const locationInput = document.getElementById('locationInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');

const profilePfp = document.getElementById('profilePfp');
const profilePfpInput = document.getElementById('profilePfpInput');
const saveProfilePfpBtn = document.getElementById('saveProfilePfpBtn');

const wallCommentsContainer = document.getElementById('wallCommentsContainer');
const wallCommentInput = document.getElementById('wallCommentInput');
const addWallCommentBtn = document.getElementById('addWallCommentBtn');

const top10FriendsContainer = document.getElementById('top10FriendsContainer');

const themeSelect = document.getElementById('themeSelect');
const saveThemeBtn = document.getElementById('saveThemeBtn');

const musicPlayer = document.getElementById('musicPlayer');

// Cache-busting helper
const cacheBust = (url) => `${url}?cb=${Date.now()}`;

// ------------------ PROFILE ------------------
async function loadProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = doc(db, 'users', user.uid);
  const docSnap = await getDoc(userDocRef);
  if (!docSnap.exists()) return;

  const data = docSnap.data();
  usernameInput.value = data.username || '';
  bioInput.value = data.bio || '';
  locationInput.value = data.location || '';
  if (data.pfpURL) profilePfp.src = cacheBust(data.pfpURL);

  // Wall comments
  wallCommentsContainer.innerHTML = '';
  if (data.wallComments) {
    data.wallComments.forEach(comment => {
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.innerHTML = `<strong>${comment.username || 'Unknown'}</strong>: ${comment.text} ${
        comment.userId === user.uid ? '<button class="deleteWallCommentBtn">Delete</button>' : ''
      }`;
      if (comment.userId === user.uid) {
        div.querySelector('.deleteWallCommentBtn').addEventListener('click', async () => {
          await updateDoc(userDocRef, { wallComments: arrayRemove(comment) });
          loadProfile();
        });
      }
      wallCommentsContainer.appendChild(div);
    });
  }

  // Top 10 Friends (dummy editable)
  top10FriendsContainer.innerHTML = '';
  if (data.top10Friends) {
    data.top10Friends.forEach((friend, index) => {
      const div = document.createElement('div');
      div.className = 'top-friend';
      div.innerHTML = `
        <span class="rank">${index + 1}</span>
        <img src="${friend.pfpURL || 'default-pfp.png'}">
        <span class="username">${friend.username || 'Unknown'}</span>
        <button class="editTopFriendBtn">Edit</button>
      `;
      div.querySelector('.editTopFriendBtn').addEventListener('click', () => {
        const newUsername = prompt('Change username:', friend.username);
        if (newUsername) {
          friend.username = newUsername;
          updateDoc(userDocRef, { top10Friends: data.top10Friends });
          loadProfile();
        }
      });
      top10FriendsContainer.appendChild(div);
    });
  }

  // Theme
  if (data.theme) themeSelect.value = data.theme;

  // Music Player
  if (data.musicURL) musicPlayer.src = convertToEmbed(data.musicURL);
}

// ------------------ SAVE PROFILE INFO ------------------
saveProfileBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;
  const userDocRef = doc(db, 'users', user.uid);
  try {
    await updateDoc(userDocRef, {
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value
    });
    alert('Profile info updated!');
  } catch (err) {
    console.error(err);
    alert('Failed to update profile info');
  }
});

// ------------------ SAVE PROFILE PICTURE ------------------
saveProfilePfpBtn.addEventListener('click', async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert('Please select a picture first');
  const user = auth.currentUser;
  const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  profilePfp.src = cacheBust(url);
  const userDocRef = doc(db, 'users', user.uid);
  await updateDoc(userDocRef, { pfpURL: url });
  alert('Profile picture updated!');
});

// ------------------ WALL COMMENTS ------------------
addWallCommentBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;
  const text = wallCommentInput.value.trim();
  if (!text) return;
  const comment = { text, userId: user.uid, username: usernameInput.value || 'Unknown', timestamp: Date.now() };
  const userDocRef = doc(db, 'users', user.uid);
  await updateDoc(userDocRef, { wallComments: arrayUnion(comment) });
  wallCommentInput.value = '';
  loadProfile();
});

// ------------------ THEME ------------------
saveThemeBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;
  const theme = themeSelect.value;
  const userDocRef = doc(db, 'users', user.uid);
  await updateDoc(userDocRef, { theme });
  applyTheme(theme);
});

function applyTheme(theme) {
  document.body.className = '';
  document.body.classList.add(`theme-${theme}`);
}

// ------------------ MUSIC ------------------
function convertToEmbed(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const id = url.split('v=')[1] || url.split('youtu.be/')[1];
    return `https://www.youtube.com/embed/${id}?autoplay=1`;
  }
  // Add SoundCloud/Spotify conversion if needed
  return url;
}

// ------------------ INIT ------------------
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  loadProfile();
});
