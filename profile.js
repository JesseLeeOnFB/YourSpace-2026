// PROFILE.JS - Full, direct Firebase, cache-busting included
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

let currentUser;
const top10FriendsContainer = document.getElementById('top10FriendsContainer');
const editTop10Btn = document.getElementById('saveTop10Btn');

document.addEventListener('DOMContentLoaded', async () => {
  auth.onAuthStateChanged(async user => {
    if (!user) return;
    currentUser = user;
    await loadProfile();
    await loadTop10();
  });

  // Top 10 Drag-and-Drop
  editTop10Btn.addEventListener('click', async () => {
    if (!currentUser) return;
    const friends = Array.from(top10FriendsContainer.children).map(div => ({
      username: div.dataset.username
    }));
    await db.collection('users').doc(currentUser.uid).update({ top10Friends: friends });
    renderTop10(friends);
  });

  // Music Player
  document.getElementById('musicLoadBtn').addEventListener('click', () => {
    const url = document.getElementById('musicInput').value.trim();
    if (!url) return;
    const embedUrl = convertToEmbed(url);
    const iframe = document.getElementById('musicIframe');
    iframe.src = embedUrl;
  });
});

// Convert music URLs to embed
function convertToEmbed(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let id;
    if (url.includes('youtu.be')) id = url.split('/').pop();
    else id = new URL(url).searchParams.get('v');
    return `https://www.youtube.com/embed/${id}?autoplay=1`;
  } else if (url.includes('soundcloud.com')) {
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true`;
  } else if (url.includes('spotify.com')) {
    return `https://open.spotify.com/embed/track/${url.split('/').pop()}?autoplay=1`;
  }
  return '';
}

// Load Profile info
async function loadProfile() {
  const docSnap = await db.collection('users').doc(currentUser.uid).get();
  const data = docSnap.data();
  if (!data) return;

  document.getElementById('usernameInput').value = data.username || '';
  document.getElementById('bioInput').value = data.bio || '';
  document.getElementById('locationInput').value = data.location || '';

  // Profile Picture
  try {
    const pfpUrl = await storage.ref(`profilePictures/${currentUser.uid}/pfp.jpg`).getDownloadURL();
    document.getElementById('profilePfp').src = pfpUrl;
  } catch(e) {
    document.getElementById('profilePfp').src = '';
  }
}

// Top 10 Drag-and-Drop
async function loadTop10() {
  const docSnap = await db.collection('users').doc(currentUser.uid).get();
  const friends = docSnap.data()?.top10Friends || [];
  renderTop10(friends);
}

function renderTop10(friends) {
  top10FriendsContainer.innerHTML = '';
  friends.forEach((friend, index) => {
    if (friend.username === currentUser.displayName) return; // prevent adding self
    const div = document.createElement('div');
    div.className = 'top-friend';
    div.draggable = true;
    div.dataset.index = index;
    div.dataset.username = friend.username;
    div.title = friend.username;
    div.textContent = `${index + 1}. ${friend.username}`;
    div.style.whiteSpace = 'nowrap';
    div.style.overflow = 'hidden';
    div.style.textOverflow = 'ellipsis';
    top10FriendsContainer.appendChild(div);

    // Drag events
    div.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', index);
    });

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
