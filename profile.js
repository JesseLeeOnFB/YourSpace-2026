// PROFILE.JS - Direct Firebase connection, cache-busting included
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, collection, query, getDocs, where, addDoc, orderBy } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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

let currentUser;
const profilePfp = document.getElementById('profilePfp');
const pfpInput = document.getElementById('pfpInput');
const savePfpBtn = document.getElementById('savePfpBtn');
const usernameInput = document.getElementById('usernameInput');
const bioInput = document.getElementById('bioInput');
const locationInput = document.getElementById('locationInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const wallComments = document.getElementById('wallComments');
const wallCommentInput = document.getElementById('wallCommentInput');
const postWallCommentBtn = document.getElementById('postWallCommentBtn');
const top10FriendsContainer = document.getElementById('top10FriendsContainer');
const editTop10Btn = document.getElementById('editTop10Btn');
const musicInput = document.getElementById('musicInput');
const loadMusicBtn = document.getElementById('loadMusicBtn');
const musicIframe = document.getElementById('musicIframe');
const presetThemeSelect = document.getElementById('presetThemeSelect');
const saveThemeBtn = document.getElementById('saveThemeBtn');
const customHtmlInput = document.getElementById('customHtmlInput');
const applyCustomHtmlBtn = document.getElementById('applyCustomHtmlBtn');
const customHtmlContainer = document.getElementById('customHtmlContainer');

document.addEventListener('DOMContentLoaded', async () => {
  // Wait for user
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    currentUser = user;

    // Load profile
    const userDocRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      usernameInput.value = data.username || '';
      bioInput.value = data.bio || '';
      locationInput.value = data.location || '';
      presetThemeSelect.value = data.theme || 'default-theme';
      document.body.className = data.theme || 'default-theme';

      if (data.top10Friends) renderTop10(data.top10Friends);
      if (data.customHtml) customHtmlContainer.innerHTML = data.customHtml;

      if (data.pfpUrl) profilePfp.src = data.pfpUrl;
    }

    // Load wall comments
    const wallCol = collection(db, 'users', user.uid, 'wallComments');
    const wallSnap = await getDocs(wallCol);
    wallComments.innerHTML = '';
    wallSnap.forEach(docSnap => {
      const comment = docSnap.data();
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.textContent = comment.text;
      if (comment.authorId === user.uid) {
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.onclick = async () => {
          await deleteDoc(doc(wallCol, docSnap.id));
          div.remove();
        };
        div.appendChild(delBtn);
      }
      wallComments.appendChild(div);
    });
  });
});

// Save profile info
saveProfileBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const userDocRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userDocRef, {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
});

// Save profile picture
savePfpBtn.addEventListener('click', async () => {
  if (!currentUser || !pfpInput.files[0]) return;
  const file = pfpInput.files[0];
  const fileRef = ref(storage, `profilePictures/${currentUser.uid}/${file.name}`);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);
  const userDocRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userDocRef, { pfpUrl: url });
  profilePfp.src = url;
});

// --- Top 10 Drag-and-Drop ---
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
    div.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', index);
    });
    div.addEventListener('dragover', (e) => e.preventDefault());
    div.addEventListener('drop', (e) => {
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
  const friends = Array.from(top10FriendsContainer.children).map(div => ({
    username: div.textContent.replace(/^\d+\.\s/, '')
  }));
  const userDocRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userDocRef, { top10Friends: friends });
  renderTop10(friends);
});

// Music player inline
loadMusicBtn.addEventListener('click', () => {
  let url = musicInput.value;
  if (url.includes('youtube')) {
    const videoId = new URL(url).searchParams.get('v');
    musicIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  } else if (url.includes('soundcloud')) {
    musicIframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true`;
  } else {
    alert('Unsupported link');
  }
});

// Theme select
saveThemeBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const theme = presetThemeSelect.value;
  document.body.className = theme;
  const userDocRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userDocRef, { theme });
});

// Custom HTML apply
applyCustomHtmlBtn.addEventListener('click', async () => {
  if (!currentUser) return;
  const html = customHtmlInput.value;
  customHtmlContainer.innerHTML = html;
  const userDocRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userDocRef, { customHtml: html });
});

// NAV BUTTONS
document.getElementById('navFeed').addEventListener('click', () => location.href = '/feed.html');
document.getElementById('navProfile').addEventListener('click', () => location.href = '/profile.html');
document.getElementById('navMessages').addEventListener('click', () => location.href = '/messages.html');
document.getElementById('navSettings').addEventListener('click', () => location.href = '/settings.html');
