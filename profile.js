import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

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

document.addEventListener('DOMContentLoaded', async () => {
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

  const themeButtons = document.querySelectorAll('.theme-btn');

  const musicInput = document.getElementById('musicInput');
  const loadMusicBtn = document.getElementById('loadMusicBtn');
  const musicPlayerContainer = document.getElementById('musicPlayerContainer');

  const notificationsContainer = document.getElementById('notifications-container');
  const notificationsList = document.getElementById('notificationsList');
  const notifBadge = document.getElementById('notif-badge');

  // ===== Load Profile =====
  async function loadProfile(userId) {
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data();
    usernameInput.value = data.username || '';
    bioInput.value = data.bio || '';
    locationInput.value = data.location || '';
    profilePfp.src = data.pfpURL || 'default.png';

    // Wall comments
    wallCommentsContainer.innerHTML = '';
    (data.wallComments || []).forEach(comment => {
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.innerHTML = `<strong>${comment.username || 'Unknown'}</strong>: ${comment.text}`;
      // Delete button for own comments
      if (comment.userId === userId) {
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', async () => {
          await updateDoc(userDocRef, { wallComments: arrayUnion() }); // TODO: implement arrayRemove properly
          loadProfile(userId);
        });
        div.appendChild(delBtn);
      }
      wallCommentsContainer.appendChild(div);
    });

    // Top 10 friends (dummy visual)
    top10FriendsContainer.innerHTML = '';
    (data.top10Friends || []).forEach(friend => {
      const div = document.createElement('div');
      div.className = 'top-friend';
      div.innerHTML = `<img src="${friend.pfpURL || 'default.png'}"><span>${friend.username}</span>`;
      top10FriendsContainer.appendChild(div);
    });
  }

  // ===== Save Profile Info =====
  saveProfileBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value
    });
    alert('Profile info updated!');
  });

  // ===== Save Profile Picture =====
  saveProfilePfpBtn.addEventListener('click', async () => {
    const file = profilePfpInput.files[0];
    if (!file) return alert('Select a picture first');
    const user = auth.currentUser;
    const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    profilePfp.src = url;
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { pfpURL: url });
    alert('Profile picture updated!');
  });

  // ===== Add Wall Comment =====
  addWallCommentBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;
    const text = wallCommentInput.value.trim();
    if (!text) return;
    const comment = { text, username: usernameInput.value, userId: user.uid, timestamp: Date.now() };
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { wallComments: arrayUnion(comment) });
    wallCommentInput.value = '';
    loadProfile(user.uid);
  });

  // ===== Theme Buttons =====
  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      document.body.className = theme;
    });
  });

  // ===== Music Player =====
  loadMusicBtn.addEventListener('click', () => {
    const link = musicInput.value.trim();
    if (!link) return;
    let embedUrl = '';
    if (link.includes('youtube.com') || link.includes('youtu.be')) {
      const videoId = link.split('v=')[1] || link.split('/').pop();
      embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    // TODO: SoundCloud, Spotify, Pandora embeds
    musicPlayerContainer.innerHTML = `<iframe src="${embedUrl}" allow="autoplay" allowfullscreen></iframe>`;
  });

  // ===== Notifications =====
  onAuthStateChanged(auth, user => {
    if (!user) return;
    loadProfile(user.uid);

    const notifColRef = doc(db, 'users', user.uid);
    onSnapshot(notifColRef, snap => {
      const data = snap.data();
      const notifications = data.notifications || [];
      notifBadge.textContent = notifications.filter(n => !n.read).length;
      notificationsList.innerHTML = '';
      notifications.forEach(n => {
        const div = document.createElement('div');
        div.className = 'notification-card';
        div.textContent = `${n.username || 'Unknown'} ${n.type}`;
        notificationsList.appendChild(div);
      });
    });
  });
});
