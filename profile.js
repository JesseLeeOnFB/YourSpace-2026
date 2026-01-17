// PROFILE.JS - Direct Firebase connection, cache-busting included
document.addEventListener('DOMContentLoaded', async () => {
  // --- FIREBASE SETUP ---
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

  // --- DOM ELEMENTS ---
  const profilePfp = document.getElementById('profilePfp');
  const usernameInput = document.getElementById('usernameInput');
  const bioInput = document.getElementById('bioInput');
  const locationInput = document.getElementById('locationInput');
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const wallCommentInput = document.getElementById('wallCommentInput');
  const wallCommentsContainer = document.getElementById('wallCommentsContainer');
  const top10FriendsContainer = document.getElementById('top10FriendsContainer');
  const editTop10Btn = document.getElementById('editTop10Btn');
  const musicInput = document.getElementById('musicInput');
  const musicIframe = document.getElementById('musicIframe');
  const themeSelect = document.getElementById('themeSelect');

  let currentUser = auth.currentUser;

  // --- LOAD PROFILE ---
  async function loadProfile() {
    currentUser = auth.currentUser;
    if (!currentUser) return;

    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      usernameInput.value = data.username || '';
      bioInput.value = data.bio || '';
      locationInput.value = data.location || '';
      if (data.top10Friends) renderTop10(data.top10Friends);
      if (data.theme) document.body.className = data.theme;

      // Load profile picture
      try {
        const url = await storage.ref(`profilePictures/${currentUser.uid}/pfp.jpg`).getDownloadURL();
        profilePfp.src = url + '?cb=' + Date.now();
      } catch(e) { profilePfp.src = ''; }
    }

    loadWallComments();
  }

  // --- SAVE PROFILE INFO ---
  saveProfileBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    await db.collection('users').doc(currentUser.uid).set({
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value,
      theme: themeSelect.value
    }, { merge: true });
    document.body.className = themeSelect.value;
  });

  // --- WALL COMMENTS ---
  async function loadWallComments() {
    const snapshot = await db.collection('users').doc(currentUser.uid).collection('wallComments').get();
    wallCommentsContainer.innerHTML = '';
    snapshot.forEach(docSnap => {
      const c = docSnap.data();
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.textContent = `${c.authorName || 'Unknown'}: ${c.text}`;

      // Delete button if owner or author
      if (c.authorId === currentUser.uid || currentUser.uid === docSnap.ref.parent.parent.id) {
        const btn = document.createElement('button');
        btn.textContent = 'Delete';
        btn.onclick = async () => { await docSnap.ref.delete(); loadWallComments(); };
        div.appendChild(btn);
      }
      wallCommentsContainer.appendChild(div);
    });
  }

  // --- TOP 10 FRIENDS DRAG & DROP ---
  function renderTop10(friends) {
    top10FriendsContainer.innerHTML = '';
    friends.forEach((friend, index) => {
      if (friend.uid === currentUser.uid) return; // prevent adding self
      const div = document.createElement('div');
      div.className = 'top-friend';
      div.draggable = true;
      div.dataset.index = index;
      div.textContent = `${index + 1}. ${friend.username}`;
      top10FriendsContainer.appendChild(div);

      // Drag events
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

  editTop10Btn.addEventListener('click', async () => {
    if (!currentUser) return;
    const friends = Array.from(top10FriendsContainer.children).map(div => ({
      username: div.textContent.replace(/^\d+\.\s/, '')
    }));
    await db.collection('users').doc(currentUser.uid).update({ top10Friends: friends });
    renderTop10(friends);
  });

  // --- MUSIC PLAYER ---
  musicInput.addEventListener('change', () => {
    const url = musicInput.value.trim();
    let embedUrl = '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const vid = url.split('v=')[1] || url.split('/').pop();
      embedUrl = `https://www.youtube.com/embed/${vid}?autoplay=1`;
    } else if (url.includes('soundcloud.com')) {
      embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true`;
    }
    musicIframe.src = embedUrl;
  });

  // --- THEME SELECTION ---
  themeSelect.addEventListener('change', () => {
    document.body.className = themeSelect.value;
  });

  // --- INITIAL LOAD ---
  auth.onAuthStateChanged(() => { loadProfile(); });
});
