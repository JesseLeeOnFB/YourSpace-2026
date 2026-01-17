// ========================
// PROFILE.JS - FULL FILE
// Direct Firebase connection with cache-busting
// ========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// ---------- FIREBASE INIT ----------
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

// ---------- DOM ELEMENTS ----------
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
const editTop10Btn = document.getElementById('editTop10Btn');

const themeSelect = document.getElementById('themeSelect');
const saveThemeBtn = document.getElementById('saveThemeBtn');
const customHtmlBox = document.getElementById('customHtmlBox');
const customHtmlContainer = document.getElementById('customHtmlContainer');

const musicInput = document.getElementById('musicInput');
const musicIframe = document.getElementById('musicIframe');

// Nav buttons
const navFeedBtn = document.getElementById('navFeedBtn');
const navProfileBtn = document.getElementById('navProfileBtn');
const navMessagesBtn = document.getElementById('navMessagesBtn');
const navNotificationsBtn = document.getElementById('navNotificationsBtn');

let currentUser;

// ---------- UTILITY ----------
function cacheBuster(url) {
  return `${url}?cb=${Date.now()}`;
}

// ---------- LOAD PROFILE ----------
async function loadProfile() {
  if (!currentUser) return;
  const userDocRef = doc(db, 'users', currentUser.uid);
  const docSnap = await getDoc(userDocRef);
  if (!docSnap.exists()) return;

  const data = docSnap.data();
  usernameInput.value = data.username || '';
  bioInput.value = data.bio || '';
  locationInput.value = data.location || '';
  if (data.pfpURL) profilePfp.src = cacheBuster(data.pfpURL);

  // Theme
  if (data.theme) document.body.className = data.theme;
  if (data.customHTML) customHtmlContainer.innerHTML = data.customHTML;

  // Wall comments
  wallCommentsContainer.innerHTML = '';
  if (data.wallComments && data.wallComments.length > 0) {
    data.wallComments.forEach(comment => {
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.innerHTML = `
        <span><strong>${comment.username || 'Unknown'}</strong>: ${comment.text}</span>
      `;
      if (currentUser.uid === comment.userId || currentUser.uid === currentUser.uid) {
        const btn = document.createElement('button');
        btn.textContent = 'Delete';
        btn.addEventListener('click', async () => {
          const updatedComments = data.wallComments.filter(c => c !== comment);
          await updateDoc(userDocRef, { wallComments: updatedComments });
          loadProfile();
        });
        div.appendChild(btn);
      }
      wallCommentsContainer.appendChild(div);
    });
  }

  // Top 10 friends
  renderTop10(data.top10Friends || []);
}

// ---------- SAVE PROFILE INFO ----------
saveProfileBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const userDocRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userDocRef, {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  alert('Profile info saved!');
  loadProfile();
});

// ---------- SAVE PROFILE PICTURE ----------
saveProfilePfpBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const file = profilePfpInput.files[0];
  if (!file) return alert('Select a profile picture first.');
  const storageRef = ref(storage, `profilePictures/${currentUser.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  const userDocRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userDocRef, { pfpURL: url });
  profilePfp.src = cacheBuster(url);
});

// ---------- ADD WALL COMMENT ----------
addWallCommentBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const text = wallCommentInput.value.trim();
  if (!text) return;
  const comment = {
    text,
    userId: currentUser.uid,
    username: usernameInput.value || 'Unknown',
    timestamp: Date.now()
  };
  const userDocRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userDocRef, { wallComments: arrayUnion(comment) });
  wallCommentInput.value = '';
  loadProfile();
});

// ---------- TOP 10 FRIENDS DRAG & DROP ----------
function renderTop10(friends) {
  top10FriendsContainer.innerHTML = '';
  friends.forEach((friend, index) => {
    const div = document.createElement('div');
    div.className = 'top-friend';
    div.draggable = true;
    div.dataset.index = index;
    div.textContent = `${index + 1}. ${friend.username}`;
    top10FriendsContainer.appendChild(div);

    div.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', index);
    });
    div.addEventListener('dragover', (e) => e.preventDefault());
    div.addEventListener('drop', (e) => {
      const fromIndex = e.dataTransfer.getData('text/plain');
      const toIndex = index;
      if (fromIndex == toIndex) return;
      const moved = friends.splice(fromIndex, 1)[0];
      friends.splice(toIndex, 0, moved);
      renderTop10(friends);
    });
  });
}

// Save top 10
editTop10Btn.addEventListener('click', async () => {
  if (!currentUser) return;
  const friends = Array.from(top10FriendsContainer.children).map(div => ({
    username: div.textContent.replace(/^\d+\.\s/, '')
  }));
  const userDocRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userDocRef, { top10Friends: friends });
  renderTop10(friends);
});

// ---------- THEME SELECTION ----------
saveThemeBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const theme = themeSelect.value;
  document.body.className = theme;
  const customHTML = customHtmlBox.value;
  if (customHTML) customHtmlContainer.innerHTML = customHTML;
  const userDocRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userDocRef, { theme, customHTML });
});

// ---------- MUSIC PLAYER ----------
musicInput.addEventListener('change', () => {
  let url = musicInput.value.trim();
  if (!url) return;
  // Convert standard YouTube/SoundCloud/Spotify link to embed
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = url.split('v=')[1] || url.split('youtu.be/')[1];
    url = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  }
  musicIframe.src = url;
});

// ---------- NAVIGATION BUTTONS ----------
navFeedBtn.addEventListener('click', () => window.location.href = '/feed.html');
navProfileBtn.addEventListener('click', () => window.location.href = '/profile.html');
navMessagesBtn.addEventListener('click', () => window.location.href = '/messages.html');
navNotificationsBtn.addEventListener('click', () => window.location.href = '/notifications.html');

// ---------- INIT ----------
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  currentUser = user;
  loadProfile();
});
