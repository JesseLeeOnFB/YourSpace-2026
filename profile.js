import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.24.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.24.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.24.0/firebase-storage.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.24.0/firebase-app.js";

// --- Firebase Initialization ---
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

const themeSelector = document.getElementById('themeSelector');
const saveThemeBtn = document.getElementById('saveThemeBtn');

const customHtmlInput = document.getElementById('customHtmlInput');
const previewCustomHtmlBtn = document.getElementById('previewCustomHtmlBtn');
const customHtmlContainer = document.getElementById('customHtmlContainer');

const musicInput = document.getElementById('musicInput');
const loadMusicBtn = document.getElementById('loadMusicBtn');
const playPauseMusicBtn = document.getElementById('playPauseMusicBtn');
const musicIframe = document.getElementById('musicIframe');

let currentUser = null;
let musicPlaying = false;

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

  if (data.pfpURL) profilePfp.src = data.pfpURL + '?cacheBust=' + Date.now();

  // Wall comments
  wallCommentsContainer.innerHTML = '';
  if (data.wallComments && data.wallComments.length > 0) {
    data.wallComments.forEach((comment, index) => {
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.innerHTML = `<strong>${comment.username}</strong>: ${comment.text}`;
      if (currentUser.uid === comment.userId || currentUser.uid === currentUser.uid) {
        const btn = document.createElement('button');
        btn.textContent = 'Delete';
        btn.onclick = async () => {
          data.wallComments.splice(index,1);
          await updateDoc(userDocRef,{ wallComments: data.wallComments });
          loadProfile();
        };
        div.appendChild(btn);
      }
      wallCommentsContainer.appendChild(div);
    });
  }

  // Top 10 friends
  renderTop10(data.top10Friends || []);
}

// --- Save Profile Info ---
saveProfileBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const userDocRef = doc(db,'users',currentUser.uid);
  await updateDoc(userDocRef,{
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  alert('Profile info updated!');
});

// --- Save Profile Picture ---
saveProfilePfpBtn.addEventListener('click', async () => {
  const file = profilePfpInput.files[0];
  if (!file || !currentUser) return alert('Select a picture');
  const storageRef = ref(storage, `profilePictures/${currentUser.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  profilePfp.src = url + '?cacheBust=' + Date.now();
  const userDocRef = doc(db,'users',currentUser.uid);
  await updateDoc(userDocRef,{ pfpURL: url });
  alert('Profile picture updated!');
});

// --- Wall Comments ---
addWallCommentBtn.addEventListener('click', async () => {
  if (!wallCommentInput.value.trim() || !currentUser) return;
  const userDocRef = doc(db,'users',currentUser.uid);
  const docSnap = await getDoc(userDocRef);
  const data = docSnap.data() || {};
  data.wallComments = data.wallComments || [];
  data.wallComments.push({
    username: usernameInput.value || 'Unknown',
    text: wallCommentInput.value,
    userId: currentUser.uid,
    timestamp: Date.now()
  });
  await updateDoc(userDocRef, { wallComments: data.wallComments });
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
    div.textContent = `${index+1}. ${friend.username}`;
    top10FriendsContainer.appendChild(div);

    div.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', index));
    div.addEventListener('dragover', e => e.preventDefault());
    div.addEventListener('drop', e => {
      const fromIndex = e.dataTransfer.getData('text/plain');
      const toIndex = index;
      if(fromIndex==toIndex) return;
      const moved = friends.splice(fromIndex,1)[0];
      friends.splice(toIndex,0,moved);
      renderTop10(friends);
    });
  });
}
editTop10Btn.addEventListener('click', async () => {
  if (!currentUser) return;
  const userDocRef = doc(db,'users',currentUser.uid);
  const friends = Array.from(top10FriendsContainer.children).map(div => ({
    username: div.textContent.replace(/^\d+\.\s/,'')
  }));
  await updateDoc(userDocRef,{ top10Friends: friends });
  renderTop10(friends);
});

// --- Theme ---
saveThemeBtn.addEventListener('click', () => {
  document.body.className = themeSelector.value;
});

// --- Custom HTML ---
previewCustomHtmlBtn.addEventListener('click', () => {
  customHtmlContainer.innerHTML = customHtmlInput.value;
});

// --- Music Player ---
loadMusicBtn.addEventListener('click', () => {
  let url = musicInput.value.trim();
  if(!url) return;
  if(url.includes('youtube')) url = url.replace('watch?v=','embed/') + '?autoplay=1';
  else if(url.includes('soundcloud')) url = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true`;
  else if(url.includes('spotify')) url = `https://open.spotify.com/embed/track/${url.split('/track/')[1]}?autoplay=1`;
  musicIframe.src = url;
  musicPlaying = true;
});

playPauseMusicBtn.addEventListener('click', () => {
  if(!musicPlaying) musicIframe.src += '&autoplay=1';
  else musicIframe.src += '&autoplay=0';
  musicPlaying = !musicPlaying;
});

// --- Auth State ---
onAuthStateChanged(auth, user => {
  if(user) {
    currentUser = user;
    loadProfile();
  }
});
