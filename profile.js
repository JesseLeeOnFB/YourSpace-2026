// Direct Firebase connection
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

// INITIALIZE
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM ELEMENTS
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
const themeSelect = document.getElementById('themeSelect');
const saveThemeBtn = document.getElementById('saveThemeBtn');
const customHtmlInput = document.getElementById('customHtmlInput');
const saveCustomHtmlBtn = document.getElementById('saveCustomHtmlBtn');
const customHtmlPreview = document.getElementById('customHtmlPreview');
const top10FriendsContainer = document.getElementById('top10FriendsContainer');
const editTop10Btn = document.getElementById('editTop10Btn');
const musicLinkInput = document.getElementById('musicLinkInput');
const saveMusicBtn = document.getElementById('saveMusicBtn');
const musicIframe = document.getElementById('musicIframe');

// UTIL: cache-buster
function cacheBuster(url) {
  return `${url}?cb=${Date.now()}`;
}

// LOAD PROFILE
async function loadProfile(user) {
  const userDocRef = doc(db, 'users', user.uid);
  const docSnap = await getDoc(userDocRef);
  if (!docSnap.exists()) return;

  const data = docSnap.data();

  usernameInput.value = data.username || '';
  bioInput.value = data.bio || '';
  locationInput.value = data.location || '';
  if (data.pfpURL) profilePfp.src = cacheBuster(data.pfpURL);
  if (data.theme) document.body.className = data.theme;
  if (data.customHTML) customHtmlPreview.innerHTML = data.customHTML;

  // WALL COMMENTS
  wallCommentsContainer.innerHTML = '';
  if (data.wallComments && data.wallComments.length > 0) {
    data.wallComments.forEach(comment => {
      const div = document.createElement('div');
      div.className = 'wall-comment';
      const username = comment.username || 'Unknown';
      div.innerHTML = `<span><strong>${username}</strong>: ${comment.text}</span>`;
      // Show delete if profile owner
      if (user.uid === user.uid || user.uid === comment.userId) {
        const btn = document.createElement('button');
        btn.textContent = 'Delete';
        btn.addEventListener('click', async () => {
          const updatedComments = data.wallComments.filter(c => c !== comment);
          await updateDoc(userDocRef, { wallComments: updatedComments });
          loadProfile(user);
        });
        div.appendChild(btn);
      }
      wallCommentsContainer.appendChild(div);
    });
  }

  // TOP 10 FRIENDS (dummy editable)
  top10FriendsContainer.innerHTML = '';
  if (data.top10Friends && data.top10Friends.length > 0) {
    data.top10Friends.forEach((friend, index) => {
      const div = document.createElement('div');
      div.className = 'top-friend';
      div.innerHTML = `<span>${index+1}. <img src="${cacheBuster(friend.pfpURL || '')}" width="30" height="30" style="border-radius:50%;"> ${friend.username}</span>`;
      top10FriendsContainer.appendChild(div);
    });
  }
}

// SAVE PROFILE INFO
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

// SAVE PROFILE PICTURE
saveProfilePfpBtn.addEventListener('click', async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert('Select a picture first');
  const user = auth.currentUser;
  const storageRef = ref(storage, `profilePictures/${user.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  profilePfp.src = cacheBuster(url);
  const userDocRef = doc(db, 'users', user.uid);
  await updateDoc(userDocRef, { pfpURL: url });
  alert('Profile picture updated!');
});

// ADD WALL COMMENT
addWallCommentBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;
  const text = wallCommentInput.value.trim();
  if (!text) return;
  const comment = { text, userId: user.uid, username: usernameInput.value || 'Unknown', timestamp: Date.now() };
  const userDocRef = doc(db, 'users', user.uid);
  await updateDoc(userDocRef, { wallComments: arrayUnion(comment) });
  wallCommentInput.value = '';
  loadProfile(user);
});

// THEME SAVE
saveThemeBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;
  const theme = themeSelect.value;
  document.body.className = theme;
  const userDocRef = doc(db, 'users', user.uid);
  await updateDoc(userDocRef, { theme });
});

// CUSTOM HTML
saveCustomHtmlBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;
  const html = customHtmlInput.value;
  customHtmlPreview.innerHTML = html;
  const userDocRef = doc(db, 'users', user.uid);
  await updateDoc(userDocRef, { customHTML: html });
});

// MUSIC PLAYER
saveMusicBtn.addEventListener('click', () => {
  let link = musicLinkInput.value.trim();
  if (!link) return;
  if (link.includes('youtube.com') || link.includes('youtu.be')) {
    link = link.replace('watch?v=', 'embed/');
  }
  musicIframe.src = cacheBuster(link);
});

// INIT
onAuthStateChanged(auth, user => {
  if (!user) return;
  loadProfile(user);
});

// NAVIGATION PLACEHOLDER (can update later)
document.getElementById('navFeedBtn').addEventListener('click', () => alert('Navigate to Feed'));
document.getElementById('navProfileBtn').addEventListener('click', () => alert('Navigate to Profile'));
document.getElementById('navNotificationsBtn').addEventListener('click', () => alert('Navigate to Notifications'));
document.getElementById('navMessagesBtn').addEventListener('click', () => alert('Navigate to Messages'));
