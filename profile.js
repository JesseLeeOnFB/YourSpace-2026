// PROFILE.JS
import { auth, db, storage } from './firebase.js';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
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
  if (data.pfpURL) profilePfp.src = data.pfpURL;

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
          await updateDoc(userDocRef, {
            wallComments: arrayRemove(comment)
          });
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
      div.innerHTML = `<span>${friend.username}</span>`;
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

  const userDocRef = doc(db, 'users', user.uid);
  try {
    await updateDoc(userDocRef, {
      wallComments: arrayUnion(comment)
    });
    wallCommentInput.value = '';
    loadProfile();
  } catch (err) {
    console.error(err);
    alert('Failed to post comment');
  }
});

// INIT
auth.onAuthStateChanged(user => {
  if (!user) return;
  loadProfile();
});
