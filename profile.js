// PROFILE.JS - Direct Firebase, cache-busting, full features
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove, setDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

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

const addFriendInput = document.getElementById('addFriendInput');
const addFriendPreview = document.getElementById('addFriendPreview');
const addFriendBtn = document.getElementById('addFriendBtn');
const pendingRequestsContainer = document.getElementById('pendingRequestsContainer');
const allFriendsContainer = document.getElementById('allFriendsContainer');

// --- UTILITY FUNCTIONS ---

// Load user profile
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
  profilePfp.src = data.pfpURL || 'default-profile.png';

  // Load wall comments
  wallCommentsContainer.innerHTML = '';
  if (data.wallComments) {
    data.wallComments.forEach(comment => {
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.innerHTML = `<strong>${comment.username || 'Unknown'}</strong>: ${comment.text} ${comment.userId === user.uid ? '<button class="deleteWallCommentBtn">Delete</button>' : ''}`;
      if (comment.userId === user.uid) {
        div.querySelector('.deleteWallCommentBtn').addEventListener('click', async () => {
          await updateDoc(userDocRef, { wallComments: arrayRemove(comment) });
          loadProfile();
        });
      }
      wallCommentsContainer.appendChild(div);
    });
  }

  // Load Top 10 Friends
  top10FriendsContainer.innerHTML = '';
  if (data.top10Friends) {
    data.top10Friends.forEach((friend, idx) => {
      const div = document.createElement('div');
      div.className = 'top-friend';
      div.innerHTML = `${idx + 1}. ${friend.username || 'Unknown'}`;
      top10FriendsContainer.appendChild(div);
    });
  }

  // Load Pending Requests
  pendingRequestsContainer.innerHTML = '';
  if (data.pendingRequests) {
    data.pendingRequests.forEach(req => {
      const div = document.createElement('div');
      div.className = 'pending-request';
      div.innerHTML = `<strong>${req.username}</strong> wants to be friends
        <button class="acceptBtn">Accept</button>
        <button class="denyBtn">Deny</button>`;
      div.querySelector('.acceptBtn').addEventListener('click', async () => {
        await acceptFriendRequest(user.uid, req.userId);
        loadProfile();
      });
      div.querySelector('.denyBtn').addEventListener('click', async () => {
        await denyFriendRequest(user.uid, req.userId);
        loadProfile();
      });
      pendingRequestsContainer.appendChild(div);
    });
  }

  // Load All Friends
  allFriendsContainer.innerHTML = '';
  if (data.friends) {
    data.friends.forEach(friend => {
      const div = document.createElement('div');
      div.className = 'friend';
      div.textContent = friend.username || 'Unknown';
      allFriendsContainer.appendChild(div);
    });
  }
}

// Save profile info
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

// Save profile picture
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

// Add wall comment
addWallCommentBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;
  const text = wallCommentInput.value.trim();
  if (!text) return;
  const comment = { text, userId: user.uid, username: usernameInput.value || 'Unknown', timestamp: Date.now() };
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

// --- FRIEND REQUEST FUNCTIONS ---
async function searchUser(username) {
  const q = query(collection(db, 'users'), where('username', '==', username));
  const querySnap = await getDocs(q);
  if (!querySnap.empty) {
    const userData = querySnap.docs[0].data();
    return { uid: querySnap.docs[0].id, ...userData };
  }
  return null;
}

addFriendInput.addEventListener('input', async () => {
  const username = addFriendInput.value.trim();
  if (!username) return addFriendPreview.innerHTML = '';
  const user = await searchUser(username);
  if (user) {
    addFriendPreview.innerHTML = `<strong>${user.username}</strong>`;
    addFriendBtn.disabled = false;
    addFriendBtn.dataset.uid = user.uid;
  } else {
    addFriendPreview.innerHTML = 'No user found';
    addFriendBtn.disabled = true;
  }
});

addFriendBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;
  const targetUid = addFriendBtn.dataset.uid;
  const targetDocRef = doc(db, 'users', targetUid);
  const targetSnap = await getDoc(targetDocRef);
  if (!targetSnap.exists()) return alert('User does not exist');
  const targetData = targetSnap.data();

  // Add pending request to target user
  await updateDoc(targetDocRef, { pendingRequests: arrayUnion({ userId: user.uid, username: usernameInput.value }) });
  alert('Friend request sent!');
  addFriendPreview.innerHTML = '';
  addFriendInput.value = '';
  addFriendBtn.disabled = true;
});

// Accept/Deny functions
async function acceptFriendRequest(currentUid, requesterUid) {
  const currentDocRef = doc(db, 'users', currentUid);
  const requesterDocRef = doc(db, 'users', requesterUid);

  // Add each other as friends
  const currentSnap = await getDoc(currentDocRef);
  const requesterSnap = await getDoc(requesterDocRef);
  const currentData = currentSnap.data();
  const requesterData = requesterSnap.data();

  await updateDoc(currentDocRef, {
    friends: arrayUnion({ userId: requesterUid, username: requesterData.username }),
    pendingRequests: arrayRemove({ userId: requesterUid, username: requesterData.username })
  });

  await updateDoc(requesterDocRef, {
    friends: arrayUnion({ userId: currentUid, username: currentData.username })
  });
}

async function denyFriendRequest(currentUid, requesterUid) {
  const currentDocRef = doc(db, 'users', currentUid);
  const requesterDocRef = doc(db, 'users', requesterUid);
  const requesterSnap = await getDoc(requesterDocRef);
  const requesterData = requesterSnap.data();

  await updateDoc(currentDocRef, {
    pendingRequests: arrayRemove({ userId: requesterUid, username: requesterData.username })
  });
}

// INIT
onAuthStateChanged(auth, user => {
  if (!user) return;
  loadProfile();
});
