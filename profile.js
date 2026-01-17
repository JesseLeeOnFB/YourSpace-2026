import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

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
const editTop10Btn = document.getElementById('editTop10Btn');

const themeSelect = document.getElementById('themeSelect');
const saveThemeBtn = document.getElementById('saveThemeBtn');
const customHtmlInput = document.getElementById('customHtmlInput');
const customHtmlContainer = document.getElementById('customHtmlContainer');

const musicLinkInput = document.getElementById('musicLinkInput');
const loadMusicBtn = document.getElementById('loadMusicBtn');
const musicIframe = document.getElementById('musicIframe');

let currentUser = null;

// CACHE BUSTER
const cacheBust = Date.now();

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  currentUser = user;
  await loadProfile();
});

async function loadProfile() {
  if (!currentUser) return;
  const userDocRef = doc(db, 'users', currentUser.uid);
  const docSnap = await getDoc(userDocRef);
  if (!docSnap.exists()) return;

  const data = docSnap.data();

  // Profile info
  usernameInput.value = data.username || '';
  bioInput.value = data.bio || '';
  locationInput.value = data.location || '';

  // Profile picture
  if (data.pfpURL) profilePfp.src = data.pfpURL + '?cb=' + cacheBust;

  // Wall comments
  wallCommentsContainer.innerHTML = '';
  (data.wallComments || []).forEach(comment => {
    const div = document.createElement('div');
    div.className = 'wall-comment';
    div.innerHTML = `<strong>${comment.username || 'Unknown'}</strong>: ${comment.text}
      ${currentUser.uid === comment.userId || currentUser.uid === currentUser.uid ? '<button class="deleteCommentBtn">Delete</button>' : ''}`;
    wallCommentsContainer.appendChild(div);
    const delBtn = div.querySelector('.deleteCommentBtn');
    if (delBtn) {
      delBtn.addEventListener('click', async () => {
        await updateDoc(userDocRef, {
          wallComments: data.wallComments.filter(c => c !== comment)
        });
        loadProfile();
      });
    }
  });

  // Top 10 friends
  renderTop10(data.top10Friends || []);

  // Theme
  document.body.className = data.theme || 'default-theme';
  if (data.customHtml) customHtmlContainer.innerHTML = data.customHtml;
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
  if (!currentUser) return;
  const file = profilePfpInput.files[0];
  if (!file) return alert('Select a picture');
  const storageRef = ref(storage, `profilePictures/${currentUser.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db, 'users', currentUser.uid), { pfpURL: url });
  profilePfp.src = url + '?cb=' + cacheBust;
});

// Wall comments
addWallCommentBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const text = wallCommentInput.value.trim();
  if (!text) return;
  const userDocRef = doc(db, 'users', currentUser.uid);
  const docSnap = await getDoc(userDocRef);
  const currentComments = docSnap.data().wallComments || [];
  currentComments.push({ text, username: usernameInput.value, userId: currentUser.uid });
  await updateDoc(userDocRef, { wallComments: currentComments });
  wallCommentInput.value = '';
  loadProfile();
});

// Top 10 friends drag-and-drop
function renderTop10(friends) {
  top10FriendsContainer.innerHTML = '';
  friends.forEach((friend, index) => {
    const div = document.createElement('div');
    div.className = 'top-friend';
    div.draggable = true;
    div.dataset.index = index;
    div.textContent = `${index + 1}. ${friend.username}`;
    top10FriendsContainer.appendChild(div);

    div.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', index));
    div.addEventListener('dragover', e => e.preventDefault());
    div.addEventListener('drop', e => {
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
  const userDocRef = doc(db, 'users', currentUser.uid);
  const friends = Array.from(top10FriendsContainer.children).map(div => ({
    username: div.textContent.replace(/^\d+\.\s/, '')
  }));
  await updateDoc(userDocRef, { top10Friends: friends });
  renderTop10(friends);
});

// Theme save
saveThemeBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const userDocRef = doc(db, 'users', currentUser.uid);
  const theme = themeSelect.value;
  const customHtml = customHtmlInput.value;
  await updateDoc(userDocRef, { theme, customHtml });
  loadProfile();
});

// Music player
loadMusicBtn.addEventListener('click', () => {
  let link = musicLinkInput.value.trim();
  if (!link) return;

  // Convert standard links to embed
  if (link.includes('youtube.com') || link.includes('youtu.be')) {
    const videoId = link.includes('youtu.be') ? link.split('/').pop() : new URL(link).searchParams.get('v');
    musicIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  } else if (link.includes('soundcloud.com')) {
    musicIframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(link)}&auto_play=true`;
  } else {
    musicIframe.src = link; // fallback
  }
});
