// =========================
// Firebase Config
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

// =========================
// DOM ELEMENTS
// =========================
const profilePfp = document.getElementById('profilePfp');
const profilePfpInput = document.getElementById('profilePfpInput');
const saveProfilePfpBtn = document.getElementById('saveProfilePfpBtn');

const usernameInput = document.getElementById('usernameInput');
const bioInput = document.getElementById('bioInput');
const locationInput = document.getElementById('locationInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');

const wallCommentsContainer = document.getElementById('wallCommentsContainer');
const wallCommentInput = document.getElementById('wallCommentInput');
const addWallCommentBtn = document.getElementById('addWallCommentBtn');

const top10FriendsContainer = document.getElementById('top10FriendsContainer');

const themeSelect = document.getElementById('themeSelect');
const saveThemeBtn = document.getElementById('saveThemeBtn');

const musicLinkInput = document.getElementById('musicLinkInput');
const loadMusicBtn = document.getElementById('loadMusicBtn');
const musicIframe = document.getElementById('musicIframe');

// =========================
// HELPERS
// =========================
function cacheBuster(url) {
  return url + '?cb=' + Date.now();
}

// =========================
// LOAD PROFILE
// =========================
async function loadProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const userDoc = await db.collection('users').doc(user.uid).get();
  if (!userDoc.exists) return;

  const data = userDoc.data();
  usernameInput.value = data.username || '';
  bioInput.value = data.bio || '';
  locationInput.value = data.location || '';
  profilePfp.src = data.pfpURL ? cacheBuster(data.pfpURL) : '';

  // Wall comments
  wallCommentsContainer.innerHTML = '';
  const commentsSnap = await db.collection('users').doc(user.uid).collection('wallComments').orderBy('timestamp').get();
  commentsSnap.forEach(docSnap => {
    const comment = docSnap.data();
    const div = document.createElement('div');
    div.className = 'wall-comment';
    div.innerHTML = `<strong>${comment.username || 'Unknown'}</strong>: ${comment.text}
      ${(user.uid === comment.authorId || user.uid === docSnap.ref.parent.parent.id) ? 
        '<button class="deleteWallCommentBtn">Delete</button>' : ''}`;
    if (div.querySelector('.deleteWallCommentBtn')) {
      div.querySelector('.deleteWallCommentBtn').addEventListener('click', async () => {
        await docSnap.ref.delete();
        loadProfile();
      });
    }
    wallCommentsContainer.appendChild(div);
  });

  // Top 10 friends (visual only)
  top10FriendsContainer.innerHTML = '';
  if (data.top10Friends) {
    data.top10Friends.forEach(f => {
      const div = document.createElement('div');
      div.className = 'top-friend';
      div.innerHTML = `<img src="${f.pfpURL || ''}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;"> <span>${f.username}</span>`;
      top10FriendsContainer.appendChild(div);
    });
  }

  // Theme
  document.body.className = data.theme || 'default-theme';
}

// =========================
// SAVE PROFILE INFO
// =========================
saveProfileBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = db.collection('users').doc(user.uid);
  await userDocRef.set({
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  }, { merge: true });

  loadProfile();
});

// =========================
// SAVE PROFILE PICTURE
// =========================
saveProfilePfpBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;
  const file = profilePfpInput.files[0];
  if (!file) return alert('Select a picture first');

  const storageRef = storage.ref(`profilePictures/${user.uid}/${Date.now()}_${file.name}`);
  await storageRef.put(file);
  const url = await storageRef.getDownloadURL();

  await db.collection('users').doc(user.uid).set({ pfpURL: url }, { merge: true });
  profilePfp.src = cacheBuster(url);
});

// =========================
// WALL COMMENT
// =========================
addWallCommentBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;
  const text = wallCommentInput.value.trim();
  if (!text) return;

  await db.collection('users').doc(user.uid).collection('wallComments').add({
    text,
    username: usernameInput.value || 'Unknown',
    authorId: user.uid,
    timestamp: Date.now()
  });

  wallCommentInput.value = '';
  loadProfile();
});

// =========================
// SAVE THEME
// =========================
saveThemeBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;
  const theme = themeSelect.value;

  await db.collection('users').doc(user.uid).set({ theme }, { merge: true });
  document.body.className = theme;
});

// =========================
// MUSIC PLAYER
// =========================
loadMusicBtn.addEventListener('click', () => {
  let url = musicLinkInput.value.trim();
  if (!url) return;

  // Convert to embed URL (YouTube example)
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = url.split('v=')[1] || url.split('/').pop();
    videoId = videoId.split('&')[0];
    url = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  }
  musicIframe.src = url;
});

// =========================
// INIT
// =========================
auth.onAuthStateChanged(user => {
  if (user) loadProfile();
});
