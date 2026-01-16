// PROFILE.JS - Direct Firebase connection, cache-busting included
document.addEventListener('DOMContentLoaded', async () => {

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
  const app = firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  const storage = firebase.storage();

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
  const pendingFriendsContainer = document.getElementById('pendingFriendsContainer');

  // Cache-busting helper
  function cacheBustedURL(url) {
    return url + '?v=' + Date.now();
  }

  // Load user profile
  async function loadProfile() {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (!userDoc.exists) return;

      const data = userDoc.data();

      usernameInput.value = data.username || '';
      bioInput.value = data.bio || '';
      locationInput.value = data.location || '';
      if (data.pfpURL) profilePfp.src = cacheBustedURL(data.pfpURL);

      // Load wall comments
      wallCommentsContainer.innerHTML = '';
      if (data.wallComments && data.wallComments.length) {
        data.wallComments.forEach(comment => {
          const div = document.createElement('div');
          div.className = 'wall-comment';
          div.innerHTML = `
            <strong>${comment.username || 'Unknown'}</strong>: ${comment.text}
            ${comment.userId === user.uid ? '<button class="deleteWallCommentBtn">Delete</button>' : ''}
          `;
          if (comment.userId === user.uid) {
            div.querySelector('.deleteWallCommentBtn').addEventListener('click', async () => {
              await db.collection('users').doc(user.uid).update({
                wallComments: firebase.firestore.FieldValue.arrayRemove(comment)
              });
              loadProfile();
            });
          }
          wallCommentsContainer.appendChild(div);
        });
      }

      // Top 10 Friends
      top10FriendsContainer.innerHTML = '';
      if (data.top10Friends && data.top10Friends.length) {
        data.top10Friends.forEach(friend => {
          const div = document.createElement('div');
          div.className = 'top-friend';
          div.textContent = friend.username || 'Unknown';
          top10FriendsContainer.appendChild(div);
        });
      }

      // Pending Friend Requests
      pendingFriendsContainer.innerHTML = '';
      if (data.pendingRequests && data.pendingRequests.length) {
        data.pendingRequests.forEach(req => {
          const div = document.createElement('div');
          div.className = 'pending-friend';
          div.textContent = req.username || 'Unknown';
          const acceptBtn = document.createElement('button');
          acceptBtn.textContent = 'Accept';
          const denyBtn = document.createElement('button');
          denyBtn.textContent = 'Deny';
          acceptBtn.addEventListener('click', async () => {
            // Move to friends
            await db.collection('users').doc(user.uid).update({
              friends: firebase.firestore.FieldValue.arrayUnion(req),
              pendingRequests: firebase.firestore.FieldValue.arrayRemove(req)
            });
            // Add user to sender's friends
            await db.collection('users').doc(req.userId).update({
              friends: firebase.firestore.FieldValue.arrayUnion({ username: data.username, userId: user.uid })
            });
            loadProfile();
          });
          denyBtn.addEventListener('click', async () => {
            await db.collection('users').doc(user.uid).update({
              pendingRequests: firebase.firestore.FieldValue.arrayRemove(req)
            });
            loadProfile();
          });
          div.appendChild(acceptBtn);
          div.appendChild(denyBtn);
          pendingFriendsContainer.appendChild(div);
        });
      }

    } catch (err) {
      console.error(err);
      alert('Failed to load profile');
    }
  }

  // Save profile info
  saveProfileBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await db.collection('users').doc(user.uid).update({
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

  // Save profile picture
  saveProfilePfpBtn.addEventListener('click', async () => {
    const file = profilePfpInput.files[0];
    if (!file) return alert('Please select a picture first');

    try {
      const user = auth.currentUser;
      const storageRef = storage.ref(`profileImages/${user.uid}/${Date.now()}_${file.name}`);
      await storageRef.put(file);
      const url = await storageRef.getDownloadURL();

      profilePfp.src = cacheBustedURL(url);

      await db.collection('users').doc(user.uid).update({ pfpURL: url });
      alert('Profile picture updated!');
    } catch (err) {
      console.error(err);
      alert('Failed to update profile picture');
    }
  });

  // Add wall comment
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

    try {
      await db.collection('users').doc(user.uid).update({
        wallComments: firebase.firestore.FieldValue.arrayUnion(comment)
      });
      wallCommentInput.value = '';
      loadProfile();
    } catch (err) {
      console.error(err);
      alert('Failed to post comment');
    }
  });

  // Auth state
  auth.onAuthStateChanged(user => {
    if (user) loadProfile();
  });

});
