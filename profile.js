// PROFILE.JS - Full, copy-paste ready
// ------------------------------
// Firebase direct connection
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

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
const editTop10Btn = document.getElementById('editTop10Btn');

const musicLinkInput = document.getElementById('musicLinkInput');
const playMusicBtn = document.getElementById('playMusicBtn');
const pauseMusicBtn = document.getElementById('pauseMusicBtn');
const musicIframe = document.getElementById('musicIframe');

let currentUser = null;
let top10Friends = [];

// ------------------------------
// Load profile
async function loadProfile() {
  currentUser = auth.currentUser;
  if (!currentUser) return;

  const userDocRef = db.collection('users').doc(currentUser.uid);
  const docSnap = await userDocRef.get();
  if (!docSnap.exists) return;

  const data = docSnap.data();

  // Profile info
  usernameInput.value = data.username || '';
  bioInput.value = data.bio || '';
  locationInput.value = data.location || '';
  if (data.pfpURL) profilePfp.src = data.pfpURL;

  // Wall comments
  wallCommentsContainer.innerHTML = '';
  if (data.wallComments && data.wallComments.length > 0) {
    data.wallComments.forEach(comment => {
      const div = document.createElement('div');
      div.className = 'wall-comment';
      const username = comment.username || 'Unknown';
      div.innerHTML = `<strong>${username}</strong>: ${comment.text}`;
      if (currentUser.uid === comment.userId || currentUser.uid === currentUser.uid) {
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', async () => {
          await userDocRef.update({
            wallComments: firebase.firestore.FieldValue.arrayRemove(comment)
          });
          loadProfile();
        });
        div.appendChild(delBtn);
      }
      wallCommentsContainer.appendChild(div);
    });
  }

  // Top 10 Friends
  top10Friends = data.top10Friends || [];
  renderTop10(top10Friends);

  // Music player
  if (data.musicLink) {
    setMusicEmbed(data.musicLink, true);
  }
}

// ------------------------------
// Save profile info
saveProfileBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const userDocRef = db.collection('users').doc(currentUser.uid);
  await userDocRef.update({
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  alert('Profile info updated!');
});

// ------------------------------
// Save profile picture
saveProfilePfpBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const file = profilePfpInput.files[0];
  if (!file) return alert('Select a picture first');
  const storageRef = storage.ref(`profilePictures/${currentUser.uid}/${Date.now()}_${file.name}`);
  await storageRef.put(file);
  const url = await storageRef.getDownloadURL();
  profilePfp.src = url;
  const userDocRef = db.collection('users').doc(currentUser.uid);
  await userDocRef.update({ pfpURL: url });
});

// ------------------------------
// Wall comments
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
  const userDocRef = db.collection('users').doc(currentUser.uid);
  await userDocRef.update({
    wallComments: firebase.firestore.FieldValue.arrayUnion(comment)
  });
  wallCommentInput.value = '';
  loadProfile();
});

// ------------------------------
// Top 10 Drag-and-Drop
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
      const moved = friends.splice(fromIndex, 1)[0];
      friends.splice(toIndex, 0, moved);
      renderTop10(friends);
    });
  });
}

// Save Top 10
editTop10Btn.addEventListener('click', async () => {
  if (!currentUser) return;
  const userDocRef = db.collection('users').doc(currentUser.uid);
  const friends = Array.from(top10FriendsContainer.children).map(div => ({
    username: div.textContent.replace(/^\d+\.\s/, '')
  }));
  await userDocRef.update({ top10Friends: friends });
  renderTop10(friends);
});

// ------------------------------
// Music Player
function setMusicEmbed(link, autoPlay=false) {
  let embedUrl = '';
  if (link.includes('youtube.com') || link.includes('youtu.be')) {
    const idMatch = link.match(/(?:v=|\.be\/)([a-zA-Z0-9_-]{11})/);
    if (idMatch) embedUrl = `https://www.youtube.com/embed/${idMatch[1]}?autoplay=${autoPlay?1:0}&controls=1`;
  } else if (link.includes('soundcloud.com')) {
    embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(link)}&auto_play=${autoPlay}&hide_related=false&show_comments=true`;
  } else if (link.includes('spotify.com')) {
    embedUrl = link.replace('track', 'embed/track') + `?autoplay=${autoPlay?1:0}`;
  }
  if (embedUrl) {
    musicIframe.src = embedUrl;
  }
}

// Play/Pause controls
playMusicBtn.addEventListener('click', () => {
  // Re-set src with autoplay
  const link = musicLinkInput.value.trim();
  if (link) setMusicEmbed(link, true);
});
pauseMusicBtn.addEventListener('click', () => {
  musicIframe.src = ''; // Quick pause, reload stops audio
  // Optional: store current link if you want resume
});

// ------------------------------
// Init
auth.onAuthStateChanged(user => {
  if (!user) return;
  loadProfile();
});
