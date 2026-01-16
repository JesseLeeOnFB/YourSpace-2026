// Direct Firebase SDK connection with your API keys

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.24.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.24.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove, query, collection, where, getDocs } from "https://www.gstatic.com/firebasejs/9.24.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.24.0/firebase-storage.js";

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

// Init Firebase
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

const top10FriendsContainer = document.getElementById('top10FriendsContainer');

const friendSearchInput = document.getElementById('friendSearchInput');
const friendPreviewContainer = document.getElementById('friendPreviewContainer');

// Cache-busting function for Storage URLs
const cacheBuster = url => `${url}?cb=${Date.now()}`;

// --- LOAD PROFILE ---
async function loadProfile(user) {
  if (!user) return;

  const userDocRef = doc(db, 'users', user.uid);
  const docSnap = await getDoc(userDocRef);
  if (!docSnap.exists()) return;

  const data = docSnap.data();
  usernameInput.value = data.username || '';
  bioInput.value = data.bio || '';
  locationInput.value = data.location || '';

  if (data.pfpURL) profilePfp.src = cacheBuster(data.pfpURL);

  // Wall comments
  wallCommentsContainer.innerHTML = '';
  if (data.wallComments && data.wallComments.length > 0) {
    data.wallComments.forEach(comment => {
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.innerHTML = `<strong>${comment.username || 'Unknown'}</strong>: ${comment.text}`;
      // Delete button only for own comments
      if (comment.userId === user.uid) {
        const btn = document.createElement('button');
        btn.textContent = 'Delete';
        btn.addEventListener('click', async () => {
          await updateDoc(userDocRef, { wallComments: arrayRemove(comment) });
          loadProfile(user);
        });
        div.appendChild(btn);
      }
      wallCommentsContainer.appendChild(div);
    });
  }

  // Top 10 friends
  top10FriendsContainer.innerHTML = '';
  if (data.top10Friends && data.top10Friends.length > 0) {
    data.top10Friends.forEach(friend => {
      const div = document.createElement('div');
      div.className = 'top-friend';
      div.textContent = friend.username || 'Unknown';
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
  } catch (err) {
    console.error(err);
    alert('Failed to update profile info');
  }
});

// --- SAVE PROFILE PICTURE ---
saveProfilePfpBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;
  const file = profilePfpInput.files[0];
  if (!file) return alert('Please select a picture first');

  try {
    const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    profilePfp.src = cacheBuster(url);

    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { pfpURL: url });
    alert('Profile picture updated!');
  } catch (err) {
    console.error(err);
    alert('Failed to save profile picture');
  }
});

// --- ADD WALL COMMENT ---
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
    loadProfile(user);
  } catch (err) {
    console.error(err);
    alert('Failed to post comment');
  }
});

// --- FRIEND SEARCH & PREVIEW ---
friendSearchInput.addEventListener('input', async () => {
  const queryText = friendSearchInput.value.trim();
  if (!queryText) {
    friendPreviewContainer.innerHTML = '';
    return;
  }

  const usersCol = collection(db, 'users');
  const q = query(usersCol, where('username', '==', queryText));
  const querySnap = await getDocs(q);

  friendPreviewContainer.innerHTML = '';
  querySnap.forEach(docSnap => {
    const u = docSnap.data();
    const div = document.createElement('div');
    div.innerHTML = `
      <strong>${u.username}</strong>
      <button class="sendFriendRequestBtn">Add Friend</button>
    `;
    const btn = div.querySelector('.sendFriendRequestBtn');
    btn.addEventListener('click', async () => {
      // Placeholder for send friend request (pending system)
      alert('Send friend request functionality coming next');
    });
    friendPreviewContainer.appendChild(div);
  });
});

// --- INIT ---
onAuthStateChanged(auth, user => {
  if (!user) return;
  loadProfile(user);
});
