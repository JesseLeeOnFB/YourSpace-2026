import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

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

  const themeSelect = document.getElementById('themeSelect');
  const saveThemeBtn = document.getElementById('saveThemeBtn');

  const musicUrlInput = document.getElementById('musicUrlInput');
  const loadMusicBtn = document.getElementById('loadMusicBtn');
  const musicIframe = document.getElementById('musicIframe');

  const customHtmlInput = document.getElementById('customHtmlInput');
  const customHtmlContainer = document.getElementById('customHtmlContainer');
  const saveCustomHtmlBtn = document.getElementById('saveCustomHtmlBtn');

  let currentUser = null;

  // Helper to load profile
  async function loadProfile() {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) return;
    const data = docSnap.data();

    usernameInput.value = data.username || '';
    bioInput.value = data.bio || '';
    locationInput.value = data.location || '';
    profilePfp.src = data.pfpURL || '';

    // Wall comments
    wallCommentsContainer.innerHTML = '';
    if (data.wallComments) {
      data.wallComments.forEach(comment => {
        const div = document.createElement('div');
        div.className = 'wall-comment';
        div.innerHTML = `<strong>${comment.username || 'Unknown'}</strong>: ${comment.text}
          ${currentUser.uid === currentUser.uid ? '<button class="deleteWallCommentBtn">Delete</button>' : ''}`;
        if (currentUser.uid === currentUser.uid) {
          const btn = div.querySelector('.deleteWallCommentBtn');
          btn?.addEventListener('click', async () => {
            await updateDoc(userDocRef, {
              wallComments: arrayRemove(comment)
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
        div.textContent = `${friend.username || 'Unknown'}`;
        top10FriendsContainer.appendChild(div);
      });
    }

    // Apply theme
    document.body.className = data.theme || 'default-theme';

    // Custom HTML
    customHtmlContainer.innerHTML = data.customHTML || '';
  }

  // Save profile info
  saveProfileBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userDocRef, {
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value
    });
    loadProfile();
  });

  // Save profile picture
  saveProfilePfpBtn.addEventListener('click', async () => {
    if (!currentUser || !profilePfpInput.files[0]) return;
    const file = profilePfpInput.files[0];
    const storageRef = ref(storage, `profilePictures/${currentUser.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    const userDocRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userDocRef, { pfpURL: url });
    loadProfile();
  });

  // Post wall comment
  addWallCommentBtn.addEventListener('click', async () => {
    if (!currentUser || !wallCommentInput.value.trim()) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    const comment = { text: wallCommentInput.value, username: usernameInput.value, timestamp: Date.now() };
    await updateDoc(userDocRef, { wallComments: arrayUnion(comment) });
    wallCommentInput.value = '';
    loadProfile();
  });

  // Theme
  saveThemeBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userDocRef, { theme: themeSelect.value });
    loadProfile();
  });

  // Music player
  loadMusicBtn.addEventListener('click', () => {
    const link = musicUrlInput.value.trim();
    if (!link) return;
    let embedUrl = link;
    if (link.includes('youtube.com') || link.includes('youtu.be')) {
      const id = link.split('v=')[1] || link.split('/').pop();
      embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    musicIframe.src = embedUrl;
  });

  // Custom HTML
  saveCustomHtmlBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    const html = customHtmlInput.value;
    const userDocRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userDocRef, { customHTML: html });
    loadProfile();
  });

  // Auth state
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) loadProfile();
  });

  // Navigation placeholder
  document.getElementById('navFeed').addEventListener('click', () => alert('Navigate to Feed'));
  document.getElementById('navProfile').addEventListener('click', () => alert('Navigate to Profile'));
  document.getElementById('navMessages').addEventListener('click', () => alert('Navigate to Messages'));
  document.getElementById('navSettings').addEventListener('click', () => alert('Navigate to Settings'));

});
