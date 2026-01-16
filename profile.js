// PROFILE.JS - Direct Firebase connection, cache-busting included
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

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
const pendingRequestsContainer = document.getElementById('pendingRequestsContainer');

const addFriendInput = document.getElementById('addFriendInput');
const addFriendPreview = document.getElementById('addFriendPreview');

let currentUserId;

// LOAD PROFILE
async function loadProfile() {
  if (!currentUserId) return;
  const userDocRef = doc(db, 'users', currentUserId);
  const docSnap = await getDoc(userDocRef);
  if (!docSnap.exists()) return;

  const data = docSnap.data();
  usernameInput.value = data.username || '';
  bioInput.value = data.bio || '';
  locationInput.value = data.location || '';
  if (data.pfpURL) profilePfp.src = data.pfpURL;

  // Wall Comments
  wallCommentsContainer.innerHTML = '';
  if (data.wallComments && data.wallComments.length > 0) {
    data.wallComments.forEach(comment => {
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.innerHTML = `<strong>${comment.username || 'Unknown'}</strong>: ${comment.text}
                       ${comment.userId === currentUserId ? '<button class="deleteWallCommentBtn">Delete</button>' : ''}`;
      if (comment.userId === currentUserId) {
        div.querySelector('.deleteWallCommentBtn').addEventListener('click', async () => {
          await updateDoc(userDocRef, { wallComments: arrayRemove(comment) });
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
      div.className = 'top-friend';
      div.textContent = f.username;
      top10FriendsContainer.appendChild(div);
    });
  }

  // All Friends
  allFriendsContainer.innerHTML = '';
  if (data.friends && data.friends.length > 0) {
    data.friends.forEach(f => {
      const div = document.createElement('div');
      div.className = 'friend';
      div.textContent = f.username;
      allFriendsContainer.appendChild(div);
    });
  }

  // Pending Friend Requests
  pendingRequestsContainer.innerHTML = '';
  if (data.pendingRequests && data.pendingRequests.length > 0) {
    data.pendingRequests.forEach(req => {
      const div = document.createElement('div');
      div.className = 'pending-request';
      div.innerHTML = `${req.username} 
        <button class="acceptBtn">Accept</button>
        <button class="denyBtn">Deny</button>`;
      div.querySelector('.acceptBtn').addEventListener('click', async () => {
        await updateDoc(userDocRef, {
          friends: arrayUnion(req),
          pendingRequests: arrayRemove(req)
        });
        loadProfile();
      });
      div.querySelector('.denyBtn').addEventListener('click', async () => {
        await updateDoc(userDocRef, { pendingRequests: arrayRemove(req) });
        loadProfile();
      });
      pendingRequestsContainer.appendChild(div);
    });
  }
}

// SAVE PROFILE INFO
saveProfileBtn.addEventListener('click', async () => {
  const userDocRef = doc(db, 'users', currentUserId);
  await updateDoc(userDocRef, {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  loadProfile();
});

// SAVE PROFILE PICTURE
saveProfilePfpBtn.addEventListener('click', async () => {
  const file = profilePfpInput.files[0];
  if (!file) return alert("Please select a picture");
  const storageRef = ref(storage, `profileImages/${currentUserId}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db, 'users', currentUserId), { pfpURL: url });
  profilePfp.src = url;
});

// ADD WALL COMMENT
addWallCommentBtn.addEventListener('click', async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;
  const comment = { text, username: usernameInput.value || 'Unknown', userId: currentUserId, timestamp: Date.now() };
  await updateDoc(doc(db, 'users', currentUserId), { wallComments: arrayUnion(comment) });
  wallCommentInput.value = '';
  loadProfile();
});

// SEARCH & ADD FRIEND
addFriendInput.addEventListener('input', async () => {
  const query = addFriendInput.value.trim();
  if (!query) return addFriendPreview.innerHTML = '';
  // Simple search by username
  const usersRef = doc(db, 'users', query); // Adjust this if you want query search
  const docSnap = await getDoc(usersRef);
  if (!docSnap.exists()) return addFriendPreview.innerHTML = 'User not found';
  const data = docSnap.data();
  addFriendPreview.innerHTML = `<div>${data.username}<button id="addFriendBtn">Add Friend</button></div>`;
  document.getElementById('addFriendBtn').addEventListener('click', async () => {
    await updateDoc(usersRef, { pendingRequests: arrayUnion({ username: usernameInput.value, userId: currentUserId }) });
    addFriendPreview.innerHTML = 'Friend request sent!';
  });
});

// INIT
onAuthStateChanged(auth, user => {
  if (!user) return;
  currentUserId = user.uid;
  loadProfile();
});
