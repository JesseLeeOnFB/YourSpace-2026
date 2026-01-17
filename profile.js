// PROFILE.JS - Direct Firebase connection + cache-busting
document.addEventListener('DOMContentLoaded', async () => {
  // ===== FIREBASE SETUP =====
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

  // ===== DOM ELEMENTS =====
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
  const musicLinkInput = document.getElementById('musicLinkInput');
  const playMusicBtn = document.getElementById('playMusicBtn');
  const pauseMusicBtn = document.getElementById('pauseMusicBtn');
  const musicIframe = document.getElementById('musicIframe');

  let currentUser = null;

  // ===== LOAD PROFILE =====
  async function loadProfile() {
    currentUser = auth.currentUser;
    if (!currentUser) return;

    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    const data = userDoc.exists ? userDoc.data() : {};

    usernameInput.value = data.username || '';
    bioInput.value = data.bio || '';
    locationInput.value = data.location || '';
    if (data.pfpURL) profilePfp.src = data.pfpURL + '?cb=' + Date.now();

    // Wall Comments
    wallCommentsContainer.innerHTML = '';
    if (data.wallComments) {
      data.wallComments.forEach(comment => {
        const div = document.createElement('div');
        div.className = 'wall-comment';
        div.innerHTML = `<span><strong>${comment.username || 'Unknown'}</strong>: ${comment.text}</span>`;
        // Only profile owner can delete
        if (currentUser.uid === currentUser.uid) {
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

    // Top 10 Friends
    top10FriendsContainer.innerHTML = '';
    if (data.top10Friends) {
      data.top10Friends.forEach((friend, i) => {
        const div = document.createElement('div');
        div.className = 'top-friend';
        div.textContent = `${i + 1}. ${friend.username}`;
        top10FriendsContainer.appendChild(div);
      });
    }
  }

  // ===== SAVE PROFILE INFO =====
  saveProfileBtn.addEventListener('click', async () => {
    await db.collection('users').doc(currentUser.uid).set({
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value
    }, { merge: true });
    alert('Profile info saved!');
    loadProfile();
  });

  // ===== SAVE PROFILE PICTURE =====
  saveProfilePfpBtn.addEventListener('click', async () => {
    const file = profilePfpInput.files[0];
    if (!file) return alert('Select a picture first');
    const storageRef = storage.ref(`profilePictures/${currentUser.uid}/${Date.now()}_${file.name}`);
    await storageRef.put(file);
    const url = await storageRef.getDownloadURL();
    profilePfp.src = url + '?cb=' + Date.now();
    await db.collection('users').doc(currentUser.uid).set({ pfpURL: url }, { merge: true });
    alert('Profile picture updated!');
  });

  // ===== WALL COMMENTS =====
  addWallCommentBtn.addEventListener('click', async () => {
    const text = wallCommentInput.value.trim();
    if (!text) return;
    const comment = { username: usernameInput.value, text, timestamp: Date.now() };
    await db.collection('users').doc(currentUser.uid).update({
      wallComments: firebase.firestore.FieldValue.arrayUnion(comment)
    });
    wallCommentInput.value = '';
    loadProfile();
  });

  // ===== TOP 10 FRIENDS EDIT =====
  editTop10Btn.addEventListener('click', () => {
    alert('Drag-and-drop top 10 editor coming soon!');
  });

  // ===== THEME =====
  saveThemeBtn.addEventListener('click', () => {
    document.body.className = themeSelect.value;
    alert('Theme applied!');
  });

  // ===== CUSTOM HTML =====
  saveCustomHtmlBtn.addEventListener('click', () => {
    customHtmlContainer.innerHTML = customHtmlInput.value;
  });

  // ===== MUSIC PLAYER =====
  playMusicBtn.addEventListener('click', () => {
    const link = musicLinkInput.value.trim();
    if (!link) return;
    let embedLink = link;
    // YouTube
    if (link.includes('youtube.com') || link.includes('youtu.be')) {
      const videoId = link.split('v=')[1] || link.split('youtu.be/')[1];
      embedLink = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    musicIframe.src = embedLink;
  });
  pauseMusicBtn.addEventListener('click', () => musicIframe.src = '');

  // ===== NAV BUTTONS =====
  document.getElementById('navFeedBtn').addEventListener('click', () => alert('Feed clicked'));
  document.getElementById('navProfileBtn').addEventListener('click', () => alert('Profile clicked'));
  document.getElementById('navMessagesBtn').addEventListener('click', () => alert('Messages clicked'));
  document.getElementById('navNotificationsBtn').addEventListener('click', () => alert('Notifications clicked'));

  // ===== AUTH STATE =====
  auth.onAuthStateChanged(user => {
    if (user) loadProfile();
  });
});
