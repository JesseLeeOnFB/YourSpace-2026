// DIRECT FIREBASE CONNECTION + CACHE BUSTING
document.addEventListener('DOMContentLoaded', async () => {

  const firebaseConfig = {
    apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
    authDomain: "yourspace-2026.firebaseapp.com",
    projectId: "yourspace-2026",
    storageBucket: "yourspace-2026.firebasestorage.app",
    messagingSenderId: "72667267302",
    appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
    measurementId: "G-FZ4GFXWGSS"
  };

  firebase.initializeApp(firebaseConfig);
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

  // Friend elements
  const addFriendInput = document.getElementById('addFriendInput');
  const addFriendPreview = document.getElementById('addFriendPreview');
  const sendFriendRequestBtn = document.getElementById('sendFriendRequestBtn');
  const pendingRequestsList = document.getElementById('pendingRequestsList');
  const allFriendsList = document.getElementById('allFriendsList');

  // Load user profile
  async function loadProfile() {
    const user = auth.currentUser;
    if (!user) return;

    const userDoc = await db.collection('users').doc(user.uid).get();
    const data = userDoc.data();
    if (!data) return;

    usernameInput.value = data.username || '';
    bioInput.value = data.bio || '';
    locationInput.value = data.location || '';
    profilePfp.src = data.pfpURL || '';

    // Wall comments
    wallCommentsContainer.innerHTML = '';
    if (data.wallComments && data.wallComments.length > 0) {
      data.wallComments.forEach(comment => {
        const div = document.createElement('div');
        div.className = 'wall-comment';
        div.innerHTML = `<strong>${comment.username || 'Unknown'}</strong>: ${comment.text} 
          ${comment.userId === user.uid ? '<button class="deleteWallCommentBtn">Delete</button>' : ''}`;
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
    if (data.top10Friends && data.top10Friends.length > 0) {
      data.top10Friends.forEach(f => {
        const div = document.createElement('div');
        div.textContent = f.username;
        top10FriendsContainer.appendChild(div);
      });
    }
  }

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

  // FRIEND REQUEST SYSTEM
  addFriendInput.addEventListener('input', async () => {
    const searchValue = addFriendInput.value.trim();
    addFriendPreview.innerHTML = '';
    sendFriendRequestBtn.disabled = true;
    if (!searchValue) return;

    try {
      const usersSnap = await db.collection('users').where('username', '==', searchValue).get();
      if (usersSnap.empty) return addFriendPreview.textContent = 'No user found';

      usersSnap.forEach(docSnap => {
        const userData = docSnap.data();
        const div = document.createElement('div');
        div.textContent = userData.username;
        div.className = 'friend-preview';
        div.addEventListener('click', () => {
          addFriendPreview.innerHTML = `<strong>${userData.username}</strong>`;
          sendFriendRequestBtn.disabled = false;
          sendFriendRequestBtn.dataset.uid = docSnap.id;
        });
        addFriendPreview.appendChild(div);
      });
    } catch (err) {
      console.error(err);
    }
  });

  sendFriendRequestBtn.addEventListener('click', async () => {
    const recipientUid = sendFriendRequestBtn.dataset.uid;
    const user = auth.currentUser;
    if (!user || !recipientUid) return;

    try {
      await db.collection('users').doc(recipientUid).update({
        pendingRequests: firebase.firestore.FieldValue.arrayUnion(user.uid)
      });
      alert('Friend request sent!');
      addFriendInput.value = '';
      addFriendPreview.innerHTML = '';
      sendFriendRequestBtn.disabled = true;
      loadPendingRequests();
    } catch (err) {
      console.error(err);
      alert('Failed to send friend request');
    }
  });

  async function loadPendingRequests() {
    const user = auth.currentUser;
    if (!user) return;
    const data = (await db.collection('users').doc(user.uid).get()).data();
    pendingRequestsList.innerHTML = '';

    if (data.pendingRequests && data.pendingRequests.length > 0) {
      for (const requesterUid of data.pendingRequests) {
        const requesterData = (await db.collection('users').doc(requesterUid).get()).data();
        const div = document.createElement('div');
        div.textContent = requesterData.username;
        const acceptBtn = document.createElement('button');
        acceptBtn.textContent = 'Accept';
        acceptBtn.addEventListener('click', async () => acceptFriendRequest(requesterUid));
        const denyBtn = document.createElement('button');
        denyBtn.textContent = 'Deny';
        denyBtn.addEventListener('click', async () => denyFriendRequest(requesterUid));
        div.appendChild(acceptBtn);
        div.appendChild(denyBtn);
        pendingRequestsList.appendChild(div);
      }
    }
  }

  async function acceptFriendRequest(uid) {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await db.collection('users').doc(user.uid).update({
        allFriends: firebase.firestore.FieldValue.arrayUnion(uid),
        pendingRequests: firebase.firestore.FieldValue.arrayRemove(uid)
      });
      await db.collection('users').doc(uid).update({
        allFriends: firebase.firestore.FieldValue.arrayUnion(user.uid)
      });
      loadPendingRequests();
      loadAllFriends();
    } catch (err) { console.error(err); }
  }

  async function denyFriendRequest(uid) {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await db.collection('users').doc(user.uid).update({
        pendingRequests: firebase.firestore.FieldValue.arrayRemove(uid)
      });
      loadPendingRequests();
    } catch (err) { console.error(err); }
  }

  async function loadAllFriends() {
    const user = auth.currentUser;
    if (!user) return;

    const data = (await db.collection('users').doc(user.uid).get()).data();
    allFriendsList.innerHTML = '';

    if (data.allFriends && data.allFriends.length > 0) {
      for (const friendUid of data.allFriends) {
        const friendData = (await db.collection('users').doc(friendUid).get()).data();
        const div = document.createElement('div');
        div.textContent = friendData.username;
        allFriendsList.appendChild(div);
      }
    }
  }

  auth.onAuthStateChanged(user => {
    if (user) {
      loadProfile();
      loadPendingRequests();
      loadAllFriends();
    }
  });

});
