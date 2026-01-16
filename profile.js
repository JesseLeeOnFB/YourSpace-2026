// PROFILE.JS - Direct Firebase connection, DOMContentLoaded wrapper
document.addEventListener('DOMContentLoaded', async () => {
  // --- FIREBASE CONFIG ---
  const firebaseConfig = {
    apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
    authDomain: "yourspace-2026.firebaseapp.com",
    projectId: "yourspace-2026",
    storageBucket: "yourspace-2026.firebasestorage.app",
    messagingSenderId: "72667267302",
    appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
    measurementId: "G-FZ4GFXWGSS"
  };

  const app = firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  const storage = firebase.storage();

  // --- DOM ELEMENTS ---
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
  const searchUserInput = document.getElementById('searchUserInput');
  const searchUserBtn = document.getElementById('searchUserBtn');
  const searchResultContainer = document.getElementById('searchResultContainer');

  // --- FUNCTIONS ---
  async function loadProfile() {
    const user = auth.currentUser;
    if (!user) return;

    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) return;

    const data = userDoc.data();
    usernameInput.value = data.username || '';
    bioInput.value = data.bio || '';
    locationInput.value = data.location || '';
    if (data.pfpURL) profilePfp.src = data.pfpURL;

    // WALL COMMENTS
    wallCommentsContainer.innerHTML = '';
    if (data.wallComments && data.wallComments.length) {
      data.wallComments.forEach(comment => {
        const div = document.createElement('div');
        div.className = 'wall-comment';
        div.innerHTML = `<strong>${comment.username || 'Unknown'}</strong>: ${comment.text}
                         ${comment.userId === user.uid ? '<button class="deleteWallCommentBtn">Delete</button>' : ''}`;
        if (comment.userId === user.uid) {
          div.querySelector('.deleteWallCommentBtn').addEventListener('click', async () => {
            await db.collection('users').doc(user.uid)
              .update({ wallComments: firebase.firestore.FieldValue.arrayRemove(comment) });
            loadProfile();
          });
        }
        wallCommentsContainer.appendChild(div);
      });
    }

    // TOP 10 FRIENDS
    top10FriendsContainer.innerHTML = '';
    if (data.top10Friends && data.top10Friends.length) {
      data.top10Friends.forEach(friend => {
        const div = document.createElement('div');
        div.className = 'top-friend';
        div.textContent = friend.username || 'Unknown';
        top10FriendsContainer.appendChild(div);
      });
    }
  }

  // --- EVENT LISTENERS ---

  // SAVE PROFILE INFO
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
      const storageRef = storage.ref(`profileImages/${user.uid}/${Date.now()}_${file.name}`);
      await storageRef.put(file);
      const url = await storageRef.getDownloadURL();

      profilePfp.src = url;
      await db.collection('users').doc(user.uid).update({ pfpURL: url });
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
      username: usernameInput.value || 'Unknown',
      userId: user.uid,
      timestamp: Date.now()
    };

    try {
      await db.collection('users').doc(user.uid)
        .update({ wallComments: firebase.firestore.FieldValue.arrayUnion(comment) });
      wallCommentInput.value = '';
      loadProfile();
    } catch (err) {
      console.error(err);
      alert('Failed to post comment');
    }
  });

  // SEARCH USER FOR FRIEND REQUEST (placeholder)
  searchUserBtn.addEventListener('click', async () => {
    const username = searchUserInput.value.trim();
    if (!username) return alert('Enter a username to search');

    const snapshot = await db.collection('users').where('username', '==', username).get();
    searchResultContainer.innerHTML = '';

    if (snapshot.empty) {
      searchResultContainer.textContent = 'No user found';
      return;
    }

    snapshot.forEach(docSnap => {
      const userData = docSnap.data();
      const div = document.createElement('div');
      div.className = 'user-preview';
      div.innerHTML = `<strong>${userData.username}</strong> <button class="addFriendBtn">Add Friend</button>`;
      div.querySelector('.addFriendBtn').addEventListener('click', async () => {
        alert('Friend request placeholder (will implement acceptance flow next)');
      });
      searchResultContainer.appendChild(div);
    });
  });

  // --- INIT ---
  auth.onAuthStateChanged(user => {
    if (user) loadProfile();
  });

});
