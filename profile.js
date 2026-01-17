// =========================
// PROFILE.JS - Direct Firebase connection, cache-busting included
// =========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, orderBy, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getStorage, ref, getDownloadURL, uploadBytes } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

// =========================
// CONFIG
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// =========================
// DOM ELEMENTS
// =========================
const usernameInput = document.getElementById('usernameInput');
const bioInput = document.getElementById('bioInput');
const locationInput = document.getElementById('locationInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const profilePfp = document.getElementById('profilePfp');
const savePfpBtn = document.getElementById('savePfpBtn');
const wallCommentInput = document.getElementById('wallCommentInput');
const postCommentBtn = document.getElementById('postCommentBtn');
const wallContainer = document.getElementById('wallCommentsContainer');
const top10FriendsContainer = document.getElementById('top10FriendsContainer');
const editTop10Btn = document.getElementById('editTop10Btn');
const themeSelect = document.getElementById('themeSelect');
const saveThemeBtn = document.getElementById('saveThemeBtn');
const customHtmlTextarea = document.getElementById('customHtmlTextarea');
const applyCustomHtmlBtn = document.getElementById('applyCustomHtmlBtn');
const customHtmlContainer = document.getElementById('customHtmlContainer');
const musicInput = document.getElementById('musicInput');
const musicIframe = document.getElementById('musicIframe');

// =========================
// STATE
// =========================
let currentUser = null;
let currentProfile = null;

// =========================
// LOAD USER PROFILE
// =========================
onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  currentUser = user;

  const profileRef = doc(db, 'users', user.uid);
  const profileSnap = await getDoc(profileRef);
  if (!profileSnap.exists()) {
    await setDoc(profileRef, { username: '', bio: '', location: '', top10Friends: [] });
  }
  currentProfile = (await getDoc(profileRef)).data();

  // Fill inputs
  usernameInput.value = currentProfile.username || '';
  bioInput.value = currentProfile.bio || '';
  locationInput.value = currentProfile.location || '';

  // Load profile picture
  try {
    const pfpUrl = await getDownloadURL(ref(storage, `profilePictures/${user.uid}/pfp.jpg`));
    profilePfp.src = pfpUrl + '?cacheBust=' + Date.now();
  } catch (err) { profilePfp.src = ''; }

  // Load wall comments
  await loadWallComments();

  // Load top 10 friends
  renderTop10(currentProfile.top10Friends || []);

  // Load theme
  document.body.className = currentProfile.theme || 'default-theme';

  // Load custom HTML
  customHtmlContainer.innerHTML = currentProfile.customHtml || '';
});

// =========================
// SAVE PROFILE INFO
// =========================
saveProfileBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  await updateDoc(doc(db, 'users', currentUser.uid), {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  alert('Profile info saved');
});

// =========================
// SAVE PROFILE PICTURE
// =========================
savePfpBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const file = profilePfp.files ? profilePfp.files[0] : null;
  if (!file) return alert('Select a picture first');
  const pfpRef = ref(storage, `profilePictures/${currentUser.uid}/pfp.jpg`);
  await uploadBytes(pfpRef, file);
  profilePfp.src = URL.createObjectURL(file);
});

// =========================
// WALL COMMENTS
// =========================
postCommentBtn.addEventListener('click', async () => {
  if (!currentUser || !wallCommentInput.value) return;
  await addDoc(collection(db, 'users', currentUser.uid, 'wallComments'), {
    authorId: currentUser.uid,
    text: wallCommentInput.value,
    timestamp: Date.now()
  });
  wallCommentInput.value = '';
  await loadWallComments();
});

async function loadWallComments() {
  wallContainer.innerHTML = '';
  const q = query(collection(db, 'users', currentUser.uid, 'wallComments'), orderBy('timestamp', 'asc'));
  const commentsSnap = await getDocs(q);
  commentsSnap.forEach(comment => {
    const data = comment.data();
    const div = document.createElement('div');
    div.className = 'wall-comment';
    div.innerHTML = `<span>${data.text}</span>`;
    if (currentUser.uid === data.authorId || currentUser.uid === currentUser.uid) {
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.onclick = async () => {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'wallComments', comment.id));
        await loadWallComments();
      };
      div.appendChild(delBtn);
    }
    wallContainer.appendChild(div);
  });
}

// =========================
// TOP 10 DRAG-AND-DROP
// =========================
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

// Save top 10 order
editTop10Btn.addEventListener('click', async () => {
  if (!currentUser) return;
  const friends = Array.from(top10FriendsContainer.children).map(div => ({
    username: div.textContent.replace(/^\d+\.\s/, '')
  }));
  await updateDoc(doc(db, 'users', currentUser.uid), { top10Friends: friends });
  renderTop10(friends);
});

// =========================
// THEME SELECT
// =========================
saveThemeBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const theme = themeSelect.value;
  document.body.className = theme;
  await updateDoc(doc(db, 'users', currentUser.uid), { theme });
});

// =========================
// CUSTOM HTML
// =========================
applyCustomHtmlBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const html = customHtmlTextarea.value;
  customHtmlContainer.innerHTML = html;
  await updateDoc(doc(db, 'users', currentUser.uid), { customHtml: html });
});

// =========================
// MUSIC PLAYER
// =========================
musicInput.addEventListener('change', () => {
  let url = musicInput.value.trim();
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = url.includes('youtu.be') ? url.split('/').pop() : new URL(url).searchParams.get('v');
    musicIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  } else if (url.includes('soundcloud.com')) {
    musicIframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true`;
  } else {
    alert('Unsupported URL');
  }
});
