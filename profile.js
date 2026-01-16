// PROFILE.JS - Direct Firebase connection, cache-busting included
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

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
const sendFriendRequestBtn = document.getElementById('sendFriendRequestBtn');

// NAVIGATION BUTTONS
document.getElementById('navHome').addEventListener('click', () => { window.location.href = 'feed.html'; });
document.getElementById('navMessages').addEventListener('click', () => { window.location.href = 'messages.html'; });
// Add more navs as needed

// Load current user profile
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
  if (data.pfpURL) profilePfp.src = `${data.pfpURL}?cachebust=${Date.now()}`; // cache-busting

  // Load wall comments
  wallCommentsContainer.innerHTML = '';
  if (data.wallComments && data.wallComments.length > 0) {
    data.wallComments.forEach(comment => {
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.innerHTML = `
        <strong>${comment.username || 'Unknown'}</strong>: ${comment.text}
        ${comment.userId === user.uid ? '<button class="deleteWallCommentBtn">Delete</button>' : ''}
      `;
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
  if (data.top10Friends && data.top10Friends.length > 0) {
    data.top10Friends.forEach(friend => {
      const div = document.createElement('div');
      div.className = 'top-friend';
      div.textContent = `${friend.rank || ''}: ${friend.username}`;
      top10FriendsContainer.appendChild(div);
    });
  }
}

// SAVE PROFILE INFO
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

// SAVE PROFILE PICTURE
saveProfilePfpBtn.addEventListener('click', async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert('Please select a picture first');

  try {
    const user = auth.currentUser;
    const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    profilePfp.src = `${url}?cachebust=${Date.now()}`;
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { pfpURL: url });
    alert('Profile picture updated!');
  } catch (err) {
    console.error(err);
    alert('Failed to save profile picture');
  }
});

// ADD WALL COMMENT
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

// SEARCH AND PREVIEW FRIEND
addFriendInput.addEventListener('input', async () => {
  const searchValue = addFriendInput.value.trim().toLowerCase();
  if (!searchValue) {
    addFriendPreview.textContent = '';
    sendFriendRequestBtn.disabled = true;
    return;
  }

  const usersCol = collection(db, 'users');
  const q = query(usersCol, where('username_lowercase', '>=', searchValue), where('username_lowercase', '<=', searchValue + '\uf8ff'));
  const querySnap = await getDocs(q);

  if (!querySnap.empty) {
    const userData = querySnap.docs[0].data();
    addFriendPreview.textContent = `Add ${userData.username}?`;
    sendFriendRequestBtn.disabled = false;
    sendFriendRequestBtn.dataset.targetUid = querySnap.docs[0].id;
  } else {
    addFriendPreview.textContent = 'User not found';
    sendFriendRequestBtn.disabled = true;
  }
});

// SEND FRIEND REQUEST
sendFriendRequestBtn.addEventListener('click', async () => {
  const targetUid = sendFriendRequestBtn.dataset.targetUid;
  const user = auth.currentUser;
  if (!targetUid || !user) return;

  const targetDocRef = doc(db, 'users', targetUid);
  const currentUserRef = doc(db, 'users', user.uid);

  try {
    // Add to target user's pendingRequests
    await updateDoc(targetDocRef, {
      pendingRequests: arrayUnion({ uid: user.uid, username: usernameInput.value || 'Unknown' })
    });
    sendFriendRequestBtn.disabled = true;
    addFriendPreview.textContent = 'Friend request sent!';
  } catch (err) {
    console.error(err);
    alert('Failed to send friend request');
  }
});

// INIT
onAuthStateChanged(auth, user => {
  if (!user) return;
  loadProfile();
});
