// PROFILE.JS - Direct Firebase connection, cache-busting included
document.addEventListener('DOMContentLoaded', async () => {
  // --- Firebase SDK v9+ imports ---
  const { initializeApp } = firebase;
  const { getAuth, onAuthStateChanged } = firebase.auth;
  const { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } = firebase.firestore;
  const { getStorage, ref, uploadBytes, getDownloadURL } = firebase.storage;

  // --- Firebase config ---
  const firebaseConfig = {
    apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
    authDomain: "yourspace-2026.firebaseapp.com",
    projectId: "yourspace-2026",
    storageBucket: "yourspace-2026.firebasestorage.app",
    messagingSenderId: "72667267302",
    appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
    measurementId: "G-FZ4GFXWGSS"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  // --- DOM elements ---
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
  const friendSearchInput = document.getElementById('friendSearchInput');
  const friendSearchPreview = document.getElementById('friendSearchPreview');
  const sendFriendRequestBtn = document.getElementById('sendFriendRequestBtn');
  const pendingRequestsContainer = document.getElementById('pendingRequestsContainer');

  let currentUserDoc = null;

  // --- Load current user profile ---
  async function loadProfile() {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) return;
    const data = docSnap.data();
    currentUserDoc = data;

    // --- Profile info ---
    usernameInput.value = data.username || '';
    bioInput.value = data.bio || '';
    locationInput.value = data.location || '';
    profilePfp.src = data.pfpURL || 'default-profile.png';

    // --- Wall comments ---
    wallCommentsContainer.innerHTML = '';
    if (data.wallComments && data.wallComments.length > 0) {
      data.wallComments.forEach(comment => {
        const div = document.createElement('div');
        div.className = 'wall-comment';
        div.innerHTML = `<strong>${comment.username || 'Unknown'}</strong>: ${comment.text}`;
        if (comment.userId === user.uid) {
          const deleteBtn = document.createElement('button');
          deleteBtn.textContent = 'Delete';
          deleteBtn.addEventListener('click', async () => {
            await updateDoc(userDocRef, { wallComments: arrayRemove(comment) });
            loadProfile();
          });
          div.appendChild(deleteBtn);
        }
        wallCommentsContainer.appendChild(div);
      });
    }

    // --- Top 10 friends ---
    top10FriendsContainer.innerHTML = '';
    if (data.top10Friends && data.top10Friends.length > 0) {
      data.top10Friends.forEach(friend => {
        const div = document.createElement('div');
        div.className = 'top-friend';
        div.textContent = `${friend.rank || 'N/A'}: ${friend.username || 'Unknown'}`;
        top10FriendsContainer.appendChild(div);
      });
    }

    // --- All friends ---
    allFriendsContainer.innerHTML = '';
    if (data.friends && data.friends.length > 0) {
      data.friends.forEach(friend => {
        const div = document.createElement('div');
        div.className = 'friend';
        div.textContent = friend.username || 'Unknown';
        allFriendsContainer.appendChild(div);
      });
    }

    // --- Pending friend requests ---
    pendingRequestsContainer.innerHTML = '';
    if (data.pendingRequests && data.pendingRequests.length > 0) {
      data.pendingRequests.forEach(req => {
        const div = document.createElement('div');
        div.className = 'pending-request';
        div.textContent = req.username || 'Unknown';
        const acceptBtn = document.createElement('button');
        acceptBtn.textContent = 'Accept';
        acceptBtn.addEventListener('click', async () => {
          await handleFriendRequest(req.userId, true);
        });
        const denyBtn = document.createElement('button');
        denyBtn.textContent = 'Deny';
        denyBtn.addEventListener('click', async () => {
          await handleFriendRequest(req.userId, false);
        });
        div.appendChild(acceptBtn);
        div.appendChild(denyBtn);
        pendingRequestsContainer.appendChild(div);
      });
    }
  }

  // --- Save profile info ---
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

  // --- Save profile picture ---
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
      loadProfile();
    } catch (err) {
      console.error(err);
      alert('Failed to save profile picture');
    }
  });

  // --- Add wall comment ---
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

  // --- Search users for friend request ---
  friendSearchInput.addEventListener('input', async () => {
    const searchVal = friendSearchInput.value.trim();
    friendSearchPreview.innerHTML = '';
    if (!searchVal) return;

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', searchVal));
    const results = await getDocs(q);

    if (!results.empty) {
      const docSnap = results.docs[0];
      const data = docSnap.data();
      const div = document.createElement('div');
      div.textContent = data.username;
      friendSearchPreview.appendChild(div);

      sendFriendRequestBtn.onclick = async () => {
        try {
          const targetUserRef = doc(db, 'users', docSnap.id);
          await updateDoc(targetUserRef, {
            pendingRequests: arrayUnion({ userId: auth.currentUser.uid, username: usernameInput.value })
          });
          alert('Friend request sent!');
          friendSearchPreview.innerHTML = '';
          friendSearchInput.value = '';
        } catch (err) {
          console.error(err);
          alert('Failed to send friend request');
        }
      };
    }
  });

  // --- Handle friend request acceptance/denial ---
  async function handleFriendRequest(requesterId, accepted) {
    const user = auth.currentUser;
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const requesterDocRef = doc(db, 'users', requesterId);

    try {
      // Remove pending request
      await updateDoc(userDocRef, { pendingRequests: arrayRemove({ userId: requesterId, username: 'Unknown' }) });

      if (accepted) {
        // Add each other to friends array
        await updateDoc(userDocRef, { friends: arrayUnion({ userId: requesterId, username: 'Unknown' }) });
        await updateDoc(requesterDocRef, { friends: arrayUnion({ userId: user.uid, username: usernameInput.value }) });
      }
      loadProfile();
    } catch (err) {
      console.error(err);
      alert('Failed to process friend request');
    }
  }

  // --- Init ---
  onAuthStateChanged(auth, user => {
    if (!user) return;
    loadProfile();
  });
});
