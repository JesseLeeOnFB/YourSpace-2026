// PROFILE.JS - Direct Firebase connection, cache-busting included
document.addEventListener('DOMContentLoaded', async () => {
  // Firebase imports
  const { initializeApp } = window.firebase.app;
  const { getAuth, onAuthStateChanged } = window.firebase.auth;
  const { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove } = window.firebase.firestore;
  const { getStorage, ref, uploadBytes, getDownloadURL } = window.firebase.storage;

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
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

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

  const themesDropdown = document.getElementById('themesDropdown');
  const saveThemeBtn = document.getElementById('saveThemeBtn');

  const navFeed = document.getElementById('navFeed');
  const navProfile = document.getElementById('navProfile');
  const navMessages = document.getElementById('navMessages');
  const navNotifications = document.getElementById('navNotifications');

  const musicUrlInput = document.getElementById('musicUrlInput');
  const loadMusicBtn = document.getElementById('loadMusicBtn');
  const musicPlayerContainer = document.getElementById('musicPlayerContainer');

  // NAVIGATION BUTTONS
  navFeed?.addEventListener('click', () => window.location.href = '/feed.html');
  navProfile?.addEventListener('click', () => window.location.href = '/profile.html');
  navMessages?.addEventListener('click', () => window.location.href = '/messages.html');
  navNotifications?.addEventListener('click', () => window.location.href = '/notifications.html');

  // LOAD PROFILE
  async function loadProfile() {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data();

    usernameInput.value = data.username || '';
    bioInput.value = data.bio || '';
    locationInput.value = data.location || '';
    if (data.pfpURL) profilePfp.src = data.pfpURL;

    // Load wall comments
    wallCommentsContainer.innerHTML = '';
    if (data.wallComments && data.wallComments.length) {
      data.wallComments.forEach(comment => {
        const div = document.createElement('div');
        div.className = 'wall-comment';
        div.innerHTML = `
          <strong>${comment.username || 'Unknown'}</strong>: ${comment.text}
          ${comment.userId === user.uid ? '<button class="deleteWallCommentBtn">Delete</button>' : ''}
        `;
        if (comment.userId === user.uid) {
          div.querySelector('.deleteWallCommentBtn').addEventListener('click', async () => {
            await updateDoc(userDocRef, {
              wallComments: arrayRemove(comment)
            });
            loadProfile();
          });
        }
        wallCommentsContainer.appendChild(div);
      });
    }

    // Load theme
    if (data.theme) {
      themesDropdown.value = data.theme;
      document.body.className = data.theme;
    }
  }

  // SAVE PROFILE INFO
  saveProfileBtn?.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
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
  });

  // SAVE PROFILE PICTURE
  saveProfilePfpBtn?.addEventListener('click', async () => {
    const file = profilePfpInput.files[0];
    if (!file) return alert('Please select a picture first');
    try {
      const user = auth.currentUser;
      const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      profilePfp.src = url;

      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { pfpURL: url });
      alert('Profile picture updated!');
    } catch (err) {
      console.error(err);
      alert('Failed to save profile picture');
    }
  });

  // ADD WALL COMMENT
  addWallCommentBtn?.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;
    const text = wallCommentInput.value.trim();
    if (!text) return;

    const comment = {
      text,
      userId: user.uid,
      username: usernameInput.value || 'Unknown',
      timestamp: Date.now()
    };

    const userDocRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userDocRef, {
        wallComments: arrayUnion(comment)
      });
      wallCommentInput.value = '';
      loadProfile();
    } catch (err) {
      console.error(err);
      alert('Failed to post comment');
    }
  });

  // SAVE THEME
  saveThemeBtn?.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { theme: themesDropdown.value });
      document.body.className = themesDropdown.value;
      alert('Theme saved!');
    } catch (err) {
      console.error(err);
      alert('Failed to save theme');
    }
  });

  // MUSIC PLAYER
  function getEmbedUrl(url) {
    if (!url) return '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be') ? url.split('youtu.be/')[1] : url.split('v=')[1];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    } else if (url.includes('soundcloud.com')) {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true`;
    } else if (url.includes('spotify.com')) {
      return url.replace('open.spotify.com', 'open.spotify.com/embed');
    }
    return url;
  }

  loadMusicBtn?.addEventListener('click', () => {
    const embedUrl = getEmbedUrl(musicUrlInput.value.trim());
    if (!embedUrl) return;
    musicPlayerContainer.innerHTML = `<iframe width="300" height="80" src="${embedUrl}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  });

  // INIT
  onAuthStateChanged(auth, user => {
    if (!user) return;
    loadProfile();
  });
});
