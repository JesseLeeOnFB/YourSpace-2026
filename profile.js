// =========================
// Firebase Direct Connection
// =========================
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let currentUser = null;

// =========================
// DOM Elements
// =========================
const profilePfp = document.getElementById('profilePfp');
const usernameInput = document.getElementById('usernameInput');
const bioInput = document.getElementById('bioInput');
const locationInput = document.getElementById('locationInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const wallContainer = document.getElementById('wallContainer');
const wallCommentInput = document.getElementById('wallCommentInput');
const top10FriendsContainer = document.getElementById('top10FriendsContainer');
const editTop10Btn = document.getElementById('editTop10Btn');
const musicInput = document.getElementById('musicInput');
const musicIframe = document.getElementById('musicIframe');
const playMusicBtn = document.getElementById('playMusicBtn');
const pauseMusicBtn = document.getElementById('pauseMusicBtn');

// =========================
// CACHE BUSTER FUNCTION
// =========================
function cacheBust(url) {
  return `${url}?cb=${Date.now()}`;
}

// =========================
// LOAD CURRENT USER
// =========================
auth.onAuthStateChanged(async user => {
  if (!user) return;
  currentUser = user;

  // Load profile
  const userDoc = await db.collection('users').doc(user.uid).get();
  if (!userDoc.exists) return;

  const data = userDoc.data();

  // Profile picture
  if (data.pfpPath) {
    const url = await storage.ref(data.pfpPath).getDownloadURL();
    profilePfp.src = cacheBust(url);
  }

  // Profile info
  usernameInput.value = data.username || '';
  bioInput.value = data.bio || '';
  locationInput.value = data.location || '';

  // Load wall comments
  const commentsSnapshot = await db.collection('users').doc(user.uid).collection('wallComments').get();
  wallContainer.innerHTML = '';
  commentsSnapshot.forEach(doc => {
    const c = doc.data();
    const div = document.createElement('div');
    div.className = 'wall-comment';
    div.textContent = `${c.authorName}: ${c.text}`;

    // Delete button if owner or author
    if (c.authorId === user.uid || currentUser.uid === user.uid) {
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.onclick = async () => {
        await db.collection('users').doc(user.uid).collection('wallComments').doc(doc.id).delete();
        div.remove();
      };
      div.appendChild(delBtn);
    }

    wallContainer.appendChild(div);
  });

  // Load Top 10 Friends
  let top10 = data.top10Friends || [];
  renderTop10(top10);
});

// =========================
// SAVE PROFILE INFO
// =========================
saveProfileBtn.onclick = async () => {
  if (!currentUser) return;
  await db.collection('users').doc(currentUser.uid).set({
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  }, { merge: true });
};

// =========================
// WALL COMMENT POST
// =========================
document.getElementById('postCommentBtn').onclick = async () => {
  if (!currentUser) return;
  const text = wallCommentInput.value.trim();
  if (!text) return;

  await db.collection('users').doc(currentUser.uid).collection('wallComments').add({
    authorId: currentUser.uid,
    authorName: usernameInput.value,
    text
  });

  wallCommentInput.value = '';
};

// =========================
// TOP 10 FRIENDS DRAG-AND-DROP
// =========================
function renderTop10(friends) {
  top10FriendsContainer.innerHTML = '';
  friends.forEach((friend, index) => {
    const div = document.createElement('div');
    div.className = 'top-friend';
    div.draggable = true;
    div.dataset.index = index;

    // Prevent overflowing long usernames
    const displayName = friend.username.length > 15 ? friend.username.slice(0, 15) + '…' : friend.username;
    div.textContent = `${index + 1}. ${displayName}`;
    top10FriendsContainer.appendChild(div);

    // Drag events
    div.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', index);
    });

    div.addEventListener('dragover', e => e.preventDefault());

    div.addEventListener('drop', e => {
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
editTop10Btn.onclick = async () => {
  if (!currentUser) return;
  const friends = Array.from(top10FriendsContainer.children).map(div => ({
    username: div.textContent.replace(/^\d+\.\s/, '')
  }));
  await db.collection('users').doc(currentUser.uid).update({ top10Friends: friends });
  renderTop10(friends);
};

// =========================
// MUSIC PLAYER INLINE
// =========================
function getEmbedUrl(link) {
  if (!link) return '';
  // YouTube
  if (link.includes('youtube.com') || link.includes('youtu.be')) {
    const videoId = link.split('v=')[1] || link.split('youtu.be/')[1];
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  }
  // SoundCloud
  if (link.includes('soundcloud.com')) {
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(link)}&auto_play=true`;
  }
  return '';
}

playMusicBtn.onclick = () => {
  const url = getEmbedUrl(musicInput.value);
  if (url) musicIframe.src = cacheBust(url);
};

pauseMusicBtn.onclick = () => {
  musicIframe.src = '';
};
