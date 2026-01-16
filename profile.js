// PROFILE.JS
import { auth, db, storage } from './firebase.js';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, query, collection, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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

// Get profile username from URL or use current user
function getProfileUid() {
  const params = new URLSearchParams(window.location.search);
  const userQuery = params.get('user');
  return userQuery ? userQuery : auth.currentUser?.uid;
}

// Load profile
async function loadProfile() {
  const profileUid = getProfileUid();
  if (!profileUid) return;

  const userDocRef = doc(db, 'users', profileUid);
  const docSnap = await getDoc(userDocRef);
  if (!docSnap.exists()) return;

  const data = docSnap.data();

  // Fill inputs only if viewing own profile
  if (profileUid === auth.currentUser.uid) {
    usernameInput.value = data.username || '';
    bioInput.value = data.bio || '';
    locationInput.value = data.location || '';
  }

  if (data.pfpURL) profilePfp.src = data.pfpURL;

  // Load wall comments
  wallCommentsContainer.innerHTML = '';
  if (data.wallComments?.length) {
    data.wallComments.forEach(comment => {
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.innerHTML = `
        <strong>${comment.username || 'Unknown'}</strong>: ${comment.text}
        ${comment.userId === auth.currentUser.uid ? '<button class="deleteWallCommentBtn">Delete</button>' : ''}
      `;
      if (comment.userId === auth.currentUser.uid) {
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
  data.top10Friends?.forEach(friend => {
    const div = document.createElement('div');
    div.className = 'friend';
    div.innerHTML = `<span class="friend-username" data-uid="${friend.uid}">${friend.username}</span>`;
    div.addEventListener('click', () => {
      window.location.href = `/profile.html?user=${friend.uid}`;
    });
    top10FriendsContainer.appendChild(div);
  });
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

    profilePfp.src = url;

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

  const userDocRef = doc(db, 'users', getProfileUid());
  try {
    await updateDoc(userDocRef, { wallComments: arrayUnion(comment) });
    wallCommentInput.value = '';
    loadProfile();
  } catch (err) {
    console.error(err);
    alert('Failed to post comment');
  }
});

// SEARCH FRIENDS
addFriendInput.addEventListener('input', async () => {
  const text = addFriendInput.value.trim();
  addFriendPreview.innerHTML = '';
  if (!text) return;

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '>=', text), where('username', '<=', text + '\uf8ff'));
  const snapshot = await getDocs(q);

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement('div');
    div.className = 'friend-preview';
    div.innerHTML = `
      <span>${data.username}</span>
      <button class="addFriendBtn" data-uid="${docSnap.id}">Add Friend</button>
    `;
    div.querySelector('.addFriendBtn').addEventListener('click', async () => {
      const currentUserRef = doc(db, 'users', auth.currentUser.uid);
      try {
        await updateDoc(currentUserRef, { top10Friends: arrayUnion({ uid: docSnap.id, username: data.username }) });
        alert('Friend added to top 10!');
        loadProfile();
      } catch (err) {
        console.error(err);
        alert('Failed to add friend');
      }
    });
    addFriendPreview.appendChild(div);
  });
});

// INIT
auth.onAuthStateChanged(user => {
  if (!user) return;
  loadProfile();
});
