// ----- FIREBASE CONFIG & INIT -----
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

// Firebase SDK scripts must be included in HTML:
// <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-storage-compat.js"></script>

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ----- DOM ELEMENTS -----
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

const searchUserInput = document.getElementById('searchUserInput');
const searchPreviewContainer = document.getElementById('searchPreviewContainer');

const pendingRequestsContainer = document.getElementById('pendingRequestsContainer');
const allFriendsContainer = document.getElementById('allFriendsContainer');
const top10FriendsContainer = document.getElementById('top10FriendsContainer');

let currentUserData = null;

// ----- LOAD PROFILE -----
async function loadProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = db.collection('users').doc(user.uid);
  const docSnap = await userDocRef.get();
  if (!docSnap.exists) return;

  currentUserData = docSnap.data();

  // Profile info
  usernameInput.value = currentUserData.username || '';
  bioInput.value = currentUserData.bio || '';
  locationInput.value = currentUserData.location || '';
  if (currentUserData.pfpURL) profilePfp.src = currentUserData.pfpURL;

  // Wall comments
  wallCommentsContainer.innerHTML = '';
  if (currentUserData.wallComments) {
    currentUserData.wallComments.forEach(comment => {
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.innerHTML = `
        <strong>${comment.username || 'Unknown'}</strong>: ${comment.text}
        ${comment.userId === user.uid ? '<button class="deleteWallCommentBtn">Delete</button>' : ''}
      `;
      if (comment.userId === user.uid) {
        div.querySelector('.deleteWallCommentBtn').addEventListener('click', async () => {
          await userDocRef.update({
            wallComments: firebase.firestore.FieldValue.arrayRemove(comment)
          });
          loadProfile();
        });
      }
      wallCommentsContainer.appendChild(div);
    });
  }

  // Pending requests
  pendingRequestsContainer.innerHTML = '';
  if (currentUserData.pendingRequests) {
    currentUserData.pendingRequests.forEach(req => {
      const div = document.createElement('div');
      div.className = 'pending-request';
      div.innerHTML = `
        ${req.fromUsername}
        <button class="acceptBtn">Accept</button>
        <button class="denyBtn">Deny</button>
      `;
      div.querySelector('.acceptBtn').addEventListener('click', async () => {
        await acceptFriendRequest(req.fromUserId, req.fromUsername);
      });
      div.querySelector('.denyBtn').addEventListener('click', async () => {
        await denyFriendRequest(req.fromUserId);
      });
      pendingRequestsContainer.appendChild(div);
    });
  }

  // All friends
  allFriendsContainer.innerHTML = '';
  if (currentUserData.friends) {
    currentUserData.friends.forEach(f => {
      const div = document.createElement('div');
      div.className = 'friend-item';
      div.textContent = f.username;
      allFriendsContainer.appendChild(div);
    });
  }

  // Top 10 friends
  top10FriendsContainer.innerHTML = '';
  if (currentUserData.top10Friends) {
    currentUserData.top10Friends.forEach(f => {
      const div = document.createElement('div');
      div.className = 'top-friend';
      div.textContent = `${f.rank}. ${f.username}`;
      top10FriendsContainer.appendChild(div);
    });
  }
}

// ----- SAVE PROFILE INFO -----
saveProfileBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = db.collection('users').doc(user.uid);
  try {
    await userDocRef.update({
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

// ----- SAVE PROFILE PICTURE -----
saveProfilePfpBtn.addEventListener('click', async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert('Select a picture first');

  const user = auth.currentUser;
  const storageRef = storage.ref(`profileImages/${user.uid}/${Date.now()}_${file.name}`);
  await storageRef.put(file);
  const url = await storageRef.getDownloadURL();

  await db.collection('users').doc(user.uid).update({ pfpURL: url });
  profilePfp.src = url;
  alert('Profile picture updated!');
});

// ----- ADD WALL COMMENT -----
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

  await db.collection('users').doc(user.uid).update({
    wallComments: firebase.firestore.FieldValue.arrayUnion(comment)
  });
  wallCommentInput.value = '';
  loadProfile();
});

// ----- USER SEARCH -----
searchUserInput.addEventListener('input', async () => {
  const val = searchUserInput.value.trim();
  searchPreviewContainer.innerHTML = '';
  if (!val) return;

  const usersRef = db.collection('users');
  const q = usersRef.where('username', '==', val);
  const querySnap = await q.get();

  querySnap.forEach(uSnap => {
    const u = uSnap.data();
    const div = document.createElement('div');
    div.className = 'friend-preview';
    div.innerHTML = `${u.username} <button>Add Friend</button>`;
    div.querySelector('button').addEventListener('click', async () => {
      await sendFriendRequest(uSnap.id, u.username);
    });
    searchPreviewContainer.appendChild(div);
  });
});

// ----- FRIEND REQUEST FUNCTIONS -----
async function sendFriendRequest(toUserId, toUsername) {
  const user = auth.currentUser;
  if (!user) return;
  const req = { fromUserId: user.uid, fromUsername: usernameInput.value, timestamp: Date.now() };
  await db.collection('users').doc(toUserId).update({
    pendingRequests: firebase.firestore.FieldValue.arrayUnion(req)
  });
  alert(`Friend request sent to ${toUsername}`);
}

async function acceptFriendRequest(fromUserId, fromUsername) {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = db.collection('users').doc(user.uid);
  const fromUserDocRef = db.collection('users').doc(fromUserId);

  await userDocRef.update({
    friends: firebase.firestore.FieldValue.arrayUnion({ userId: fromUserId, username: fromUsername }),
    pendingRequests: firebase.firestore.FieldValue.arrayRemove({ fromUserId, fromUsername, timestamp: 0 })
  });

  await fromUserDocRef.update({
    friends: firebase.firestore.FieldValue.arrayUnion({ userId: user.uid, username: usernameInput.value })
  });

  loadProfile();
}

async function denyFriendRequest(fromUserId) {
  const user = auth.currentUser;
  if (!user) return;
  await db.collection('users').doc(user.uid).update({
    pendingRequests: firebase.firestore.FieldValue.arrayRemove({ fromUserId, fromUsername: '', timestamp: 0 })
  });
  loadProfile();
}

// ----- INIT -----
auth.onAuthStateChanged(user => {
  if (user) loadProfile();
});
