// PROFILE.JS - Direct Firebase connection, cache-busting included
document.addEventListener('DOMContentLoaded', async () => {
  // Firebase imports
  const { initializeApp } = firebase;
  const { getAuth, onAuthStateChanged } = firebase.auth;
  const { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove } = firebase.firestore;
  const { getStorage, ref, uploadBytes, getDownloadURL } = firebase.storage;

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

  const app = initializeApp(firebaseConfig);
  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();

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

  const themeSelect = document.getElementById('themeSelect');
  const saveThemeBtn = document.getElementById('saveThemeBtn');

  const musicInput = document.getElementById('musicInput');
  const loadMusicBtn = document.getElementById('loadMusicBtn');
  const musicPlayer = document.getElementById('musicPlayer');

  let currentUser = null;

  // UTILS
  function convertToEmbed(url) {
    if (!url) return '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const idMatch = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
      if (idMatch) return `https://www.youtube.com/embed/${idMatch[1]}?autoplay=1`;
    } else if (url.includes('soundcloud.com')) {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true`;
    } else if (url.includes('spotify.com')) {
      return url.replace('track', 'embed/track') + '?autoplay=1';
    }
    return '';
  }

  function applyTheme(theme) {
    document.body.style.background = theme;
  }

  // LOAD PROFILE
  async function loadProfile() {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data();
    usernameInput.value = data.username || '';
    bioInput.value = data.bio || '';
    locationInput.value = data.location || '';
    if (data.pfpURL) profilePfp.src = `${data.pfpURL}?t=${Date.now()}`;

    // Wall comments
    wallCommentsContainer.innerHTML = '';
    const wallComments = data.wallComments || [];
    wallComments.forEach(comment => {
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.innerHTML = `<strong>${comment.username || 'Unknown'}</strong>: ${comment.text}
        ${comment.userId === currentUser.uid ? '<button class="deleteWallCommentBtn">Delete</button>' : ''}`;
      if (comment.userId === currentUser.uid) {
        div.querySelector('.deleteWallCommentBtn').addEventListener('click', async () => {
          await updateDoc(userDocRef, { wallComments: arrayRemove(comment) });
          loadProfile();
        });
      }
      wallCommentsContainer.appendChild(div);
    });

    // Top 10 friends (dummy visual)
    top10FriendsContainer.innerHTML = '';
    const top10 = data.top10Friends || [
      { username: 'Danielle W', pfp: '' },
      { username: 'John D', pfp: '' },
      { username: 'Alex P', pfp: '' }
    ];
    top10.forEach((friend, i) => {
      const div = document.createElement('div');
      div.className = 'top-friend';
      div.innerHTML = `<span>${i + 1}. ${friend.username}</span>
        ${friend.pfp ? `<img src="${friend.pfp}" />` : ''}`;
      top10FriendsContainer.appendChild(div);
    });

    // Apply saved theme
    if (data.theme) applyTheme(data.theme);

    // Load music
    if (data.musicURL) {
      musicPlayer.src = convertToEmbed(data.musicURL);
    }
  }

  // SAVE PROFILE INFO
  saveProfileBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
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
    loadProfile();
  });

  // SAVE PROFILE PICTURE
  saveProfilePfpBtn.addEventListener('click', async () => {
    const file = profilePfpInput.files[0];
    if (!file) return alert('Please select a picture first');
    try {
      const storageRef = ref(storage, `profileImages/${currentUser.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      profilePfp.src = `${url}?t=${Date.now()}`;
      await updateDoc(doc(db, 'users', currentUser.uid), { pfpURL: url });
      alert('Profile picture updated!');
    } catch (err) {
      console.error(err);
      alert('Failed to save profile picture');
    }
  });

  // ADD WALL COMMENT
  addWallCommentBtn.addEventListener('click', async () => {
    const text = wallCommentInput.value.trim();
    if (!text) return;
    const comment = { text, userId: currentUser.uid, username: usernameInput.value || 'Unknown', timestamp: Date.now() };
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { wallComments: arrayUnion(comment) });
      wallCommentInput.value = '';
      loadProfile();
    } catch (err) {
      console.error(err);
      alert('Failed to post comment');
    }
  });

  // SAVE THEME
  saveThemeBtn.addEventListener('click', async () => {
    const theme = themeSelect.value;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { theme });
      applyTheme(theme);
      alert('Theme applied!');
    } catch (err) {
      console.error(err);
      alert('Failed to save theme');
    }
  });

  // LOAD MUSIC
  loadMusicBtn.addEventListener('click', async () => {
    const url = musicInput.value.trim();
    if (!url) return;
    try {
      musicPlayer.src = convertToEmbed(url);
      await updateDoc(doc(db, 'users', currentUser.uid), { musicURL: url });
    } catch (err) {
      console.error(err);
      alert('Failed to load music');
    }
  });

  // INIT
  onAuthStateChanged(auth, user => {
    if (!user) return;
    currentUser = user;
    loadProfile();
  });
});
