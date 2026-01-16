// PROFILE.JS - Direct Firebase connection, cache-busting included
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, query, where, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

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
const allFriendsContainer = document.getElementById('allFriendsContainer');

const searchUserInput = document.getElementById('searchUserInput');
const searchPreviewContainer = document.getElementById('searchPreviewContainer');
const sendFriendRequestBtn = document.getElementById('sendFriendRequestBtn');

// UTIL: Load user profile
async function loadProfile(userId) {
  const userDocRef = doc(db, 'users', userId);
  const docSnap = await getDoc(userDocRef);
  if (!docSnap.exists()) return null;
  return docSnap.data();
}

// Load current user profile
async function loadCurrentUserProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const data = await loadProfile(user.uid);
  if (!data) return;

  usernameInput.value = data.username || '';
  bioInput.value = data.bio || '';
  locationInput.value = data.location || '';
  if (data.pfpURL) profilePfp.src = `${data.pfpURL}?t=${Date.now()}`; // cache-busting

  // Wall comments
  wallCommentsContainer.innerHTML = '';
  if (data.wallComments) {
    data.wallComments.forEach(comment => {
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.innerHTML = `
        <strong>${comment.username || 'Unknown'}</strong>: ${comment.text}
        ${comment.userId === user.uid ? '<button class="deleteWallCommentBtn">Delete</button>' : ''}
      `;
      if (comment.userId === user.uid) {
        div.querySelector('.deleteWallCommentBtn').addEventListener('click', async () => {
          await updateDoc(doc(db, 'users', user.uid), {
            wallComments: arrayRemove(comment)
          });
          loadCurrentUserProfile();
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
      div.innerHTML = `<span>${friend.username}</span>`;
      top10FriendsContainer.appendChild(div);
    });
  }

  // All friends
  allFriendsContainer.innerHTML = '';
  if (data.friends) {
    data.friends.forEach(friend => {
      const div = document.createElement('div');
      div.className = 'friend';
      div.textContent = friend.username;
      allFriendsContainer.appendChild(div);
    });
  }
}

// SAVE profile info
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

// SAVE profile picture
saveProfilePfpBtn.addEventListener('click', async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert('Please select a picture first');

  const user = auth.currentUser;
  const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  profilePfp.src = `${url}?t=${Date.now()}`;
  await updateDoc(doc(db, 'users', user.uid), { pfpURL: url });
  alert('Profile picture updated!');
});

// ADD wall comment
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

  await updateDoc(doc(db, 'users', user.uid), { wallComments: arrayUnion(comment) });
  wallCommentInput.value = '';
  loadCurrentUserProfile();
});

// SEARCH users for friend requests
searchUserInput.addEventListener('input', async () => {
  const queryText = searchUserInput.value.trim();
  searchPreviewContainer.innerHTML = '';
  if (!queryText) return;

  const q = query(collection(db, 'users'), where('username', '==', queryText));
  const querySnap = await getDocs(q);
  querySnap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement('div');
    div.className = 'search-preview';
    div.textContent = data.username;
    div.addEventListener('click', () => {
      searchPreviewContainer.innerHTML = `<span>${data.username}</span>`;
      sendFriendRequestBtn.dataset.targetUid = docSnap.id;
    });
    searchPreviewContainer.appendChild(div);
  });
});

// SEND friend request
sendFriendRequestBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;
  const targetUid = sendFriendRequestBtn.dataset.targetUid;
  if (!targetUid) return alert('Select a user first');

  const targetDocRef = doc(db, 'users', targetUid);
  await updateDoc(targetDocRef, { pendingRequests: arrayUnion(user.uid) });
  alert('Friend request sent!');
});

// INIT
onAuthStateChanged(auth, user => {
  if (user) loadCurrentUserProfile();
});
