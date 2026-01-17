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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// DOM Elements
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
const saveCustomHtmlBtn = document.getElementById('saveCustomHtmlBtn');

const musicInput = document.getElementById('musicInput');
const playMusicBtn = document.getElementById('playMusicBtn');
const musicIframe = document.getElementById('musicIframe');

// Cache-busting helper
function timestampedURL(url) { return url + "?t=" + Date.now(); }

// Load profile
async function loadProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const userDoc = await db.collection('users').doc(user.uid).get();
  if (!userDoc.exists) return;

  const data = userDoc.data();
  usernameInput.value = data.username || '';
  bioInput.value = data.bio || '';
  locationInput.value = data.location || '';

  if (data.pfpURL) profilePfp.src = timestampedURL(data.pfpURL);

  // Wall comments
  wallCommentsContainer.innerHTML = '';
  if (data.wallComments) {
    data.wallComments.forEach(comment => {
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.innerHTML = `<strong>${comment.username || 'Unknown'}</strong>: ${comment.text} 
        ${user.uid === comment.userId || user.uid === data.uid ? '<button class="deleteWallCommentBtn">Delete</button>' : ''}`;
      if (div.querySelector('.deleteWallCommentBtn')) {
        div.querySelector('.deleteWallCommentBtn').addEventListener('click', async () => {
          await db.collection('users').doc(user.uid).update({
            wallComments: firebase.firestore.FieldValue.arrayRemove(comment)
          });
          loadProfile();
        });
      }
      wallCommentsContainer.appendChild(div);
    });
  }

  // Top 10 friends
  top10FriendsContainer.innerHTML = '';
  if (data.top10Friends) {
    data.top10Friends.forEach(friend => {
      const div = document.createElement('div');
      div.className = 'top-friend';
      div.innerHTML = `<img src="${friend.pfpURL || ''}" width="30" height="30" style="border-radius:50%;"> <span>${friend.username}</span>`;
      top10FriendsContainer.appendChild(div);
    });
  }

  // Apply theme
  if (data.theme) document.body.className = data.theme;

  // Apply custom HTML
  if (data.customHtml) document.body.innerHTML += data.customHtml;
}

// Save profile info
saveProfileBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;

  await db.collection('users').doc(user.uid).set({
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  }, { merge: true });

  alert('Profile info saved!');
});

// Save profile picture
saveProfilePfpBtn.addEventListener('click', async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert('Select a picture first.');
  const user = auth.currentUser;
  const storageRef = storage.ref(`profilePictures/${user.uid}/${Date.now()}_${file.name}`);
  await storageRef.put(file);
  const url = await storageRef.getDownloadURL();
  await db.collection('users').doc(user.uid).set({ pfpURL: url }, { merge: true });
  profilePfp.src = timestampedURL(url);
});

// Post comment
addWallCommentBtn.addEventListener('click', async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;
  const user = auth.currentUser;
  const comment = { text, userId: user.uid, username: usernameInput.value, timestamp: Date.now() };
  await db.collection('users').doc(user.uid).update({
    wallComments: firebase.firestore.FieldValue.arrayUnion(comment)
  });
  wallCommentInput.value = '';
  loadProfile();
});

// Top 10 friends edit
editTop10Btn.addEventListener('click', () => {
  const names = prompt('Enter top 10 usernames separated by commas:');
  if (!names) return;
  const user = auth.currentUser;
  const arr = names.split(',').slice(0, 10).map(n => ({ username: n.trim(), pfpURL: '' }));
  db.collection('users').doc(user.uid).set({ top10Friends: arr }, { merge: true });
  loadProfile();
});

// Theme apply
saveThemeBtn.addEventListener('click', async () => {
  const theme = themeSelector.value;
  document.body.className = theme;
  const user = auth.currentUser;
  await db.collection('users').doc(user.uid).set({ theme }, { merge: true });
});

// Custom HTML apply
saveCustomHtmlBtn.addEventListener('click', async () => {
  const customHtml = customHtmlInput.value;
  document.body.innerHTML += customHtml;
  const user = auth.currentUser;
  await db.collection('users').doc(user.uid).set({ customHtml }, { merge: true });
});

// Music player
playMusicBtn.addEventListener('click', () => {
  const link = musicInput.value.trim();
  if (!link) return;
  let embed = link;
  if (link.includes('youtube.com') || link.includes('youtu.be')) {
    const id = link.split('v=')[1] || link.split('youtu.be/')[1];
    embed = `https://www.youtube.com/embed/${id}?autoplay=1`;
  }
  musicIframe.src = embed;
});

// Navigation buttons placeholders
document.getElementById('navFeedBtn').addEventListener('click', () => alert('Feed placeholder'));
document.getElementById('navProfileBtn').addEventListener('click', () => alert('Profile placeholder'));
document.getElementById('navMessagesBtn').addEventListener('click', () => alert('Messages placeholder'));
document.getElementById('navNotificationsBtn').addEventListener('click', () => alert('Notifications placeholder'));

// INIT
auth.onAuthStateChanged(user => { if (user) loadProfile(); });
