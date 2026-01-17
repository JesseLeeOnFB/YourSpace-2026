// PROFILE.JS - Full ready-to-paste
// Direct Firebase connection, cache-busting included
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, getDownloadURL, uploadBytes } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// --- Firebase config ---
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

// --- DOM Elements ---
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

const musicInput = document.getElementById('musicInput');
const musicIframe = document.getElementById('musicIframe');

const navFeedBtn = document.getElementById('navFeedBtn');
const navProfileBtn = document.getElementById('navProfileBtn');
const navMessagesBtn = document.getElementById('navMessagesBtn');
const navNotificationsBtn = document.getElementById('navNotificationsBtn');

let currentUser = null;

// --- Navigation ---
navFeedBtn.addEventListener('click', () => window.location.href = 'feed.html');
navProfileBtn.addEventListener('click', () => window.location.href = 'profile.html');
navMessagesBtn.addEventListener('click', () => window.location.href = 'messages.html');
navNotificationsBtn.addEventListener('click', () => window.location.href = 'notifications.html');

// --- Load Profile ---
async function loadProfile() {
  if (!currentUser) return;
  const userDocRef = doc(db, 'users', currentUser.uid);
  const docSnap = await getDoc(userDocRef);
  if (!docSnap.exists()) return;

  const data = docSnap.data();

  usernameInput.value = data.username || '';
  bioInput.value = data.bio || '';
  locationInput.value = data.location || '';
  if (data.pfpURL) profilePfp.src = `${data.pfpURL}?t=${Date.now()}`; // cache-buster

  // Load Wall Comments
  wallCommentsContainer.innerHTML = '';
  const comments = data.wallComments || [];
  comments.forEach(comment => {
    const div = document.createElement('div');
    div.className = 'wall-comment';
    const userLink = document.createElement('a');
    userLink.href = `profile.html?uid=${comment.userId}`;
    userLink.textContent = comment.username || 'Unknown';
    userLink.style.fontWeight = 'bold';
    div.appendChild(userLink);
    div.append(`: ${comment.text}`);

    if (currentUser.uid === comment.userId || currentUser.uid === currentUser.uid) {
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', async () => {
        await updateDoc(userDocRef, {
          wallComments: comments.filter(c => c !== comment)
        });
        loadProfile();
      });
      div.appendChild(delBtn);
    }
    wallCommentsContainer.appendChild(div);
  });

  // Load Top 10 Friends
  const top10 = data.top10Friends || [];
  renderTop10(top10);
}

// --- Save Profile Info ---
saveProfileBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const userDocRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userDocRef, {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  alert('Profile info updated!');
});

// --- Save Profile Picture ---
saveProfilePfpBtn.addEventListener('click', async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert('Select a picture first');

  const storageRef = ref(storage, `profilePictures/${currentUser.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  profilePfp.src = `${url}?t=${Date.now()}`;

  const userDocRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userDocRef, { pfpURL: url });
  alert('Profile picture updated!');
});

// --- Add Wall Comment ---
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
  const docSnap = await getDoc(userDocRef);
  const existingComments = docSnap.data().wallComments || [];
  await updateDoc(userDocRef, {
    wallComments: [...existingComments, comment]
  });
  wallCommentInput.value = '';
  loadProfile();
});

// --- Top 10 Drag-and-Drop ---
function renderTop10(friends) {
  top10FriendsContainer.innerHTML = '';
  friends.forEach((friend, index) => {
    const div = document.createElement('div');
    div.className = 'top-friend';
    div.draggable = true;
    div.dataset.index = index;
    div.textContent = `${index + 1}. ${friend.username}`;
    top10FriendsContainer.appendChild(div);

    div.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', index));
    div.addEventListener('dragover', (e) => e.preventDefault());
    div.addEventListener('drop', (e) => {
      const fromIndex = e.dataTransfer.getData('text/plain');
      const toIndex = index;
      if (fromIndex == toIndex) return;
      const movedFriend = friends.splice(fromIndex, 1)[0];
      friends.splice(toIndex, 0, movedFriend);
      renderTop10(friends);
    });
  });
}

// Save Top 10 order
editTop10Btn.addEventListener('click', async () => {
  const userDocRef = doc(db, 'users', currentUser.uid);
  const friends = Array.from(top10FriendsContainer.children).map(div => ({
    username: div.textContent.replace(/^\d+\.\s/, '')
  }));
  await updateDoc(userDocRef, { top10Friends: friends });
  renderTop10(friends);
});

// --- Music Player ---
musicInput.addEventListener('change', () => {
  const url = musicInput.value.trim();
  if (!url) return;
  let embedUrl = url
    .replace('watch?v=', 'embed/')
    .replace('youtu.be/', 'youtube.com/embed/')
    .replace('soundcloud.com', 'w.soundcloud.com/player/?url=');
  musicIframe.src = embedUrl;
});

// --- Initialize ---
onAuthStateChanged(auth, user => {
  if (!user) return;
  currentUser = user;
  loadProfile();
});
