import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove, query, where, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

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
const addFriendInput = document.getElementById('addFriendInput');
const addFriendPreview = document.getElementById('addFriendPreview');

const musicInput = document.getElementById('musicInput');
const savePlayMusicBtn = document.getElementById('savePlayMusicBtn');
const musicPlayerContainer = document.getElementById('musicPlayerContainer');

// --- PROFILE LOADING ---
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

  // Wall Comments
  wallCommentsContainer.innerHTML = '';
  if (data.wallComments?.length) {
    data.wallComments.forEach(comment => {
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.innerHTML = `<strong>${comment.username}</strong>: ${comment.text} ${comment.userId === user.uid ? '<button class="deleteWallCommentBtn">Delete</button>' : ''}`;
      if (comment.userId === user.uid) {
        div.querySelector('.deleteWallCommentBtn').addEventListener('click', async () => {
          await updateDoc(userDocRef, { wallComments: arrayRemove(comment) });
          loadProfile();
        });
      }
      wallCommentsContainer.appendChild(div);
    });
  }

  // Top 10 Friends
  top10FriendsContainer.innerHTML = '';
  if (data.top10Friends?.length) {
    data.top10Friends.forEach(friend => {
      const div = document.createElement('div');
      div.className = 'top-friend';
      div.innerHTML = `<span>${friend.username}</span>`;
      top10FriendsContainer.appendChild(div);
    });
  }
}

// --- SAVE PROFILE INFO ---
saveProfileBtn.addEventListener('click', async () => {
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
    loadProfile();
  } catch (err) {
    console.error(err);
    alert('Failed to update profile info');
  }
});

// --- SAVE PROFILE PICTURE ---
saveProfilePfpBtn.addEventListener('click', async () => {
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

// --- WALL COMMENTS ---
addWallCommentBtn.addEventListener('click', async () => {
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
    await updateDoc(userDocRef, { wallComments: arrayUnion(comment) });
    wallCommentInput.value = '';
    loadProfile();
  } catch (err) {
    console.error(err);
    alert('Failed to post comment');
  }
});

// --- MUSIC PLAYER ---
savePlayMusicBtn.addEventListener('click', () => {
  const url = musicInput.value.trim();
  if (!url) return alert('Please enter a URL');

  musicPlayerContainer.innerHTML = '';
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.width = '100%';
  iframe.height = '80';
  iframe.allow = 'autoplay';
  iframe.allowFullscreen = true;
  musicPlayerContainer.appendChild(iframe);
});

// --- ADD FRIEND ---
addFriendInput.addEventListener('input', async () => {
  addFriendPreview.innerHTML = '';
  const queryText = addFriendInput.value.trim();
  if (!queryText) return;

  const usersCol = collection(db, 'users');
  const q = query(usersCol, where('username', '==', queryText));
  const snapshot = await getDocs(q);
  snapshot.forEach(docSnap => {
    const friend = docSnap.data();
    if (docSnap.id === auth.currentUser.uid) return; // skip self
    const div = document.createElement('div');
    div.className = 'friend-preview';
    div.innerHTML = `<span>${friend.username}</span> <button>Add Friend</button>`;
    div.querySelector('button').addEventListener('click', async () => {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { top10Friends: arrayUnion({ username: friend.username, userId: docSnap.id }) });
      alert('Friend added to top 10!');
      loadProfile();
    });
    addFriendPreview.appendChild(div);
  });
});

// --- NAVIGATION ---
document.getElementById('navFeedBtn').addEventListener('click', () => window.location.href = '/feed.html');
document.getElementById('navProfileBtn').addEventListener('click', () => window.location.href = '/profile.html');
document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut().then(() => window.location.href = '/login.html'));

// --- INIT ---
onAuthStateChanged(auth, user => {
  if (!user) window.location.href = '/login.html';
  else loadProfile();
});
