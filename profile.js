// PROFILE.JS - Direct Firebase connection, cache-busting included
document.addEventListener('DOMContentLoaded', async () => {
  // ---------------- Firebase Setup ----------------
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

  // ---------------- DOM Elements ----------------
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

  const customHtmlInput = document.getElementById('customHtmlInput');
  const saveCustomHtmlBtn = document.getElementById('saveCustomHtmlBtn');
  const customHtmlContainer = document.getElementById('customHtmlContainer');

  const musicInput = document.getElementById('musicInput');
  const loadMusicBtn = document.getElementById('loadMusicBtn');
  const musicIframe = document.getElementById('musicIframe');

  let currentUser;

  // ---------------- Load Profile ----------------
  async function loadProfile() {
    currentUser = auth.currentUser;
    if (!currentUser) return;

    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    if (!userDoc.exists) return;
    const data = userDoc.data();

    usernameInput.value = data.username || '';
    bioInput.value = data.bio || '';
    locationInput.value = data.location || '';
    if (data.pfpURL) profilePfp.src = data.pfpURL;

    // Wall comments
    wallCommentsContainer.innerHTML = '';
    if (data.wallComments) {
      data.wallComments.forEach(comment => {
        const div = document.createElement('div');
        div.className = 'wall-comment';
        div.innerHTML = `<strong>${comment.username || 'Unknown'}</strong>: ${comment.text}`;
        if (currentUser.uid === currentUser.uid) { // owner can delete
          const delBtn = document.createElement('button');
          delBtn.textContent = 'Delete';
          delBtn.addEventListener('click', async () => {
            await db.collection('users').doc(currentUser.uid).update({
              wallComments: firebase.firestore.FieldValue.arrayRemove(comment)
            });
            loadProfile();
          });
          div.appendChild(delBtn);
        }
        wallCommentsContainer.appendChild(div);
      });
    }

    // Top 10 friends
    const friends = data.top10Friends || [];
    renderTop10(friends);

    // Theme
    if (data.theme) document.body.className = data.theme;
    if (data.customHTML) customHtmlContainer.innerHTML = data.customHTML;
  }

  // ---------------- Save Profile Info ----------------
  saveProfileBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    await db.collection('users').doc(currentUser.uid).update({
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value
    });
    alert('Profile info updated!');
  });

  // ---------------- Save Profile Picture ----------------
  saveProfilePfpBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    const file = profilePfpInput.files[0];
    if (!file) return alert('Please select a picture');
    const storageRef = storage.ref(`profilePictures/${currentUser.uid}/${Date.now()}_${file.name}`);
    await storageRef.put(file);
    const url = await storageRef.getDownloadURL();
    await db.collection('users').doc(currentUser.uid).update({ pfpURL: url });
    profilePfp.src = url;
  });

  // ---------------- Add Wall Comment ----------------
  addWallCommentBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    const text = wallCommentInput.value.trim();
    if (!text) return;
    const comment = { username: usernameInput.value || 'Unknown', text };
    await db.collection('users').doc(currentUser.uid).update({
      wallComments: firebase.firestore.FieldValue.arrayUnion(comment)
    });
    wallCommentInput.value = '';
    loadProfile();
  });

  // ---------------- Top 10 Drag-and-Drop ----------------
  function renderTop10(friends) {
    top10FriendsContainer.innerHTML = '';
    friends.forEach((friend, index) => {
      const div = document.createElement('div');
      div.className = 'top-friend';
      div.draggable = true;
      div.dataset.index = index;
      div.textContent = `${index + 1}. ${friend.username}`;
      top10FriendsContainer.appendChild(div);

      // Drag events
      div.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', index));
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

  editTop10Btn.addEventListener('click', async () => {
    if (!currentUser) return;
    const friends = Array.from(top10FriendsContainer.children).map(div => ({
      username: div.textContent.replace(/^\d+\.\s/, '')
    }));
    await db.collection('users').doc(currentUser.uid).update({ top10Friends: friends });
    renderTop10(friends);
    alert('Top 10 friends saved!');
  });

  // ---------------- Theme ----------------
  saveThemeBtn.addEventListener('click', async () => {
    const theme = themeSelect.value;
    document.body.className = theme;
    if (!currentUser) return;
    await db.collection('users').doc(currentUser.uid).update({ theme });
  });

  // ---------------- Custom HTML ----------------
  saveCustomHtmlBtn.addEventListener('click', async () => {
    const html = customHtmlInput.value;
    customHtmlContainer.innerHTML = html;
    if (!currentUser) return;
    await db.collection('users').doc(currentUser.uid).update({ customHTML: html });
  });

  // ---------------- Music Player ----------------
  loadMusicBtn.addEventListener('click', () => {
    let url = musicInput.value.trim();
    if (!url) return;
    // convert normal share link to embed
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const idMatch = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
      if (idMatch) url = `https://www.youtube.com/embed/${idMatch[1]}?autoplay=1`;
    } else if (url.includes('soundcloud.com')) {
      url = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true`;
    } else if (url.includes('spotify.com')) {
      url = url.replace('track', 'embed/track') + '?autoplay=1';
    }
    musicIframe.src = url;
  });

  // ---------------- Navigation Buttons ----------------
  document.getElementById('navFeedBtn').addEventListener('click', () => alert('Feed'));
  document.getElementById('navProfileBtn').addEventListener('click', () => alert('Profile'));
  document.getElementById('navMessagesBtn').addEventListener('click', () => alert('Messages'));
  document.getElementById('navNotificationsBtn').addEventListener('click', () => alert('Notifications'));
  document.getElementById('navLogoutBtn').addEventListener('click', () => auth.signOut());

  // ---------------- Auth State ----------------
  auth.onAuthStateChanged(user => {
    if (!user) return;
    loadProfile();
  });
});
